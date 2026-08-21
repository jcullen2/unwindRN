/**
 * Live data — keeps the record fresh without manual pulls.
 * When a shift stranded in a dead zone finally reaches Supabase (a background
 * or foreground queue flush), the shift queries invalidate so Home/Logbook/
 * Insights redraw. Mounted once, in the tab shell; user-scoped.
 *
 * (A Supabase Realtime subscription used to live here too. The `shifts` table
 * was never added to the realtime publication, so it subscribed to an empty
 * channel and never fired — removed 2026-08-21, verified against production.
 * Cross-device freshness comes from query refetches; this device's own saves
 * invalidate directly.)
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { onShiftsSynced } from '@/lib/queue';

export function useLiveShiftData() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    return onShiftsSynced(() => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
    });
  }, [userId, queryClient]);
}
