import { describe, expect, it } from 'vitest';

import { scrubField, scrubPHI } from '@/lib/scrub';
import * as edgeTwin from '../../../supabase/functions/debrief-turn/scrub';

// One vector table drives both twins — client and edge — so they cannot drift.
const VECTORS: [input: string, expected: string][] = [
  // structured location/record identifiers (must contain a digit)
  ['room 12 was rough tonight', 'was rough tonight'],
  ['moved to rm 4B before shift change', 'moved to before shift change'],
  ['bed 3 coded at 0400', 'coded at'],
  ['her chart said MRN 00482', 'her chart said'],
  ['medical record number 12345 flagged', 'flagged'],
  // plain prose with the same words is never touched
  ['the unit was slammed all night', 'the unit was slammed all night'],
  ['room mom stayed the whole time', 'room mom stayed the whole time'],
  // contact details
  ['family said call 313-555-0142 anytime', 'family said call anytime'],
  ['dad left his email dad@example.com with us', 'dad left his email with us'],
  // government / date identifiers
  ['ssn on file 123-45-6789', 'ssn on file'],
  ['DOB 3/14/2019 per the chart', 'per the chart'],
  // patient-anchored names — anchor survives, name goes
  ['patient Ramirez coded twice', 'the patient coded twice'],
  ["Mrs. Chen's family stayed late", 'the patient family stayed late'],
  ['baby Amara rang the bell today', 'the baby rang the bell today'],
  // colleagues are NOT patients — venting about staff is a legitimate note
  ['Dr. Kowalski ignored my page twice', 'Dr. Kowalski ignored my page twice'],
  // long digit runs
  ['she was in 40312 for a week', 'she was in for a week'],
  // clean text passes through untouched
  ['good save on a hard day', 'good save on a hard day'],
];

describe('scrubPHI', () => {
  it.each(VECTORS)('%s → %s', (input, expected) => {
    expect(scrubPHI(input)).toBe(expected);
  });

  it('passes null and empty through', () => {
    expect(scrubPHI(null)).toBeNull();
    expect(scrubPHI('')).toBe('');
  });

  it('returns null when nothing survivable remains', () => {
    expect(scrubPHI('MRN 00482')).toBeNull();
  });

  it('tidies doubled spaces and orphaned punctuation', () => {
    expect(scrubPHI('rough one in room 12 , but we held')).toBe('rough one in, but we held');
  });
});

describe('edge twin parity (supabase/functions/debrief-turn/scrub.ts)', () => {
  it('produces identical output for every vector', () => {
    for (const [input] of VECTORS) {
      expect(edgeTwin.scrubPHI(input)).toBe(scrubPHI(input));
    }
    expect(edgeTwin.scrubPHI(null)).toBeNull();
    expect(edgeTwin.scrubPHI('MRN 00482')).toBeNull();
  });
});

describe('scrubField', () => {
  it('flags changed text so the UI can ask for a re-approve', () => {
    const r = scrubField('patient Ramirez coded twice');
    expect(r.changed).toBe(true);
    expect(r.text).toBe('the patient coded twice');
  });

  it('leaves clean text unflagged', () => {
    const r = scrubField('good save on a hard day');
    expect(r.changed).toBe(false);
    expect(r.text).toBe('good save on a hard day');
  });

  it('treats whitespace-only input as unchanged empty', () => {
    expect(scrubField('   ')).toEqual({ text: '', changed: false });
  });

  it('collapses to empty (changed) when everything was identifying', () => {
    expect(scrubField('MRN 00482')).toEqual({ text: '', changed: true });
  });
});
