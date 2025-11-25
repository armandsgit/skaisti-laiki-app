import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get professional profile
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, stripe_subscription_id, stripe_customer_id, plan')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Professional profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If already on FREE plan
    if (!profile.stripe_subscription_id || profile.plan === 'free') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already on FREE plan' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cancel Stripe subscription
    console.log('Canceling subscription:', profile.stripe_subscription_id);
    await stripe.subscriptions.cancel(profile.stripe_subscription_id);

    // Update professional profile to FREE
    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update({
        plan: 'free',
        subscription_status: 'inactive',
        stripe_subscription_id: null,
        subscription_end_date: null,
        subscription_last_changed: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reset email credits to 0
    await supabase
      .from('email_credits')
      .update({ 
        credits: 0,
        updated_at: new Date().toISOString()
      })
      .eq('master_id', profile.id);

    // Plan limits enforced by UI only - no staff deactivation on downgrade
    // All staff members remain in database with is_active: true
    // UI filters based on plan limits in StaffMemberManager and public profiles

    // Close subscription history
    await supabase
      .from('subscription_history')
      .update({ ended_at: new Date().toISOString() })
      .eq('professional_id', profile.id)
      .eq('stripe_subscription_id', profile.stripe_subscription_id)
      .is('ended_at', null);

    console.log('Successfully downgraded to FREE plan');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Successfully downgraded to FREE plan'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Downgrade error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
