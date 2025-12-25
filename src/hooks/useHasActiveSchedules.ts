import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useHasActiveSchedules = (professionalIds: string[]) => {
  const [hasActiveSchedule, setHasActiveSchedule] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (professionalIds.length === 0) {
        if (!active) return;
        setHasActiveSchedule(new Set());
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from('professional_schedules')
        .select('professional_id')
        .in('professional_id', professionalIds)
        .eq('is_active', true);

      if (!active) return;

      if (error) {
        console.error('Error fetching schedules:', error);
        setHasActiveSchedule(new Set());
        setLoading(false);
        return;
      }

      setHasActiveSchedule(new Set((data ?? []).map((r) => r.professional_id)));
      setLoading(false);
    };

    run();

    return () => {
      active = false;
    };
  }, [professionalIds.join(',')]);

  return { hasActiveSchedule, loading };
};
