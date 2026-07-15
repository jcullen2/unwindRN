export const SPECIALTIES = [
  'Pediatric Oncology',
  'Emergency',
  'ICU',
  'Med-Surg',
  'L&D',
  'OR',
  'Psych/Behavioral',
  'Other',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const MILESTONES = [1, 10, 25, 50, 100, 250, 500] as const;

export const CRISIS_COPY =
  "You matter. If you're in crisis, call or text 988 (Suicide & Crisis Lifeline) — free, 24/7, confidential.";

export const NOT_THERAPY_COPY = 'unwindRN is not therapy or medical care.';
