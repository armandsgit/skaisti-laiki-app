import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isAfter, parse } from 'date-fns';

export const useTodayAvailability = (professionalIds: string[]) => {
  const [availableToday, setAvailableToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (professionalIds.length === 0) {
      setLoading(false);
      return;
    }

    const checkAvailability = async () => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentTime = format(today, 'HH:mm:ss');

      // Get schedules for today - include both main professional schedules and staff schedules
      const { data: schedules, error: scheduleError } = await supabase
        .from('professional_schedules')
        .select('professional_id, start_time, end_time')
        .in('professional_id', professionalIds)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (scheduleError) {
        console.error('Error fetching schedules:', scheduleError);
        setLoading(false);
        return;
      }

      // Get professionals that have schedule exceptions (closed today)
      const { data: exceptions } = await supabase
        .from('schedule_exceptions')
        .select('professional_id')
        .in('professional_id', professionalIds)
        .eq('exception_date', todayStr)
        .eq('is_closed', true);

      const closedToday = new Set(exceptions?.map(e => e.professional_id) || []);

      // Get today's bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('professional_id, booking_time, booking_end_time')
        .in('professional_id', professionalIds)
        .eq('booking_date', todayStr)
        .in('status', ['pending', 'confirmed']);

      // Group bookings by professional
      const bookingsByProfessional = new Map<string, Array<{ start: string; end: string }>>();
      bookings?.forEach(booking => {
        const existing = bookingsByProfessional.get(booking.professional_id) || [];
        existing.push({ start: booking.booking_time, end: booking.booking_end_time });
        bookingsByProfessional.set(booking.professional_id, existing);
      });

      // Determine which professionals have availability
      const available = new Set<string>();

      schedules?.forEach(schedule => {
        // Skip if closed today
        if (closedToday.has(schedule.professional_id)) return;

        // Check if schedule end time is after current time
        if (schedule.end_time <= currentTime) return;

        // Simple check: if they have a schedule today that hasn't ended, consider them potentially available
        const scheduleStart = schedule.start_time > currentTime ? schedule.start_time : currentTime;
        const scheduleEnd = schedule.end_time;
        
        // If there's any time window, mark as available
        if (scheduleStart < scheduleEnd) {
          available.add(schedule.professional_id);
        }
      });

      setAvailableToday(available);
      setLoading(false);
    };

    checkAvailability();
  }, [professionalIds.join(',')]);

  return { availableToday, loading };
};
