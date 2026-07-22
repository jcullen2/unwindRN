/**
 * Live data — keeps the record fresh without manual pulls.
 *  1. Supabase Realtime: any insert/update/delete on the signed-in user's own
 *     shifts (another device, a background queue flush, the debrief modal
 *     dismissing) invalidates the shift queries so Home/Logbook/Insights redraw.
 *  2. Queue sync: when a shift stranded in a dead zone finally reaches Supabase,
 *     the same invalidation fires.
 * Mounted once, in the tab shell. User-scoped; torn down on sign-out.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { onShiftsSynced } from '@/lib/queue';
import { supabase } from '@/lib/supabase';

export function useLiveShiftData() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
    };

    // Fires when a background/foreground queue flush lands stranded rows.
    const unsub = onShiftsSynced(invalidate);

    // Realtime: the user's own shift rows only (RLS still applies server-side).
    const channel = supabase
      .channel(`shifts:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts', filter: `user_id=eq.${userId}` },
        invalidate
      )
      .subscribe();

    return () => {
      unsub();
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
