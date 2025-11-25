import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Price ID to Plan mapping - MUST match your Stripe Dashboard
const PRICE_ID_TO_PLAN: Record<string, string> = {
  'price_1SWmMTRtOhWJgeVeCxB9RCxm': 'starteris',
  'price_1SWmMtRtOhWJgeVeiKK0m0YL': 'pro',
  'price_1SWmNCRtOhWJgeVekHZDvwzP': 'bizness',
};

// Plan to Credits mapping
const PLAN_CREDITS: Record<string, number> = {
  'free': 0,
  'starteris': 200,
  'pro': 1000,
  'bizness': 5000,
};

// REMOVED: Staff member limit enforcement
// Plan limits are enforced by UI visibility and backend filtering only.
// Staff members are NEVER deactivated or deleted when plans change.
// All staff data is preserved; UI shows only allowed quantity per plan.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No stripe-signature header found');
      return new Response('No signature', { status: 400, headers: corsHeaders });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500, headers: corsHeaders });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return new Response(`Webhook Error: ${errorMessage}`, { status: 400, headers: corsHeaders });
    }

    console.log('Processing event:', event.type);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle checkout.session.completed (initial subscription or one-time payment)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Check if this is for email credits or subscription
      if (session.mode === 'payment') {
        // One-time email credit purchase
        const masterId = session.metadata?.masterId;
        const packageId = session.metadata?.packageId;
        
        if (masterId && packageId) {
          console.log('Processing email credits purchase for master:', masterId);
          
          const { data: packageData, error: packageError } = await supabase
            .from('email_packages')
            .select('credits')
            .eq('id', packageId)
            .single();

          if (!packageError && packageData) {
            const { data: existingCredits } = await supabase
              .from('email_credits')
              .select('credits')
              .eq('master_id', masterId)
              .maybeSingle();

            await supabase
              .from('email_credits')
              .upsert({
                master_id: masterId,
                credits: (existingCredits?.credits || 0) + packageData.credits,
                updated_at: new Date().toISOString()
              });

            console.log(`Added ${packageData.credits} credits to master ${masterId}`);
          }
        }
      } else if (session.mode === 'subscription') {
        // Subscription purchase
        const professionalId = session.metadata?.professionalId;
        if (!professionalId) {
          console.error('Missing professionalId in session metadata');
          return new Response(JSON.stringify({ error: 'Missing professionalId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const plan = PRICE_ID_TO_PLAN[priceId] || 'free';
        const credits = PLAN_CREDITS[plan] || 0;

        console.log(`Activating ${plan} plan for professional ${professionalId} (price: ${priceId})`);

        // Update professional profile
        await supabase
          .from('professional_profiles')
          .update({
            plan: plan,
            subscription_status: 'active',
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            subscription_last_changed: new Date().toISOString(),
          })
          .eq('id', professionalId);

        // Set email credits for new subscription
        await supabase
          .from('email_credits')
          .upsert({
            master_id: professionalId,
            credits: credits,
            updated_at: new Date().toISOString()
          });

        // Create subscription history record
        await supabase
          .from('subscription_history')
          .insert({
            professional_id: professionalId,
            plan: plan,
            status: 'active',
            stripe_subscription_id: subscriptionId,
            started_at: new Date().toISOString(),
          });

        console.log(`Successfully activated ${plan} plan with ${credits} credits`);
      }
    }

    // Handle subscription.updated (plan changes, status changes)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0].price.id;
      const plan = PRICE_ID_TO_PLAN[priceId] || 'free';
      const credits = PLAN_CREDITS[plan] || 0;

      console.log(`Subscription updated to ${plan} plan (price: ${priceId})`);

      const { data: professional } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (professional) {
        await supabase
          .from('professional_profiles')
          .update({
            plan: plan,
            subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            subscription_last_changed: new Date().toISOString(),
          })
          .eq('id', professional.id);

        // Replace email credits with new plan allocation
        await supabase
          .from('email_credits')
          .upsert({
            master_id: professional.id,
            credits: credits,
            updated_at: new Date().toISOString()
          });

        // Plan limits enforced by UI only - no staff deactivation on plan change

        // Close old subscription history and create new one
        await supabase
          .from('subscription_history')
          .update({ ended_at: new Date().toISOString() })
          .eq('professional_id', professional.id)
          .eq('stripe_subscription_id', subscription.id)
          .is('ended_at', null);

        await supabase
          .from('subscription_history')
          .insert({
            professional_id: professional.id,
            plan: plan,
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            started_at: new Date().toISOString(),
          });

        console.log(`Updated to ${plan} plan with ${credits} credits`);
      }
    }

    // Handle invoice.paid (subscription renewals)
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const priceId = subscription.items.data[0].price.id;
        const plan = PRICE_ID_TO_PLAN[priceId] || 'free';
        const credits = PLAN_CREDITS[plan] || 0;

        console.log(`Invoice paid for ${plan} plan - renewal`);

        const { data: professional } = await supabase
          .from('professional_profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (professional) {
          await supabase
            .from('professional_profiles')
            .update({
              subscription_status: 'active',
              subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', professional.id);

          // Add monthly credits on renewal
          const { data: currentCredits } = await supabase
            .from('email_credits')
            .select('credits')
            .eq('master_id', professional.id)
            .maybeSingle();

          await supabase
            .from('email_credits')
            .upsert({
              master_id: professional.id,
              credits: (currentCredits?.credits || 0) + credits,
              updated_at: new Date().toISOString()
            });

          console.log(`Renewal: Added ${credits} credits to professional ${professional.id}`);
        }
      }
    }

    // Handle subscription deletion/cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;

      console.log('Subscription cancelled:', subscription.id);

      const { data: professional } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (professional) {
        // Downgrade to FREE
        await supabase
          .from('professional_profiles')
          .update({
            plan: 'free',
            subscription_status: 'inactive',
            subscription_end_date: null,
            stripe_subscription_id: null,
            subscription_last_changed: new Date().toISOString(),
          })
          .eq('id', professional.id);

        // Reset email credits to 0
        await supabase
          .from('email_credits')
          .update({
            credits: 0,
            updated_at: new Date().toISOString()
          })
          .eq('master_id', professional.id);

        // Plan limits enforced by UI only - no staff deactivation on cancellation

        // Close subscription history
        await supabase
          .from('subscription_history')
          .update({ ended_at: new Date().toISOString() })
          .eq('professional_id', professional.id)
          .eq('stripe_subscription_id', subscription.id)
          .is('ended_at', null);

        console.log(`Downgraded professional ${professional.id} to FREE plan`);
      }
    }

    // Handle invoice.payment_failed
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

        const { data: professional } = await supabase
          .from('professional_profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (professional) {
          await supabase
            .from('professional_profiles')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', professional.id);

          console.log(`Payment failed for professional ${professional.id}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook handler error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
