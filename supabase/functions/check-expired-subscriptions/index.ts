import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    console.log('Starting expired subscriptions check...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // Find all professionals with expired subscriptions
    const { data: expiredProfiles, error: fetchError } = await supabase
      .from('professional_profiles')
      .select('id, user_id, plan, subscription_end_date')
      .eq('subscription_status', 'active')
      .not('plan', 'eq', 'free')
      .lt('subscription_end_date', now);

    if (fetchError) {
      console.error('Error fetching expired subscriptions:', fetchError);
      throw fetchError;
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      console.log('No expired subscriptions found');
      return new Response(
        JSON.stringify({ message: 'No expired subscriptions found', count: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${expiredProfiles.length} expired subscriptions`);

    // Update each expired profile to FREE plan
    const updates = expiredProfiles.map(async (profile) => {
      console.log(`Downgrading professional ${profile.id} from ${profile.plan} to free`);

      // Update to FREE plan
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({
          plan: 'free',
          subscription_status: 'inactive',
          subscription_end_date: null,
          stripe_subscription_id: null,
          subscription_last_changed: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`Error updating profile ${profile.id}:`, updateError);
        return { success: false, profileId: profile.id, error: updateError };
      }

      // Close subscription history
      await supabase
        .from('subscription_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('professional_id', profile.id)
        .is('ended_at', null);

      // Set email credits to 0 for free plan
      await supabase
        .from('email_credits')
        .update({ 
          credits: 0,
          updated_at: new Date().toISOString()
        })
        .eq('master_id', profile.id);

      // Deactivate excess staff members (keep only first 1 for FREE)
      const { data: staffMembers } = await supabase
        .from('staff_members')
        .select('id')
        .eq('professional_id', profile.id)
        .order('created_at', { ascending: true });

      if (staffMembers && staffMembers.length > 1) {
        const toDeactivate = staffMembers.slice(1).map((s: any) => s.id);
        
        await supabase
          .from('staff_members')
          .update({ is_active: false })
          .in('id', toDeactivate);
        
        console.log(`Deactivated ${toDeactivate.length} excess staff members for expired subscription`);
      }

      console.log(`Successfully downgraded professional ${profile.id} to FREE plan`);
      return { success: true, profileId: profile.id };
    });

    const results = await Promise.all(updates);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Downgrade complete: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Expired subscriptions processed',
        totalProcessed: expiredProfiles.length,
        succeeded: successCount,
        failed: failureCount,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-expired-subscriptions:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
