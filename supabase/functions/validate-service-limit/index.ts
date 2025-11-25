import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_LIMITS = {
  free: { maxServices: 5, maxGalleryPhotos: 3 },
  starteris: { maxServices: 15, maxGalleryPhotos: 10 },
  pro: { maxServices: 30, maxGalleryPhotos: 30 },
  bizness: { maxServices: -1, maxGalleryPhotos: -1 }, // -1 = unlimited
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { type, professionalId } = await req.json()

    // Get professional profile with plan
    const { data: profile, error: profileError } = await supabaseClient
      .from('professional_profiles')
      .select('plan')
      .eq('id', professionalId)
      .single()

    if (profileError) throw profileError

    const plan = (profile?.plan || 'free') as keyof typeof PLAN_LIMITS
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

    if (type === 'service') {
      // Check service count
      const { data: services, error: servicesError } = await supabaseClient
        .from('services')
        .select('id')
        .eq('professional_id', professionalId)

      if (servicesError) throw servicesError

      const currentCount = services?.length || 0
      const canAdd = limits.maxServices === -1 || currentCount < limits.maxServices

      return new Response(
        JSON.stringify({
          canAdd,
          currentCount,
          maxCount: limits.maxServices,
          plan,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (type === 'gallery') {
      // Check gallery photo count
      const { data: profileData, error: galleryError } = await supabaseClient
        .from('professional_profiles')
        .select('gallery')
        .eq('id', professionalId)
        .single()

      if (galleryError) throw galleryError

      const currentCount = profileData?.gallery?.length || 0
      const canAdd = limits.maxGalleryPhotos === -1 || currentCount < limits.maxGalleryPhotos

      return new Response(
        JSON.stringify({
          canAdd,
          currentCount,
          maxCount: limits.maxGalleryPhotos,
          plan,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})