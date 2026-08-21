import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLocalQueue,
  flushShiftQueue,
  newShiftId,
  onQueueChanged,
  onShiftsSynced,
  pendingShiftCount,
  saveShift,
} from '@/lib/queue';

// ---------------------------------------------------------------------------
// Mocks — an in-memory AsyncStorage, a controllable Supabase, a stub AppState.
// vi.mock calls hoist above the imports; vi.hoisted makes the shared state
// they close over exist first.

const { store, upsertMock, getSessionMock } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  upsertMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('react-native', () => ({
  AppState: { addEventListener: vi.fn() },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    getAllKeys: vi.fn(async () => [...store.keys()]),
    multiRemove: vi.fn(async (ks: string[]) => {
      ks.forEach((k) => store.delete(k));
    }),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ upsert: upsertMock }),
    auth: { getSession: () => getSessionMock() },
  },
}));

const QKEY = (u: string) => `unwindrn_shift_queue_v2:${u}`;
const LEGACY = 'unwindrn_shift_queue_v1';

const payload = (userId: string, extra: object = {}) => ({
  user_id: userId,
  shift_date: '2026-08-21',
  hours: 12,
  ...extra,
});

const online = () => upsertMock.mockResolvedValue({ error: null });
const offline = () => upsertMock.mockResolvedValue({ error: { message: 'network down' } });
const signedIn = (userId: string) =>
  getSessionMock.mockResolvedValue({ data: { session: { user: { id: userId } } } });

beforeEach(() => {
  store.clear();
  upsertMock.mockReset();
  getSessionMock.mockReset();
  signedIn('u1');
  online();
});

// ---------------------------------------------------------------------------

describe('newShiftId', () => {
  it('produces valid, unique v4 UUIDs', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newShiftId()));
    expect(ids.size).toBe(200);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});

describe('saveShift', () => {
  it('online: syncs with a client-generated id and leaves the queue empty', async () => {
    const res = await saveShift(payload('u1'));
    expect(res).toEqual({ queued: true, synced: true, shiftId: expect.any(String) });
    const [row, opts] = upsertMock.mock.calls[0];
    expect(row.id).toBe(res.shiftId);
    expect(opts).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    expect(await pendingShiftCount('u1')).toBe(0);
  });

  it('dead zone: the record is queued on the phone with its id, never lost', async () => {
    offline();
    const res = await saveShift(payload('u1'));
    expect(res.queued).toBe(true);
    expect(res.synced).toBe(false);
    expect(res.shiftId).not.toBeNull();
    expect(await pendingShiftCount('u1')).toBe(1);
    const stored = JSON.parse(store.get(QKEY('u1'))!);
    expect(stored[0].id).toBe(res.shiftId);
  });

  it('retry is idempotent: the flush reuses the SAME row id (duplicate defense)', async () => {
    offline();
    const res = await saveShift(payload('u1'));
    online();
    await flushShiftQueue();
    const flushedRow = upsertMock.mock.calls.at(-1)![0];
    expect(flushedRow.id).toBe(res.shiftId);
  });

  it('phone storage fails but the network works: the record is still safe', async () => {
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    const res = await saveShift(payload('u1'));
    expect(res).toEqual({ queued: true, synced: true, shiftId: expect.any(String) });
  });

  it('phone storage AND network fail: says so honestly instead of implying success', async () => {
    vi.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('disk full'));
    offline();
    const res = await saveShift(payload('u1'));
    expect(res).toEqual({ queued: false, synced: false, shiftId: null });
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (k: string, v: string) => {
      store.set(k, v);
    });
  });

  it('never throws', async () => {
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('boom'));
    upsertMock.mockRejectedValueOnce(new Error('network exploded'));
    await expect(saveShift(payload('u1'))).resolves.toBeDefined();
  });
});

describe('flushShiftQueue', () => {
  it('pushes every stranded row and notifies the sync listeners', async () => {
    offline();
    await saveShift(payload('u1'));
    await saveShift(payload('u1'));
    online();
    const synced = vi.fn();
    const un = onShiftsSynced(synced);
    expect(await flushShiftQueue()).toBe(2);
    expect(await pendingShiftCount('u1')).toBe(0);
    expect(synced).toHaveBeenCalledTimes(1);
    un();
  });

  it('keeps only the rows that still fail', async () => {
    offline();
    await saveShift(payload('u1'));
    await saveShift(payload('u1'));
    upsertMock.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'x' } });
    expect(await flushShiftQueue()).toBe(1);
    expect(await pendingShiftCount('u1')).toBe(1);
  });

  it('does nothing when signed out', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    expect(await flushShiftQueue()).toBe(0);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe('per-account partitions (shared devices)', () => {
  it("one account's flush can never touch another's stranded shifts", async () => {
    offline();
    await saveShift(payload('u1'));
    await saveShift(payload('u2'));
    online();
    signedIn('u1');
    expect(await flushShiftQueue()).toBe(1);
    expect(upsertMock.mock.calls.at(-1)![0].user_id).toBe('u1');
    expect(await pendingShiftCount('u1')).toBe(0);
    expect(await pendingShiftCount('u2')).toBe(1);
  });

  it('adopts the legacy global queue, but only the signed-in owner’s rows', async () => {
    store.set(
      LEGACY,
      JSON.stringify([
        { clientId: 'a', payload: payload('u1') },
        { clientId: 'b', payload: payload('u2') },
      ])
    );
    expect(await flushShiftQueue()).toBe(1);
    expect(upsertMock.mock.calls[0][0].user_id).toBe('u1');
    const legacyLeft = JSON.parse(store.get(LEGACY)!);
    expect(legacyLeft).toHaveLength(1);
    expect(legacyLeft[0].payload.user_id).toBe('u2');
  });
});

describe('quarantine — malformed storage is preserved, never overwritten', () => {
  it('moves unparseable storage aside intact and keeps working', async () => {
    store.set(QKEY('u1'), '{corrupted!!!');
    const res = await saveShift(payload('u1'));
    expect(res.synced).toBe(true);
    const qKeys = [...store.keys()].filter((k) => k.startsWith('unwindrn_shift_queue_bad:u1:'));
    expect(qKeys).toHaveLength(1);
    expect(store.get(qKeys[0])).toBe('{corrupted!!!');
  });

  it('keeps intact entries syncing while quarantining the raw blob', async () => {
    const good = { id: newShiftId(), payload: payload('u1') };
    store.set(QKEY('u1'), JSON.stringify([good, { junk: true }]));
    expect(await flushShiftQueue()).toBe(1);
    expect(upsertMock.mock.calls[0][0].id).toBe(good.id);
    const qKeys = [...store.keys()].filter((k) => k.startsWith('unwindrn_shift_queue_bad:u1:'));
    expect(qKeys).toHaveLength(1);
  });
});

describe('clearLocalQueue — delete means delete, on this phone too', () => {
  it('removes the partition, quarantined blobs, and the owner’s legacy rows', async () => {
    offline();
    await saveShift(payload('u1'));
    store.set('unwindrn_shift_queue_bad:u1:123', 'old corrupt blob');
    store.set(LEGACY, JSON.stringify([{ clientId: 'a', payload: payload('u1') }]));
    await clearLocalQueue('u1');
    expect(await pendingShiftCount('u1')).toBe(0);
    expect([...store.keys()].filter((k) => k.includes('u1'))).toHaveLength(0);
    expect(store.get(LEGACY)).toBeUndefined();
  });
});

describe('queue-change notifications (Home’s waiting-to-sync row)', () => {
  it('fires on save and on flush', async () => {
    const changed = vi.fn();
    const un = onQueueChanged(changed);
    offline();
    await saveShift(payload('u1'));
    const afterSave = changed.mock.calls.length;
    expect(afterSave).toBeGreaterThan(0);
    online();
    await flushShiftQueue();
    expect(changed.mock.calls.length).toBeGreaterThan(afterSave);
    un();
  });
});
