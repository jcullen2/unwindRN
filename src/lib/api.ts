import { format } from 'date-fns';

import { supabase } from '@/lib/supabase';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** The record, forming — v3 shift draft assembled from a debrief. */
export type RecordDraft = {
  shift_date: string;
  hours: number | null;
  load: number | null; // 1 Light … 5 Brutal
  win: string;
  weight: string; // the emotional note
  lesson: string;
};

export function localToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export async function requestDebriefReply(
  messages: ChatMessage[]
): Promise<{ reply: string; crisis: boolean }> {
  const { data, error } = await supabase.functions.invoke('debrief', {
    body: { messages },
  });
  if (error || typeof data?.reply !== 'string') {
    throw new Error('debrief_failed');
  }
  return { reply: data.reply, crisis: data.crisis === true };
}

/**
 * The extract function still speaks the v1 wire shape
 * ({win, loss, lesson, mood, unit}); mapped here to the v3 record
 * (loss→weight, mood→load, unit dropped). The function itself moves to the
 * per-turn utility schema in Session 2.
 */
export async function requestExtraction(messages: ChatMessage[]): Promise<RecordDraft> {
  const { data, error } = await supabase.functions.invoke('extract', {
    body: { messages, today: localToday() },
  });
  const draft = data?.draft;
  if (error || !draft || typeof draft.shift_date !== 'string') {
    throw new Error('extract_failed');
  }
  return {
    shift_date: draft.shift_date,
    hours: typeof draft.hours === 'number' ? draft.hours : null,
    load: typeof draft.mood === 'number' ? draft.mood : null,
    win: typeof draft.win === 'string' ? draft.win : '',
    weight: typeof draft.loss === 'string' ? draft.loss : '',
    lesson: typeof draft.lesson === 'string' ? draft.lesson : '',
  };
}

export async function requestAccountDeletion(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error || data?.deleted !== true) {
    throw new Error('delete_failed');
  }
}
