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

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Checkout session completed:', session.id);
      
      // Extract metadata
      const masterId = session.metadata?.masterId;
      const packageId = session.metadata?.packageId;
      
      if (!masterId || !packageId) {
        console.error('Missing masterId or packageId in session metadata');
        return new Response('Missing metadata', { status: 400, headers: corsHeaders });
      }

      console.log('Master ID:', masterId, 'Package ID:', packageId);

      // Create Supabase client
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get package details
      const { data: packageData, error: packageError } = await supabase
        .from('email_packages')
        .select('credits')
        .eq('id', packageId)
        .single();

      if (packageError || !packageData) {
        console.error('Error fetching package:', packageError);
        return new Response('Package not found', { status: 404, headers: corsHeaders });
      }

      console.log('Package credits:', packageData.credits);

      // Check if email_credits record exists
      const { data: existingCredits, error: fetchError } = await supabase
        .from('email_credits')
        .select('credits')
        .eq('master_id', masterId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching credits:', fetchError);
        return new Response('Database error', { status: 500, headers: corsHeaders });
      }

      if (existingCredits) {
        // Update existing record
        const newCredits = existingCredits.credits + packageData.credits;
        console.log('Updating credits from', existingCredits.credits, 'to', newCredits);
        
        const { error: updateError } = await supabase
          .from('email_credits')
          .update({ 
            credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq('master_id', masterId);

        if (updateError) {
          console.error('Error updating credits:', updateError);
          return new Response('Failed to update credits', { status: 500, headers: corsHeaders });
        }
      } else {
        // Create new record
        console.log('Creating new credits record with', packageData.credits, 'credits');
        
        const { error: insertError } = await supabase
          .from('email_credits')
          .insert({
            master_id: masterId,
            credits: packageData.credits,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting credits:', insertError);
          return new Response('Failed to create credits', { status: 500, headers: corsHeaders });
        }
      }

      console.log('Credits successfully updated for master:', masterId);
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
