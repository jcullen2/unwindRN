/**
 * The career estimate — one source of truth.
 *
 * Onboarding, the wrapped story, the home tiles and the marketing site all
 * quote these numbers, so the math lives here and nowhere else. Everything
 * derived from years-at-the-bedside is an ESTIMATE and always wears the ~;
 * everything she actually logs is exact and never does.
 */

export type Pattern = 'Days' | 'Nights' | 'Rotating';

/**
 * Shifts per year by pattern. Three twelves a week is the standard full-time
 * line (~156/yr); these sit just under it to absorb PTO, orientation weeks and
 * the odd cancelled shift, and nights run slightly fewer than days because
 * night lines are typically scheduled lighter.
 */
export const SHIFTS_PER_YEAR: Record<Pattern, number> = {
  Days: 152,
  Nights: 144,
  Rotating: 148,
};

/** Roughly what share of her shifts are nights, by pattern. */
export const NIGHT_SHARE: Record<Pattern, number> = {
  Days: 0.05,
  Nights: 0.95,
  Rotating: 0.4,
};

/** Miles on her feet per twelve. Pedometer studies land nurses around 4–5. */
const MILES_PER_SHIFT = 4;

export const PATTERNS: Pattern[] = ['Days', 'Nights', 'Rotating'];

export type CareerEstimate = {
  shifts: number;
  hours: number;
  nights: number;
  /** Hours expressed as whole days — 8,880 h is 370 days on the floor. */
  days: number;
  /** …and as a fraction of a calendar year, for the "a year of your life" line. */
  years: number;
  miles: number;
};

export function estimateCareer(
  yearsIn: number,
  pattern: Pattern,
  usualHours: number
): CareerEstimate {
  const shifts = Math.round(yearsIn * SHIFTS_PER_YEAR[pattern]);
  const hours = Math.round(shifts * usualHours);
  return {
    shifts,
    hours,
    nights: Math.round(shifts * NIGHT_SHARE[pattern]),
    days: Math.round(hours / 24),
    years: hours / 8_760,
    miles: Math.round(shifts * MILES_PER_SHIFT),
  };
}

const LA_TO_NY = 2_790;

/**
 * A true, checkable comparison for a distance. Nurses have heard "you walk a
 * lot" — a named place they can picture is what makes it land.
 *
 * Past coast-to-coast the anchor multiplies rather than topping out: a nurse
 * thirty years in has walked roughly six of them, and handing her the same
 * line as a five-year nurse would understate her by 6x.
 */
export function milesLandmark(miles: number): string | null {
  if (miles >= LA_TO_NY * 2) {
    return `Los Angeles to New York, ${Math.floor(miles / LA_TO_NY)} times over`;
  }
  const marks: [number, string][] = [
    [LA_TO_NY, 'farther than walking Los Angeles to New York'],
    [2_190, 'the whole Appalachian Trail, end to end'],
    [1_000, 'Chicago to Miami on foot'],
    [500, 'the Camino de Santiago, end to end'],
    [100, 'a hundred miles on your feet'],
  ];
  return marks.find(([m]) => miles >= m)?.[1] ?? null;
}
