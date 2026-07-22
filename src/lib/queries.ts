import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { Shift, supabase } from '@/lib/supabase';

export function useShifts() {
  const { session } = useAuth();
  return useQuery({
    // Keyed by user so one account's cache can never render for another
    queryKey: ['shifts', session?.user.id],
    enabled: !!session,
    staleTime: 30_000, // saves invalidate explicitly; don't refire on tab hops
    queryFn: async (): Promise<Shift[]> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('shift_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useShift(id: string | undefined) {
  return useQuery({
    queryKey: ['shift', id],
    enabled: !!id,
    queryFn: async (): Promise<Shift | null> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Career totals = onboarding estimate (est_*) + logged rows, computed from
 * the shifts query — never stored counters. Estimated portions wear the ~.
 */
export function useCareerTotals() {
  const { profile } = useAuth();
  const { data: shifts } = useShifts();
  const logged = shifts ?? [];
  const loggedHours = logged.reduce((sum, s) => sum + Number(s.hours ?? 0), 0);
  const estShifts = profile?.est_career_shifts ?? 0;
  const estHours = profile?.est_career_hours ?? 0;
  return {
    shifts: estShifts + logged.length,
    hours: estHours + loggedHours,
    loggedShifts: logged.length,
    loggedHours,
    estimated: estShifts > 0 || estHours > 0,
  };
}

export function useInvalidateShiftData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['shifts'] });
}
