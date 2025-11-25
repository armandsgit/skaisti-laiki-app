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

interface CheckoutRequest {
  priceId: string;
  professionalId: string;
  existingSubscriptionId?: string;
  successUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, professionalId, existingSubscriptionId, successUrl, cancelUrl }: CheckoutRequest = await req.json();

    console.log('Creating checkout session for professional:', professionalId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get professional data
    const { data: professional, error: profError } = await supabase
      .from('professional_profiles')
      .select('stripe_customer_id, user_id, stripe_subscription_id')
      .eq('id', professionalId)
      .single();

    if (profError || !professional) {
      console.error('Professional not found:', profError);
      return new Response('Professional not found', { status: 404, headers: corsHeaders });
    }

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', professional.user_id)
      .single();

    let customerId = professional.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId && profile?.email) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          professionalId: professionalId,
          userId: professional.user_id
        }
      });
      
      customerId = customer.id;

      // Update professional profile with customer ID
      await supabase
        .from('professional_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', professionalId);

      console.log('Created Stripe customer:', customerId);
    }

    // For existing subscriptions, create checkout session with subscription_update mode
    const existingSubId = existingSubscriptionId || professional.stripe_subscription_id;
    
    if (existingSubId) {
      console.log('Creating checkout session to update existing subscription:', existingSubId);
    }

    // Create checkout session
    const sessionConfig: any = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        professionalId: professionalId,
        priceId: priceId,
      },
    };

    // If updating existing subscription, add subscription_data
    if (existingSubId) {
      // For plan changes, cancel the existing subscription and create a new one
      sessionConfig.subscription_data = {
        metadata: {
          professionalId: professionalId,
          priceId: priceId,
          previousSubscriptionId: existingSubId,
        }
      };
    } else {
      // For new subscriptions
      sessionConfig.subscription_data = {
        metadata: {
          professionalId: professionalId,
          priceId: priceId,
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Checkout session created:', session.id, 'for price:', priceId);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Checkout error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
