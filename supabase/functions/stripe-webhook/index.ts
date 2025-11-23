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
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return new Response(`Webhook Error: ${errorMessage}`, { status: 400, headers: corsHeaders });
    }

    console.log('Processing event:', event.type);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle email credits purchase
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const masterId = session.metadata?.masterId;
      const packageId = session.metadata?.packageId;
      
      // If this is an email credits purchase
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
            .single();

          if (existingCredits) {
            await supabase
              .from('email_credits')
              .update({ 
                credits: existingCredits.credits + packageData.credits,
                updated_at: new Date().toISOString()
              })
              .eq('master_id', masterId);
          } else {
            await supabase
              .from('email_credits')
              .insert({
                master_id: masterId,
                credits: packageData.credits,
                updated_at: new Date().toISOString()
              });
          }
          console.log('Email credits updated successfully');
        }
      }
    }

    // Handle subscription events
    if (event.type === 'customer.subscription.created' || 
        event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log('Processing subscription event:', event.type, 'for customer:', customerId);

      // Find professional by stripe_customer_id
      const { data: professional, error: findError } = await supabase
        .from('professional_profiles')
        .select('id, plan, subscription_status')
        .eq('stripe_customer_id', customerId)
        .single();

      if (findError || !professional) {
        console.error('Professional not found for customer:', customerId);
        return new Response('Professional not found', { status: 404, headers: corsHeaders });
      }

      // Determine plan from price
      const priceId = subscription.items.data[0]?.price.id;
      let plan = 'free';
      if (priceId === Deno.env.get('STRIPE_PRICE_STARTER')) plan = 'starter';
      else if (priceId === Deno.env.get('STRIPE_PRICE_PRO')) plan = 'pro';
      else if (priceId === Deno.env.get('STRIPE_PRICE_PREMIUM')) plan = 'premium';

      const status = subscription.status === 'active' ? 'active' : 'inactive';
      const endDate = new Date(subscription.current_period_end * 1000);

      // Update professional profile
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({
          plan,
          subscription_status: status,
          stripe_subscription_id: subscription.id,
          subscription_end_date: endDate.toISOString(),
          subscription_last_changed: new Date().toISOString()
        })
        .eq('id', professional.id);

      if (updateError) {
        console.error('Error updating professional profile:', updateError);
        return new Response('Failed to update profile', { status: 500, headers: corsHeaders });
      }

      // Log subscription history
      await supabase
        .from('subscription_history')
        .insert({
          professional_id: professional.id,
          plan,
          status,
          stripe_subscription_id: subscription.id,
          started_at: new Date().toISOString()
        });

      console.log('Subscription updated successfully for professional:', professional.id);
    }

    // Handle subscription deletion/cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log('Processing subscription deletion for customer:', customerId);

      const { data: professional } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (professional) {
        await supabase
          .from('professional_profiles')
          .update({
            plan: 'free',
            subscription_status: 'inactive',
            stripe_subscription_id: null,
            subscription_end_date: null,
            subscription_last_changed: new Date().toISOString()
          })
          .eq('id', professional.id);

        // Close subscription history
        await supabase
          .from('subscription_history')
          .update({ ended_at: new Date().toISOString() })
          .eq('professional_id', professional.id)
          .eq('stripe_subscription_id', subscription.id)
          .is('ended_at', null);

        console.log('Subscription cancelled for professional:', professional.id);
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
