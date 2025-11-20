import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0'

Deno.serve(async (req) => {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ADMIN')
      .single()

    if (roleError || !roles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete user data in correct order to respect foreign key constraints
    
    // 1. Get professional profile ID if exists
    const { data: professionalProfile } = await supabaseAdmin
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    // 2. Delete reviews (both as client and as professional)
    const { error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('client_id', userId)
    
    if (reviewsError) {
      console.error('Error deleting reviews as client:', reviewsError)
    }

    if (professionalProfile) {
      const { error: profReviewsError } = await supabaseAdmin
        .from('reviews')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (profReviewsError) {
        console.error('Error deleting reviews as professional:', profReviewsError)
      }
    }

    // 3. Delete bookings (both as client and as professional)
    const { error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('client_id', userId)
    
    if (bookingsError) {
      console.error('Error deleting bookings as client:', bookingsError)
    }

    if (professionalProfile) {
      const { error: profBookingsError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (profBookingsError) {
        console.error('Error deleting bookings as professional:', profBookingsError)
      }

      // 4. Delete services
      const { error: servicesError } = await supabaseAdmin
        .from('services')
        .delete()
        .eq('professional_id', professionalProfile.id)
      
      if (servicesError) {
        console.error('Error deleting services:', servicesError)
      }

      // 5. Delete professional profile
      const { error: profProfileError } = await supabaseAdmin
        .from('professional_profiles')
        .delete()
        .eq('user_id', userId)
      
      if (profProfileError) {
        console.error('Error deleting professional profile:', profProfileError)
        throw profProfileError
      }
    }

    // 6. Delete user roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    
    if (rolesError) {
      console.error('Error deleting user roles:', rolesError)
    }

    // 7. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
      throw profileError
    }

    // 8. Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      throw deleteError
    }

    console.log('User deleted successfully:', userId)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
