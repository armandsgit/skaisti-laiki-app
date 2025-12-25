import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';

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
      const currentTime = format(today, 'HH:mm:ss');
      
      // Check next 3 days
      const datesToCheck = [
        { date: today, dayOfWeek: today.getDay(), isToday: true },
        { date: addDays(today, 1), dayOfWeek: addDays(today, 1).getDay(), isToday: false },
        { date: addDays(today, 2), dayOfWeek: addDays(today, 2).getDay(), isToday: false },
      ];

      const dateStrings = datesToCheck.map(d => format(d.date, 'yyyy-MM-dd'));
      const daysOfWeek = [...new Set(datesToCheck.map(d => d.dayOfWeek))];

      // Get schedules for next 3 days
      const { data: schedules, error: scheduleError } = await supabase
        .from('professional_schedules')
        .select('professional_id, day_of_week, start_time, end_time')
        .in('professional_id', professionalIds)
        .in('day_of_week', daysOfWeek)
        .eq('is_active', true);

      if (scheduleError) {
        console.error('Error fetching schedules:', scheduleError);
        setLoading(false);
        return;
      }

      // Get professionals that have schedule exceptions (closed) for next 3 days
      const { data: exceptions } = await supabase
        .from('schedule_exceptions')
        .select('professional_id, exception_date')
        .in('professional_id', professionalIds)
        .in('exception_date', dateStrings)
        .eq('is_closed', true);

      // Map of closures: professionalId -> Set of closed dates
      const closedDates = new Map<string, Set<string>>();
      exceptions?.forEach(e => {
        if (!closedDates.has(e.professional_id)) {
          closedDates.set(e.professional_id, new Set());
        }
        closedDates.get(e.professional_id)!.add(e.exception_date);
      });

      // Determine which professionals have availability in next 3 days
      const available = new Set<string>();

      for (const prof of professionalIds) {
        // Check each of the next 3 days
        for (const dayCheck of datesToCheck) {
          const dateStr = format(dayCheck.date, 'yyyy-MM-dd');
          
          // Skip if closed on this day
          if (closedDates.get(prof)?.has(dateStr)) continue;

          // Find schedules for this day of week
          const daySchedules = schedules?.filter(
            s => s.professional_id === prof && s.day_of_week === dayCheck.dayOfWeek
          ) || [];

          for (const schedule of daySchedules) {
            // For today, check if end time is after current time
            if (dayCheck.isToday) {
              if (schedule.end_time <= currentTime) continue;
              
              const scheduleStart = schedule.start_time > currentTime ? schedule.start_time : currentTime;
              if (scheduleStart < schedule.end_time) {
                available.add(prof);
                break;
              }
            } else {
              // For future days, any schedule means available
              available.add(prof);
              break;
            }
          }

          if (available.has(prof)) break;
        }
      }

      setAvailableToday(available);
      setLoading(false);
    };

    checkAvailability();
  }, [professionalIds.join(',')]);

  return { availableToday, loading };
};
