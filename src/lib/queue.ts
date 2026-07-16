/**
 * Local-first shift queue (CLAUDE.md: a dead zone in a hospital parking
 * garage must never lose a record). Shifts write to AsyncStorage instantly,
 * then sync to Supabase; unsynced rows retry on demand and app foreground.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/lib/database.types';

const KEY = 'unwindrn_shift_queue_v1';

type QueuedShift = { clientId: string; payload: TablesInsert<'shifts'> };

async function readQueue(): Promise<QueuedShift[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedShift[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: QueuedShift[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
}

/**
 * Queue the shift locally (never lost), then try to sync now.
 * Returns { synced, shiftId } — shiftId only when the row reached Supabase.
 */
export async function saveShift(
  payload: TablesInsert<'shifts'>
): Promise<{ synced: boolean; shiftId: string | null }> {
  const entry: QueuedShift = {
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    payload,
  };
  const q = await readQueue();
  await writeQueue([...q, entry]);

  try {
    const { data, error } = await supabase
      .from('shifts')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    const rest = (await readQueue()).filter((e) => e.clientId !== entry.clientId);
    await writeQueue(rest);
    return { synced: true, shiftId: data.id };
  } catch {
    return { synced: false, shiftId: null };
  }
}

/** Push any stranded rows. Safe to call often; no-ops when empty. */
export async function flushShiftQueue(): Promise<number> {
  const q = await readQueue();
  if (q.length === 0) return 0;
  let flushed = 0;
  const remaining: QueuedShift[] = [];
  for (const entry of q) {
    try {
      const { error } = await supabase.from('shifts').insert(entry.payload);
      if (error) throw error;
      flushed++;
    } catch {
      remaining.push(entry);
    }
  }
  await writeQueue(remaining);
  return flushed;
}

// Retry stranded rows whenever the app comes back to the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    flushShiftQueue().catch(() => {});
  }
});
