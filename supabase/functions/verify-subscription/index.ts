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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICE_ID_TO_PLAN: Record<string, string> = {
  'price_1SWmMTRtOhWJgeVeCxB9RCxm': 'starteris',
  'price_1SWmMtRtOhWJgeVeiKK0m0YL': 'pro',
  'price_1SWmNCRtOhWJgeVekHZDvwzP': 'bizness',
};

const PLAN_CREDITS: Record<string, number> = {
  'free': 0,
  'starteris': 200,
  'pro': 1000,
  'bizness': 5000,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, professionalId } = await req.json();

    if (!sessionId || !professionalId) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId or professionalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying subscription for session:', sessionId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', status: session.payment_status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription details
    if (!session.subscription) {
      return new Response(
        JSON.stringify({ error: 'No subscription found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    const plan = PRICE_ID_TO_PLAN[priceId] || 'free';
    const credits = PLAN_CREDITS[plan] || 0;

    console.log(`Activating ${plan} plan for professional ${professionalId}`);

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
        started_at: new Date().toISOString(),
        stripe_subscription_id: subscriptionId,
      });

    console.log(`Successfully activated ${plan} plan with ${credits} credits`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan: plan,
        credits: credits,
        subscriptionId: subscriptionId 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Verification error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
