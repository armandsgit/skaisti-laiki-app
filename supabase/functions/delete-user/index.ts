import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Delete user function called')
    const { userId } = await req.json()
    console.log('Deleting user:', userId)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Unauthorized:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin user verified:', user.id)

    // Check if user is admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ADMIN')
      .single()

    if (roleError || !roles) {
      console.error('Admin access required:', roleError)
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting deletion process for user:', userId)

    // Get professional profile ID if exists
    const { data: professionalProfile } = await supabaseAdmin
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('Professional profile:', professionalProfile?.id)

    if (professionalProfile) {
      // Delete all professional-related data
      
      // 1. Delete subscription history
      const { error: subHistoryError } = await supabaseAdmin
        .from('subscription_history')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (subHistoryError) {
        console.error('Error deleting subscription history:', subHistoryError)
      }

      // 2. Delete email logs
      const { error: emailLogsError } = await supabaseAdmin
        .from('email_logs')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (emailLogsError) {
        console.error('Error deleting email logs:', emailLogsError)
      }

      // 3. Delete email usage
      const { error: emailUsageError } = await supabaseAdmin
        .from('email_usage')
        .delete()
        .eq('master_id', professionalProfile.id)
      
      if (emailUsageError) {
        console.error('Error deleting email usage:', emailUsageError)
      }

      // 4. Delete email credits
      const { error: emailCreditsError } = await supabaseAdmin
        .from('email_credits')
        .delete()
        .eq('master_id', professionalProfile.id)
      
      if (emailCreditsError) {
        console.error('Error deleting email credits:', emailCreditsError)
      }

      // 5. Get staff members
      const { data: staffMembers } = await supabaseAdmin
        .from('staff_members')
        .select('id')
        .eq('professional_id', professionalProfile.id)

      if (staffMembers && staffMembers.length > 0) {
        // Delete master_services for all staff members
        for (const staff of staffMembers) {
          const { error: masterServicesError } = await supabaseAdmin
            .from('master_services')
            .delete()
            .eq('staff_member_id', staff.id)
          
          if (masterServicesError) {
            console.error('Error deleting master services:', masterServicesError)
          }
        }

        // Delete staff members
        const { error: staffError } = await supabaseAdmin
          .from('staff_members')
          .delete()
          .eq('professional_id', professionalProfile.id)
        
        if (staffError) {
          console.error('Error deleting staff members:', staffError)
        }
      }

      // 6. Delete blocked time slots
      const { error: blockedSlotsError } = await supabaseAdmin
        .from('blocked_time_slots')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (blockedSlotsError) {
        console.error('Error deleting blocked time slots:', blockedSlotsError)
      }

      // 7. Delete professional schedules
      const { error: schedulesError } = await supabaseAdmin
        .from('professional_schedules')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (schedulesError) {
        console.error('Error deleting schedules:', schedulesError)
      }

      // 8. Delete reviews as professional
      const { error: profReviewsError } = await supabaseAdmin
        .from('reviews')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (profReviewsError) {
        console.error('Error deleting reviews as professional:', profReviewsError)
      }

      // 9. Delete bookings as professional
      const { error: profBookingsError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (profBookingsError) {
        console.error('Error deleting bookings as professional:', profBookingsError)
      }

      // 10. Delete services
      const { error: servicesError } = await supabaseAdmin
        .from('services')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (servicesError) {
        console.error('Error deleting services:', servicesError)
      }

      // 11. Finally delete professional profile
      const { error: profProfileError } = await supabaseAdmin
        .from('professional_profiles')
        .delete()
        .eq('id', professionalProfile.id)
      
      if (profProfileError) {
        console.error('Error deleting professional profile:', profProfileError)
        throw profProfileError
      }

      console.log('Professional data deleted successfully')
    }

    // Delete client-related data
    // 1. Delete reviews as client
    const { error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('client_id', userId)
    
    if (reviewsError) {
      console.error('Error deleting reviews as client:', reviewsError)
    }

    // 2. Delete bookings as client
    const { error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('client_id', userId)
    
    if (bookingsError) {
      console.error('Error deleting bookings as client:', bookingsError)
    }

    // 3. Delete user roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    
    if (rolesError) {
      console.error('Error deleting user roles:', rolesError)
    }

    // 4. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
      throw profileError
    }

    // 5. Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      throw deleteError
    }

    console.log('User deleted successfully:', userId)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Delete user error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
