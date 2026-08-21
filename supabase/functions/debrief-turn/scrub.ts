/**
 * Deterministic PHI scrubber — the edge-side twin.
 *
 * CLAUDE.md law: patients stay unnamed. The debrief prompt deflects and the
 * haiku extractor strips, but neither model is trusted as the only line of
 * defense. This pass removes STRUCTURED identifiers (room/bed/MRN/account
 * numbers, phones, emails, SSNs, DOB-labeled dates, long digit runs) and
 * patient-anchored names ("patient Ramirez", "Mrs. Chen", "baby Amara") from
 * any text before it can be persisted.
 *
 * It is a backstop, not proof: a free-text narrative can still re-identify.
 * Colleague names (including "Dr. …") are deliberately NOT scrubbed — venting
 * about staff is a legitimate note and staff are not patients.
 *
 * TWIN FILE: src/lib/scrub.ts must stay identical.
 * The vitest parity suite runs the same vectors against both — if they drift,
 * tests fail.
 */

const RULES: [RegExp, string][] = [
  // room 12 / rm 4B / bed 3 / MRN 00482 / medical record number 12345 /
  // unit 7 / acct 99-1 — the identifier must contain a digit, so plain prose
  // ("the unit was slammed", "room mom stayed") is never touched.
  [
    /\b(?:room|rm|bed|mrn|medical\s+record(?:\s+number)?|unit|acct|account)\s*#?\s*[A-Za-z-]*\d[A-Za-z0-9-]*/gi,
    '',
  ],
  // phone numbers (US forms)
  [/\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, ''],
  // email addresses
  [/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}\b/g, ''],
  // SSN
  [/\b\d{3}-\d{2}-\d{4}\b/g, ''],
  // DOB-labeled dates ("DOB 3/14/2019", "date of birth: 2019-03-14", "born 3/14/19")
  [/\b(?:dob|date\s+of\s+birth|born(?:\s+on)?)\s*:?\s*[\d/.\-]{4,}/gi, ''],
  // patient-anchored names → the anchor alone ("patient Ramirez" → "the
  // patient"). Titles match either case; the NAME stays case-sensitive so
  // ordinary words never trip it.
  [/\b[Pp](?:atient|t)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:['’]s)?/g, 'the patient'],
  [/\b(?:[Mm]r|[Mm]rs|[Mm]s|[Mm]iss)\.?\s+[A-Z][a-z]+(?:['’]s)?/g, 'the patient'],
  [/\b[Bb]aby\s+[A-Z][a-z]+(?:['’]s)?/g, 'the baby'],
  // bare 4+ digit runs (MRNs, account numbers)
  [/\b\d{4,}\b/g, ''],
];

/** Strip structured identifiers. Returns null when nothing survivable remains. */
export function scrubPHI(text: string | null): string | null {
  if (!text) return text;
  let out = text;
  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, replacement);
  }
  out = out
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
  return out.length ? out : null;
}

/**
 * Scrub a record field the nurse is about to save. `changed` tells the UI to
 * show her the edited text and ask for one more explicit save — the original
 * wording is never persisted and never leaves the screen.
 */
export function scrubField(text: string): { text: string; changed: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { text: trimmed, changed: false };
  const scrubbed = scrubPHI(trimmed) ?? '';
  return { text: scrubbed, changed: scrubbed !== trimmed };
}
