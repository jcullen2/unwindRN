import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorStatus, logFailure } from '../../../supabase/functions/_shared/log';

describe('privacy-safe edge logging', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs only {at, kind, status} — never message text, stacks, or bodies', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = Object.assign(
      new Error('patient Ramirez said 555-0142 — full transcript attached'),
      { status: 429 }
    );
    logFailure('debrief-turn', 'upstream', err);

    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0] as string;
    expect(JSON.parse(line)).toEqual({ at: 'debrief-turn', kind: 'upstream', status: 429 });
    expect(line).not.toContain('Ramirez');
    expect(line).not.toContain('555');
    expect(line).not.toContain('transcript');
  });

  it('logs status 0 when the error carries no usable status', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logFailure('speak', 'unknown', new Error('anything'));
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toEqual({
      at: 'speak',
      kind: 'unknown',
      status: 0,
    });
  });

  it('errorStatus extracts numeric status or code, else 0', () => {
    expect(errorStatus({ status: 503 })).toBe(503);
    expect(errorStatus({ code: 42 })).toBe(42);
    expect(errorStatus({ code: 'PGRST116' })).toBe(0);
    expect(errorStatus('boom')).toBe(0);
    expect(errorStatus(undefined)).toBe(0);
  });
});
