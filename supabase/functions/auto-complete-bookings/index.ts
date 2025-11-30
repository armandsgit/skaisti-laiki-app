import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingToComplete {
  id: string;
  booking_date: string;
  booking_end_time: string;
  professional_id: string;
  client_id: string;
  service_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🤖 Auto-complete bookings cron started');

    // Configuration
    const SAFETY_BUFFER_SECONDS = 30;
    const HISTORICAL_WINDOW_DAYS = 30;
    const BATCH_SIZE = 200;

    const now = new Date();
    const historicalCutoff = new Date(now.getTime() - (HISTORICAL_WINDOW_DAYS * 24 * 60 * 60 * 1000));

    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`📅 Historical cutoff: ${historicalCutoff.toISOString()}`);

    // Find bookings that need auto-completion
    // Status must be 'confirmed', end time must have passed (with safety buffer), not already auto-completed
    const { data: bookingsToComplete, error: queryError } = await supabase
      .from('bookings')
      .select('id, booking_date, booking_end_time, professional_id, client_id, service_id')
      .eq('status', 'confirmed')
      .is('auto_completed_at', null)
      .gte('booking_date', historicalCutoff.toISOString().split('T')[0])
      .limit(BATCH_SIZE);

    if (queryError) {
      console.error('❌ Error querying bookings:', queryError);
      throw queryError;
    }

    if (!bookingsToComplete || bookingsToComplete.length === 0) {
      console.log('✅ No bookings to auto-complete');
      return new Response(
        JSON.stringify({ success: true, processedCount: 0, message: 'No bookings to complete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${bookingsToComplete.length} potential bookings to check`);

    // Filter bookings where end time has actually passed (with safety buffer)
    // We work in Latvia timezone (Europe/Riga)
    const bookingsToProcess: BookingToComplete[] = [];
    
    // Get current time in Latvia timezone with proper parsing
    const latviaTimeString = now.toLocaleString('sv-SE', { timeZone: 'Europe/Riga' }); // "2025-12-01 00:39:27"
    console.log(`⏰ Current Latvia time: ${latviaTimeString}`);
    
    // Parse current time components
    const [currentDateStr, currentTimeStr] = latviaTimeString.split(' ');
    const [currentHour, currentMinute, currentSecond] = currentTimeStr.split(':').map(Number);
    const currentTotalSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond;
    const safetyBufferSeconds = currentTotalSeconds - SAFETY_BUFFER_SECONDS;
    
    for (const booking of bookingsToComplete) {
      // Parse booking end time: "HH:MM:SS" or "HH:MM"
      const endTimeParts = booking.booking_end_time.split(':');
      const endHour = parseInt(endTimeParts[0]);
      const endMinute = parseInt(endTimeParts[1]);
      const endSecond = endTimeParts[2] ? parseInt(endTimeParts[2]) : 0;
      const bookingEndSeconds = endHour * 3600 + endMinute * 60 + endSecond;
      
      // Check if booking has passed (considering safety buffer)
      let isPastDue = false;
      
      if (booking.booking_date < currentDateStr) {
        // Past date - definitely past due
        isPastDue = true;
      } else if (booking.booking_date === currentDateStr) {
        // Same date - check if end time has passed (with safety buffer)
        isPastDue = bookingEndSeconds <= safetyBufferSeconds;
      }
      // else: future date - not past due
      
      if (isPastDue) {
        bookingsToProcess.push(booking);
        console.log(`✅ Booking ${booking.id} ready: ${booking.booking_date} ${booking.booking_end_time}`);
      }
    }

    console.log(`✅ ${bookingsToProcess.length} bookings passed safety buffer check`);

    if (bookingsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processedCount: 0, message: 'No bookings past safety buffer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processedIds: string[] = [];
    const failedIds: string[] = [];

    // Process each booking individually with idempotent update
    for (const booking of bookingsToProcess) {
      try {
        console.log(`🔄 Processing booking ${booking.id}`);

        // Idempotent update: only update if still confirmed and not auto-completed
        const { data: updated, error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'completed',
            auto_completed_at: now.toISOString(),
            completed_by: 'auto',
            updated_at: now.toISOString()
          })
          .eq('id', booking.id)
          .eq('status', 'confirmed')
          .is('auto_completed_at', null)
          .select()
          .single();

        if (updateError) {
          console.error(`❌ Error updating booking ${booking.id}:`, updateError);
          failedIds.push(booking.id);
          continue;
        }

        if (!updated) {
          console.log(`⚠️ Booking ${booking.id} was already updated by another process`);
          continue;
        }

        console.log(`✅ Successfully auto-completed booking ${booking.id}`);

        // Insert audit log entry
        const { error: auditError } = await supabase
          .from('booking_events')
          .insert({
            booking_id: booking.id,
            event_type: 'auto_completed',
            event_data: {
              completed_at: now.toISOString(),
              booking_date: booking.booking_date,
              booking_end_time: booking.booking_end_time
            }
          });

        if (auditError) {
          console.error(`⚠️ Error creating audit log for ${booking.id}:`, auditError);
          // Don't fail the entire process for audit log errors
        }

        processedIds.push(booking.id);

        // Optional: Send notification (if enabled)
        // This would check professional settings and send email via Brevo
        // For now, we skip this to keep the cron fast

      } catch (error) {
        console.error(`❌ Unexpected error processing booking ${booking.id}:`, error);
        failedIds.push(booking.id);
      }
    }

    console.log(`✅ Auto-complete cron completed`);
    console.log(`   - Processed: ${processedIds.length}`);
    console.log(`   - Failed: ${failedIds.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: processedIds.length,
        failedCount: failedIds.length,
        processedIds,
        failedIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Fatal error in auto-complete-bookings:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});