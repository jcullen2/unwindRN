import { format } from 'date-fns';

import { supabase } from '@/lib/supabase';

/** The record draft handed to /record — assembled from taps + per-turn facts. */
export type RecordDraft = {
  shift_date: string;
  hours: number | null;
  load: number | null; // 1 Light … 5 Brutal
  win: string;
  weight: string; // the emotional note
  lesson: string;
  tags?: string[];
  is_night?: boolean;
  source?: 'taps' | 'voice' | 'both';
};

export function localToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export async function requestAccountDeletion(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error || data?.deleted !== true) {
    throw new Error('delete_failed');
  }
}
