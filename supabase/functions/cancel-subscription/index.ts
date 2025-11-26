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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get professional profile
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, stripe_subscription_id, subscription_end_date')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Professional profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, retrieve the subscription to check its status
    try {
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

      // If subscription is already canceled, just update database
      if (subscription.status === 'canceled') {
        console.log(`⚠️ Subscription already canceled, updating database to FREE`);
        
        await supabase
          .from('professional_profiles')
          .update({
            plan: 'free',
            subscription_status: 'expired',
            subscription_end_date: null,
            stripe_subscription_id: null,
            is_cancelled: false,
          })
          .eq('id', profile.id);

        // Reset email credits
        await supabase
          .from('email_credits')
          .update({
            credits: 0,
            updated_at: new Date().toISOString()
          })
          .eq('master_id', profile.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Subscription already canceled, downgraded to FREE',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If subscription is active, cancel it at period end
      if (subscription.status === 'active') {
        const updatedSubscription = await stripe.subscriptions.update(
          profile.stripe_subscription_id,
          { cancel_at_period_end: true }
        );

        // Update database to mark as cancelled
        const periodEnd = updatedSubscription.current_period_end
          ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
          : profile.subscription_end_date;

        await supabase
          .from('professional_profiles')
          .update({
            subscription_status: 'canceled_at_period_end',
            is_cancelled: true,
            subscription_end_date: periodEnd,
            subscription_last_changed: new Date().toISOString(),
          })
          .eq('id', profile.id);

        console.log(`✅ Subscription ${profile.stripe_subscription_id} marked for cancellation at period end`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Subscription will be cancelled at period end',
            periodEnd: periodEnd,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For any other status (past_due, unpaid, etc.)
      return new Response(
        JSON.stringify({
          error: `Cannot cancel subscription with status: ${subscription.status}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      // If the subscription doesn't exist in Stripe, downgrade to FREE
      if (stripeError.code === 'resource_missing' || stripeError.type === 'invalid_request_error') {
        console.log(`⚠️ Subscription not found in Stripe, downgrading to FREE`);
        
        await supabase
          .from('professional_profiles')
          .update({
            plan: 'free',
            subscription_status: 'expired',
            subscription_end_date: null,
            stripe_subscription_id: null,
            is_cancelled: false,
          })
          .eq('id', profile.id);

        // Reset email credits
        await supabase
          .from('email_credits')
          .update({
            credits: 0,
            updated_at: new Date().toISOString()
          })
          .eq('master_id', profile.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Subscription not found in Stripe, downgraded to FREE',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw stripeError;
    }
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});