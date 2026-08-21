/**
 * Privacy-safe edge logging. Function logs may be read by dashboards, log
 * drains, and support tooling — so they carry only a safe error KIND and a
 * numeric status, never provider bodies, messages, stacks, transcripts, or
 * any text that could echo what a nurse said.
 */

const KINDS = [
  'auth',
  'rate_limited',
  'bad_request',
  'upstream',
  'db',
  'stream',
  'unknown',
] as const;
export type FailureKind = (typeof KINDS)[number];

/** Best-effort numeric status off an unknown error, else 0. Never text. */
export function errorStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === 'number' && Number.isFinite(s)) return s;
    const c = (err as { code?: unknown }).code;
    if (typeof c === 'number' && Number.isFinite(c)) return c;
  }
  return 0;
}

/** The only failure logger edge functions use. Shape-fixed; content-free. */
export function logFailure(at: string, kind: FailureKind, err?: unknown): void {
  console.error(JSON.stringify({ at, kind, status: err === undefined ? 0 : errorStatus(err) }));
}
