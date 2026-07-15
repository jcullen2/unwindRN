import { format } from 'date-fns';

import { supabase } from '@/lib/supabase';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type ShiftDraft = {
  shift_date: string;
  hours: number | null;
  unit: string | null;
  win: string;
  loss: string;
  lesson: string;
  mood: number | null;
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

export async function requestExtraction(messages: ChatMessage[]): Promise<ShiftDraft> {
  const { data, error } = await supabase.functions.invoke('extract', {
    body: { messages, today: localToday() },
  });
  if (error || !data?.draft || typeof data.draft.shift_date !== 'string') {
    throw new Error('extract_failed');
  }
  return data.draft as ShiftDraft;
}

export async function requestAccountDeletion(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error || data?.deleted !== true) {
    throw new Error('delete_failed');
  }
}
