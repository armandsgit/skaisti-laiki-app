import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICE_ID_TO_PLAN: Record<string, string> = {
  'price_1SWmMTRtOhWJgeVeCxB9RCxm': 'starteris',
  'price_1SWmMtRtOhWJgeVeiKK0m0YL': 'pro',
  'price_1SWmNCRtOhWJgeVekHZDvwzP': 'bizness',
};

type PlanMode = 'renewing' | 'active_until_period_end' | 'expired';

interface SubscriptionStatus {
  planMode: PlanMode;
  currentPlan: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  subscriptionWillRenew: boolean;
  daysRemaining: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stripeSubscriptionId } = await req.json();

    if (!stripeSubscriptionId) {
      // No Stripe subscription = free plan
      return new Response(
        JSON.stringify({
          planMode: 'expired',
          currentPlan: 'free',
          subscriptionStatus: 'inactive',
          subscriptionEndDate: null,
          subscriptionWillRenew: false,
          daysRemaining: 0,
        } as SubscriptionStatus),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Stripe subscription:', stripeSubscriptionId);

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    const priceId = subscription.items.data[0].price.id;
    const plan = PRICE_ID_TO_PLAN[priceId] || 'free';
    const subscriptionStatus = subscription.status;
    const subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    const now = new Date();
    const endDate = new Date(subscription.current_period_end * 1000);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Compute planMode based on Stripe data
    let planMode: PlanMode;
    let effectivePlan: string;
    let willRenew: boolean;

    if (subscriptionStatus === 'active') {
      if (cancelAtPeriodEnd) {
        planMode = 'active_until_period_end';
        effectivePlan = plan;
        willRenew = false;
      } else {
        planMode = 'renewing';
        effectivePlan = plan;
        willRenew = true;
      }
    } else if (subscriptionStatus === 'canceled') {
      if (now < endDate) {
        planMode = 'active_until_period_end';
        effectivePlan = plan;
        willRenew = false;
      } else {
        planMode = 'expired';
        effectivePlan = 'free';
        willRenew = false;
      }
    } else {
      // incomplete, past_due, unpaid, etc.
      planMode = 'expired';
      effectivePlan = 'free';
      willRenew = false;
    }

    console.log(`Subscription status: ${subscriptionStatus}, planMode: ${planMode}, plan: ${effectivePlan}`);

    const result: SubscriptionStatus = {
      planMode,
      currentPlan: effectivePlan,
      subscriptionStatus,
      subscriptionEndDate,
      subscriptionWillRenew: willRenew,
      daysRemaining,
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching subscription status:', errorMessage);
    
    // On error, return free plan
    return new Response(
      JSON.stringify({
        planMode: 'expired',
        currentPlan: 'free',
        subscriptionStatus: 'inactive',
        subscriptionEndDate: null,
        subscriptionWillRenew: false,
        daysRemaining: 0,
      } as SubscriptionStatus),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
