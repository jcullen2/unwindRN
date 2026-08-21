/**
 * Local-first shift queue (CLAUDE.md: a dead zone in a hospital parking
 * garage must never lose a record). Shifts write to AsyncStorage instantly,
 * then sync to Supabase; unsynced rows retry on demand and app foreground.
 *
 * Durability rules this file owes her:
 *  - IDEMPOTENT SYNC: every queued shift carries a stable client-generated
 *    UUID as its row id and syncs via upsert-ignore-duplicates. If the server
 *    committed but the response died on the drive home, the retry is a no-op
 *    instead of a second row in her logbook.
 *  - PER-ACCOUNT PARTITIONS: queue storage is keyed by user id. On a shared
 *    device, one account's stranded shifts can never flush into another's
 *    logbook. The legacy global queue migrates into the owner's partition.
 *  - QUARANTINE, NEVER OVERWRITE: malformed storage is moved aside intact
 *    (for recovery), not silently replaced.
 *  - HONEST FAILURE: saveShift never throws and never lies — `queued:false`
 *    means the phone itself refused the write and the caller must say so.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/lib/database.types';

const QUEUE_PREFIX = 'unwindrn_shift_queue_v2:';
const QUARANTINE_PREFIX = 'unwindrn_shift_queue_bad:';
const LEGACY_KEY = 'unwindrn_shift_queue_v1';

type ShiftInsert = TablesInsert<'shifts'>;
type QueuedShift = { id: string; payload: ShiftInsert };

export type SaveResult = {
  /** The row is safe on this phone (and will sync eventually). */
  queued: boolean;
  /** The row reached Supabase during this call. */
  synced: boolean;
  /** The row's id — client-generated, valid before and after sync. */
  shiftId: string | null;
};

/** UUID v4 — crypto randomness when the runtime has it, Math.random fallback. */
export function newShiftId(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---------------------------------------------------------------------------
// Listeners

// The query layer is told when stranded rows finally reach Supabase, so a
// shift saved in a dead zone shows up the moment it syncs.
const flushListeners = new Set<() => void>();
export function onShiftsSynced(cb: () => void): () => void {
  flushListeners.add(cb);
  return () => flushListeners.delete(cb);
}

// The UI (Home's waiting-to-sync row) is told whenever the queue's size may
// have changed — saves, flushes, clears.
const changeListeners = new Set<() => void>();
export function onQueueChanged(cb: () => void): () => void {
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}

function emit(listeners: Set<() => void>) {
  for (const cb of listeners) {
    try {
      cb();
    } catch {
      // a bad listener must never break the queue
    }
  }
}

// ---------------------------------------------------------------------------
// Storage

const queueKey = (userId: string) => `${QUEUE_PREFIX}${userId}`;

function isQueuedShift(v: unknown): v is QueuedShift {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as QueuedShift).id === 'string' &&
    typeof (v as QueuedShift).payload === 'object' &&
    (v as QueuedShift).payload !== null
  );
}

/**
 * Read a user's queue. Malformed storage — unparseable JSON, a non-array, or
 * entries that lost their shape — is moved to a quarantine key with its raw
 * content intact, so nothing is silently destroyed and support can recover it.
 */
async function readQueue(userId: string): Promise<QueuedShift[]> {
  const key = queueKey(userId);
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return []; // storage read failed — treat as empty, never write over it here
  }
  if (raw == null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await quarantine(userId, raw);
    return [];
  }
  if (!Array.isArray(parsed)) {
    await quarantine(userId, raw);
    return [];
  }
  const valid = parsed.filter(isQueuedShift);
  if (valid.length !== parsed.length) {
    // Some entries lost their shape: quarantine the whole raw blob for
    // recovery, keep syncing the ones that are still intact.
    await quarantine(userId, raw);
    await writeQueue(userId, valid).catch(() => {});
  }
  return valid;
}

async function quarantine(userId: string, raw: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${QUARANTINE_PREFIX}${userId}:${Date.now()}`, raw);
    await AsyncStorage.removeItem(queueKey(userId));
  } catch {
    // if even quarantine fails, leave the original in place — never destroy
  }
}

async function writeQueue(userId: string, q: QueuedShift[]): Promise<void> {
  await AsyncStorage.setItem(queueKey(userId), JSON.stringify(q));
}

/**
 * One-time adoption of the legacy global queue (pre-partition format
 * {clientId, payload}) into the owner's partition. Entries belonging to other
 * users stay put until those users sign in.
 */
async function migrateLegacy(userId: string): Promise<void> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(LEGACY_KEY);
  } catch {
    return;
  }
  if (raw == null) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await quarantine(`legacy`, raw);
    await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
    return;
  }
  if (!Array.isArray(parsed)) {
    await quarantine(`legacy`, raw);
    await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
    return;
  }
  const mine: QueuedShift[] = [];
  const rest: unknown[] = [];
  for (const entry of parsed) {
    const payload = (entry as { payload?: ShiftInsert })?.payload;
    if (payload && payload.user_id === userId) {
      mine.push({ id: typeof payload.id === 'string' ? payload.id : newShiftId(), payload });
    } else {
      rest.push(entry);
    }
  }
  if (mine.length > 0) {
    const current = await readQueue(userId);
    await writeQueue(userId, [...current, ...mine.map((m) => ({ ...m, payload: { ...m.payload, id: m.id } }))]);
  }
  try {
    if (rest.length === 0) await AsyncStorage.removeItem(LEGACY_KEY);
    else await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(rest));
  } catch {
    // leave legacy in place; adoption retries next time
  }
}

// ---------------------------------------------------------------------------
// Serialization

/**
 * Every read-modify-write of the queue runs through this chain. AsyncStorage
 * has no transactions, so two overlapping flushes (a foreground event landing
 * mid-save, say) would each read the same array — serializing every mutation
 * is one of the two duplicate defenses; the idempotent upsert is the other.
 */
let chain: Promise<unknown> = Promise.resolve();
function exclusive<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job);
  chain = run.catch(() => {});
  return run;
}

// ---------------------------------------------------------------------------
// Sync

/**
 * Idempotent by id: if a previous attempt committed but its response was
 * lost, ON CONFLICT DO NOTHING makes this retry a no-op instead of a
 * duplicate row.
 */
async function pushRow(entry: QueuedShift): Promise<boolean> {
  const { error } = await supabase
    .from('shifts')
    .upsert({ ...entry.payload, id: entry.id }, { onConflict: 'id', ignoreDuplicates: true });
  return !error;
}

/**
 * Queue the shift on this phone (never lost), then try to sync now.
 * NEVER throws. `queued:false` means the phone's own storage refused the
 * write — the caller must tell her instead of implying the record is safe.
 */
export async function saveShift(payload: ShiftInsert): Promise<SaveResult> {
  const id = typeof payload.id === 'string' && payload.id ? payload.id : newShiftId();
  const entry: QueuedShift = { id, payload: { ...payload, id } };
  return exclusive(async () => {
    let queued = true;
    try {
      await migrateLegacy(payload.user_id);
      const q = await readQueue(payload.user_id);
      await writeQueue(payload.user_id, [...q, entry]);
      emit(changeListeners);
    } catch {
      queued = false; // local storage failed — still try the network directly
    }

    try {
      const ok = await pushRow(entry);
      if (!ok) throw new Error('insert_failed');
      if (queued) {
        const rest = (await readQueue(payload.user_id)).filter((e) => e.id !== entry.id);
        await writeQueue(payload.user_id, rest).catch(() => {});
        emit(changeListeners);
      }
      return { queued: true, synced: true, shiftId: entry.id };
    } catch {
      return { queued, synced: false, shiftId: queued ? entry.id : null };
    }
  });
}

/** Push the signed-in user's stranded rows. Safe to call often; no-ops when empty. */
export function flushShiftQueue(): Promise<number> {
  return exclusive(async () => {
    let userId: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user.id;
    } catch {
      return 0;
    }
    if (!userId) return 0;
    await migrateLegacy(userId);
    const q = await readQueue(userId);
    if (q.length === 0) return 0;
    let flushed = 0;
    const remaining: QueuedShift[] = [];
    for (const entry of q) {
      if (await pushRow(entry)) flushed++;
      else remaining.push(entry);
    }
    await writeQueue(userId, remaining).catch(() => {});
    if (flushed > 0) emit(flushListeners);
    emit(changeListeners);
    return flushed;
  });
}

/** How many of this user's shifts are saved on the phone, waiting to sync. */
export async function pendingShiftCount(userId: string): Promise<number> {
  return (await readQueue(userId)).length;
}

/**
 * Remove every local trace of this user's queue — active partition,
 * quarantined blobs, and their share of the legacy queue. Called on account
 * deletion: "delete means delete" includes this phone.
 */
export async function clearLocalQueue(userId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter(
      (k) => k === queueKey(userId) || k.startsWith(`${QUARANTINE_PREFIX}${userId}:`)
    );
    if (mine.length > 0) await AsyncStorage.multiRemove(mine);
    await migrateLegacy(userId); // pulls their legacy entries into the (now gone) partition…
    await AsyncStorage.removeItem(queueKey(userId)); // …and removes them too
  } catch {
    // best effort — deletion of the server account never blocks on local cleanup
  }
  emit(changeListeners);
}

// Retry stranded rows whenever the app comes back to the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    flushShiftQueue().catch(() => {});
  }
});
