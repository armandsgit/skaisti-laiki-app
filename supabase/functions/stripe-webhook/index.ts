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

/**
 * Safely convert Stripe timestamp to ISO string
 * Returns null if timestamp is invalid or missing
 */
function safeTimestampToISO(timestamp: number | null | undefined): string | null {
  if (!timestamp || typeof timestamp !== 'number') {
    return null;
  }
  try {
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
}

/**
 * Find professional profile by subscription ID or customer ID
 */
async function findProfessional(supabase: any, subscriptionId: string, customerId: string) {
  // Try subscription_id first
  let { data } = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (data) return data;

  // Fallback to customer_id
  const result = await supabase
    .from('professional_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  return result.data;
}

/**
 * Downgrade professional to FREE plan
 * Preserves all data, only updates subscription fields
 */
async function downgradeProfessionalToFree(
  supabase: any,
  professionalId: string,
  subscriptionId?: string
) {
  console.log(`Downgrading professional ${professionalId} to FREE`);

  // Update professional profile to FREE
  await supabase
    .from('professional_profiles')
    .update({
      plan: 'free',
      subscription_status: 'expired',
      subscription_end_date: null,
      stripe_subscription_id: null,
      subscription_last_changed: new Date().toISOString(),
      is_cancelled: false, // Reset cancellation flag
    })
    .eq('id', professionalId);

  // Reset email credits to 0
  await supabase
    .from('email_credits')
    .update({
      credits: 0,
      updated_at: new Date().toISOString()
    })
    .eq('master_id', professionalId);

  // Close subscription history if subscriptionId provided
  if (subscriptionId) {
    await supabase
      .from('subscription_history')
      .update({ ended_at: new Date().toISOString() })
      .eq('professional_id', professionalId)
      .eq('stripe_subscription_id', subscriptionId)
      .is('ended_at', null);
  }

  console.log(`Professional ${professionalId} downgraded to FREE - all data preserved`);
}

/**
 * Update professional subscription plan
 */
async function updateProfessionalSubscription(
  supabase: any,
  professionalId: string,
  plan: string,
  subscriptionStatus: string,
  subscriptionEndDate: string | null,
  subscriptionId: string,
  replaceCredits: boolean = false
) {
  console.log(`Updating professional ${professionalId} to ${plan} plan (status: ${subscriptionStatus})`);

  // Update professional profile
  await supabase
    .from('professional_profiles')
    .update({
      plan: plan,
      subscription_status: subscriptionStatus,
      subscription_end_date: subscriptionEndDate,
      subscription_last_changed: new Date().toISOString(),
      is_cancelled: false, // Reset cancellation flag on active update
    })
    .eq('id', professionalId);

  // Handle email credits
  const credits = PLAN_CREDITS[plan] || 0;
  
  if (replaceCredits) {
    // Replace credits (upgrade/downgrade)
    await supabase
      .from('email_credits')
      .upsert({
        master_id: professionalId,
        credits: credits,
        updated_at: new Date().toISOString()
      });
    console.log(`Set ${credits} credits for professional ${professionalId}`);
  } else {
    // Add credits (renewal)
    const { data: currentCredits } = await supabase
      .from('email_credits')
      .select('credits')
      .eq('master_id', professionalId)
      .maybeSingle();

    await supabase
      .from('email_credits')
      .upsert({
        master_id: professionalId,
        credits: (currentCredits?.credits || 0) + credits,
        updated_at: new Date().toISOString()
      });
    console.log(`Added ${credits} credits to professional ${professionalId}`);
  }

  // Close old subscription history and create new one
  await supabase
    .from('subscription_history')
    .update({ ended_at: new Date().toISOString() })
    .eq('professional_id', professionalId)
    .eq('stripe_subscription_id', subscriptionId)
    .is('ended_at', null);

  await supabase
    .from('subscription_history')
    .insert({
      professional_id: professionalId,
      plan: plan,
      status: subscriptionStatus,
      stripe_subscription_id: subscriptionId,
      started_at: new Date().toISOString(),
    });

  console.log(`Successfully updated to ${plan} plan with ${credits} credits`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No stripe-signature header found');
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📨 Webhook received: ${event.type}`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ===== CHECKOUT SESSION COMPLETED =====
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // One-time email credit purchase
      if (session.mode === 'payment') {
        const masterId = session.metadata?.masterId;
        const packageId = session.metadata?.packageId;
        
        if (masterId && packageId) {
          console.log(`💳 Processing email credits purchase for master: ${masterId}`);
          
          const { data: packageData } = await supabase
            .from('email_packages')
            .select('credits')
            .eq('id', packageId)
            .maybeSingle();

          if (packageData) {
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

            console.log(`✅ Added ${packageData.credits} credits to master ${masterId}`);
          }
        }
      } 
      // Subscription purchase
      else if (session.mode === 'subscription') {
        const professionalId = session.metadata?.professionalId;
        if (!professionalId) {
          console.error('❌ Missing professionalId in session metadata');
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.error('❌ Missing subscription ID in checkout session');
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = (priceId && PRICE_ID_TO_PLAN[priceId]) || 'free';
          const credits = PLAN_CREDITS[plan] || 0;
          const endDate = safeTimestampToISO(subscription.current_period_end);

          console.log(`🎉 Activating ${plan} plan for professional ${professionalId}`);

          // Update professional profile
          await supabase
            .from('professional_profiles')
            .update({
              plan: plan,
              subscription_status: 'active',
              subscription_end_date: endDate,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer as string,
              subscription_last_changed: new Date().toISOString(),
            })
            .eq('id', professionalId);

          // Set email credits
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

          console.log(`✅ Successfully activated ${plan} plan with ${credits} credits`);
        } catch (error) {
          console.error('Error activating subscription:', error);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== SUBSCRIPTION DELETED =====
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`🗑️ Subscription deleted: ${subscription.id}`);

      // 1. Find professional by stripe_customer_id or stripe_subscription_id
      const professional = await findProfessional(supabase, subscription.id, customerId);
      
      if (!professional) {
        console.error(`❌ Professional not found for subscription ${subscription.id}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Update profile to FREE plan with expired status
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({
          plan: 'free',
          subscription_status: 'expired',
          is_cancelled: false,
          subscription_end_date: null,
          stripe_subscription_id: null,
          subscription_last_changed: new Date().toISOString(),
        })
        .eq('id', professional.id);

      if (updateError) {
        console.error('❌ Error updating professional profile:', updateError);
      }

      // 3. Reset email credits to 0 (FREE plan limits)
      const { error: creditsError } = await supabase
        .from('email_credits')
        .upsert({
          master_id: professional.id,
          credits: 0,
          updated_at: new Date().toISOString()
        });

      if (creditsError) {
        console.error('❌ Error resetting email credits:', creditsError);
      }

      // 4. Close subscription history
      await supabase
        .from('subscription_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('professional_id', professional.id)
        .eq('stripe_subscription_id', subscription.id)
        .is('ended_at', null);

      console.log(`✅ Subscription deleted - downgraded to FREE`);
      console.log(`   - Plan: free`);
      console.log(`   - Status: expired`);
      console.log(`   - Cancelled: false`);
      console.log(`   - Period end: null`);
      console.log(`   - Email credits: 0`);
      console.log(`   - FREE limits applied (max_masters=1, max_services=5, max_gallery=3)`);

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== SUBSCRIPTION UPDATED =====
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`🔄 Subscription updated - status: ${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end}`);

      const professional = await findProfessional(supabase, subscription.id, customerId);
      
      if (!professional) {
        console.error(`❌ Professional not found for subscription ${subscription.id}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // CASE A: User cancelled subscription but it's still active until period end
      if (subscription.cancel_at_period_end && subscription.status === 'active') {
        console.log(`⏳ Subscription cancelled but active until period end`);
        const endDate = safeTimestampToISO(subscription.current_period_end);
        
        // Keep current plan active, just mark as cancelled
        await supabase
          .from('professional_profiles')
          .update({
            subscription_status: 'canceled_at_period_end',
            is_cancelled: true,
            subscription_end_date: endDate,
            subscription_last_changed: new Date().toISOString(),
          })
          .eq('id', professional.id);

        console.log(`✅ Marked as cancelled, remains active until ${endDate}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // CASE B: Subscription fully canceled (status changed to 'canceled')
      if (subscription.status === 'canceled') {
        console.log(`🗑️ Subscription status changed to canceled - downgrading to FREE`);
        
        // Update profile to FREE plan with expired status
        const { error: updateError } = await supabase
          .from('professional_profiles')
          .update({
            plan: 'free',
            subscription_status: 'expired',
            is_cancelled: false,
            subscription_end_date: null,
            stripe_subscription_id: null,
            subscription_last_changed: new Date().toISOString(),
          })
          .eq('id', professional.id);

        if (updateError) {
          console.error('❌ Error updating professional profile:', updateError);
        }

        // Reset email credits to 0
        await supabase
          .from('email_credits')
          .upsert({
            master_id: professional.id,
            credits: 0,
            updated_at: new Date().toISOString()
          });

        // Close subscription history
        await supabase
          .from('subscription_history')
          .update({ ended_at: new Date().toISOString() })
          .eq('professional_id', professional.id)
          .eq('stripe_subscription_id', subscription.id)
          .is('ended_at', null);

        console.log(`✅ Downgraded to FREE (plan=free, status=expired, credits=0)`);

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // CASE C: Payment failed - mark as past_due but DON'T downgrade
      if (subscription.status === 'past_due') {
        console.log(`⚠️ Payment past due - keeping plan active`);
        await supabase
          .from('professional_profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', professional.id);

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // CASE D: Subscription reactivated (cancel_at_period_end = false and status = active)
      if (!subscription.cancel_at_period_end && subscription.status === 'active') {
        console.log(`✅ Subscription reactivated or upgraded`);
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = (priceId && PRICE_ID_TO_PLAN[priceId]) || 'free';
        const endDate = safeTimestampToISO(subscription.current_period_end);

        // Update subscription (replace credits for plan changes)
        await updateProfessionalSubscription(
          supabase,
          professional.id,
          plan,
          'active',
          endDate,
          subscription.id,
          true // Replace credits on active plan change
        );

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // CASE E: Other status changes - log and ignore
      console.log(`⚠️ Unhandled subscription status: ${subscription.status}`);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== INVOICE PAID =====
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Only handle subscription renewals
      if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
        const subscriptionId = invoice.subscription as string;
        
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = (priceId && PRICE_ID_TO_PLAN[priceId]) || 'free';
          const endDate = safeTimestampToISO(subscription.current_period_end);

          console.log(`💰 Invoice paid - ${plan} plan renewal`);

          const { data: professional } = await supabase
            .from('professional_profiles')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

          if (professional) {
            // Update status and add credits (not replace)
            await updateProfessionalSubscription(
              supabase,
              professional.id,
              plan,
              'active',
              endDate,
              subscriptionId,
              false // Add credits, don't replace
            );
          }
        } catch (error) {
          console.error('Error processing invoice.paid:', error);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== PAYMENT FAILED =====
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.subscription) {
        const subscriptionId = invoice.subscription as string;
        
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;

          const professional = await findProfessional(supabase, subscriptionId, customerId);

          if (professional) {
            await supabase
              .from('professional_profiles')
              .update({
                subscription_status: 'past_due',
              })
              .eq('id', professional.id);

            console.log(`⚠️ Payment failed for professional ${professional.id} - marked as past_due`);
          }
        } catch (error) {
          console.error('Error processing payment failure:', error);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== UNHANDLED EVENT =====
    console.log(`ℹ️ Unhandled event type: ${event.type}`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Webhook handler error:', errorMessage);
    
    // Always return 200 to prevent Stripe retries on our internal errors
    return new Response(JSON.stringify({ received: true, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
