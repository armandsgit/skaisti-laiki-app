import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_LIMITS = {
  free: {
    maxServices: 3,
    maxStaffMembers: 1,
    maxGalleryPhotos: 3,
    maxSchedules: 1,
    maxExceptionDaysPerMonth: 3,
    maxActiveReservationsPerMonth: 20,
  },
  starteris: {
    maxServices: 10,
    maxStaffMembers: 3,
    maxGalleryPhotos: 10,
    maxSchedules: 2,
    maxExceptionDaysPerMonth: 10,
    maxActiveReservationsPerMonth: 100,
  },
  pro: {
    maxServices: 25,
    maxStaffMembers: 10,
    maxGalleryPhotos: 30,
    maxSchedules: 5,
    maxExceptionDaysPerMonth: 30,
    maxActiveReservationsPerMonth: -1, // unlimited
  },
  bizness: {
    maxServices: -1, // unlimited
    maxStaffMembers: 999, // unlimited
    maxGalleryPhotos: -1, // unlimited
    maxSchedules: -1, // unlimited
    maxExceptionDaysPerMonth: -1, // unlimited
    maxActiveReservationsPerMonth: -1, // unlimited
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { professionalId, limitType } = await req.json();

    if (!professionalId || !limitType) {
      return new Response(
        JSON.stringify({ error: 'Missing professionalId or limitType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get professional's plan
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('plan')
      .eq('id', professionalId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Professional not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const plan = profile.plan || 'free';
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

    let currentCount = 0;
    let limit = 0;
    let canAdd = false;

    switch (limitType) {
      case 'services': {
        const { count } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('professional_id', professionalId);
        currentCount = count || 0;
        limit = limits.maxServices;
        canAdd = limit === -1 || currentCount < limit;
        break;
      }

      case 'staff': {
        const { count } = await supabase
          .from('staff_members')
          .select('*', { count: 'exact', head: true })
          .eq('professional_id', professionalId)
          .eq('is_active', true);
        currentCount = count || 0;
        limit = limits.maxStaffMembers;
        canAdd = limit === -1 || limit === 999 || currentCount < limit;
        break;
      }

      case 'gallery': {
        const { data } = await supabase
          .from('professional_profiles')
          .select('gallery')
          .eq('id', professionalId)
          .single();
        currentCount = (data?.gallery || []).length;
        limit = limits.maxGalleryPhotos;
        canAdd = limit === -1 || currentCount < limit;
        break;
      }

      case 'schedules': {
        const { count } = await supabase
          .from('professional_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('professional_id', professionalId);
        currentCount = count || 0;
        limit = limits.maxSchedules;
        canAdd = limit === -1 || currentCount < limit;
        break;
      }

      case 'exceptionDays': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        const { count } = await supabase
          .from('schedule_exceptions')
          .select('*', { count: 'exact', head: true })
          .eq('professional_id', professionalId)
          .gte('exception_date', startOfMonth.toISOString())
          .lt('exception_date', endOfMonth.toISOString());
        
        currentCount = count || 0;
        limit = limits.maxExceptionDaysPerMonth;
        canAdd = limit === -1 || currentCount < limit;
        break;
      }

      case 'reservations': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('professional_id', professionalId)
          .in('status', ['pending', 'confirmed'])
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', endOfMonth.toISOString());
        
        currentCount = count || 0;
        limit = limits.maxActiveReservationsPerMonth;
        canAdd = limit === -1 || currentCount < limit;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid limitType' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({
        canAdd,
        currentCount,
        limit,
        plan,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error checking plan limits:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});