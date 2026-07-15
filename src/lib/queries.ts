import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { Shift, supabase } from '@/lib/supabase';

export function useShifts() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['shifts'],
    enabled: !!session,
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
    queryKey: ['shifts', id],
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

export type Totals = { total_shifts: number; total_hours: number };

/** Totals are computed by the shift_totals view — never stored counters. */
export function useTotals() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['totals'],
    enabled: !!session,
    queryFn: async (): Promise<Totals> => {
      const { data, error } = await supabase
        .from('shift_totals')
        .select('total_shifts, total_hours')
        .maybeSingle();
      if (error) throw error;
      return {
        total_shifts: data?.total_shifts ?? 0,
        total_hours: Number(data?.total_hours ?? 0),
      };
    },
  });
}

export function useInvalidateShiftData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shifts'] }),
      queryClient.invalidateQueries({ queryKey: ['totals'] }),
    ]);
}
