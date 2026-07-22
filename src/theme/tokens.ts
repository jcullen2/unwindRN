/**
 * unwindRN "Deep Ward" tokens — the v2 brand.
 * Petrol-green night + amber accent; violet retired (night data = moon-mint).
 * Bricolage Grotesque is the single display face. No hex outside this file.
 */

// Palette
export const palette = {
  night: '#090F0E', // text-on-amber / darkest
  ink: '#EAF1EC', // bone-mint, primary text
  moss: '#93A69C', // secondary text
  amber: '#FFB65C', // THE accent — one live action per screen
  amberHi: '#FFC97E', // gradient top for CTAs
  moon: '#9BC7BD', // night-shift data ONLY, never a button
  // legacy aliases (old code paths) mapped onto Deep Ward so nothing renders wrong
  bone: '#EAF1EC',
  flame: '#FFB65C',
  apricot: '#FFB65C',
  ash: '#93A69C',
  violet: '#9BC7BD',
} as const;

export const ink = {
  text: palette.ink,
  secondary: palette.moss,
  dim: 'rgba(234,241,236,.4)',
  faint: 'rgba(234,241,236,.3)',
  whisper: 'rgba(234,241,236,.28)',
  hairline: 'rgba(234,241,236,.06)',
} as const;

export const glass = {
  fill: 'rgba(234,241,236,.055)',
  hi: 'rgba(234,241,236,.09)',
  bar: 'rgba(9,15,14,.8)', // nav bar glass + blur(18)
} as const;

export const glow = {
  flame: 'rgba(255,182,92,.5)',
  apricot: 'rgba(255,182,92,.4)',
} as const;

// The warm exception — memory / on-shift cards
export const warmRow = {
  from: 'rgba(255,201,126,.12)',
  to: 'rgba(255,182,92,.16)',
} as const;

// Selected chip fill (gradient)
export const chipOn = {
  from: 'rgba(255,201,126,.2)',
  to: 'rgba(255,182,92,.08)',
  border: 'rgba(255,182,92,.45)',
  glow: 'rgba(255,182,92,.18)',
} as const;

// Heat scale (calendar & load) — text flips to night on the top two steps
export const heat = [
  'rgba(255,182,92,.08)',
  'rgba(255,182,92,.16)',
  'rgba(255,182,92,.34)',
  'rgba(255,182,92,.60)',
  palette.amber,
] as const;
export const heatFlipsText = (step: number) => step >= 3;

// The sky is one petrol treatment on every screen (no longer time-reactive).
// The bucket API is kept as a compatibility shim so callers don't break.
export type SkyBucket = 'ember' | 'deepNight' | 'dawn' | 'day';

export const sky = {
  stops: ['#152220', '#0D1614', '#090F0E'] as [string, string, string],
  positions: [0, 0.45, 1] as [number, number, number],
  // afterglow radial along the bottom of every screen
  afterglow: ['rgba(255,182,92,.18)', 'rgba(255,140,90,.07)', 'transparent'] as [
    string,
    string,
    string,
  ],
  afterglowPositions: [0, 0.46, 0.72] as [number, number, number],
} as const;

export function bucketForHour(_h: number): SkyBucket {
  return 'deepNight';
}

// Type — Bricolage for display; system sans everywhere else.
export const fonts = {
  display500: 'Bricolage-Medium',
  display600: 'Bricolage-SemiBold',
  display700: 'Bricolage-Bold',
  // legacy names some files still import
  serif500: 'Bricolage-Medium',
  serif600: 'Bricolage-SemiBold',
} as const;

export const type = {
  // Page title + amber dash is drawn by the screen; this is the text style.
  title: { fontFamily: fonts.display600, fontSize: 27, lineHeight: 32, letterSpacing: -0.5, color: palette.ink },
  greeting: { fontFamily: fonts.display500, fontSize: 24, lineHeight: 30, color: palette.ink },
  ask: { fontFamily: fonts.display500, fontSize: 25, lineHeight: 33, color: palette.ink },
  // Wrapped hero numeral
  hero: {
    fontFamily: fonts.display700,
    fontSize: 84,
    lineHeight: 102,
    letterSpacing: -3,
    color: palette.amber,
    textShadowColor: glow.apricot,
    textShadowRadius: 44,
    textShadowOffset: { width: 0, height: 0 },
  },
  // Home career numeral (kept name `monument` for compat)
  monument: {
    fontFamily: fonts.display700,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1,
    color: palette.ink,
    fontVariant: ['tabular-nums'] as const,
  },
  statValue: {
    fontFamily: fonts.display600,
    fontSize: 18,
    lineHeight: 22,
    color: palette.ink,
    fontVariant: ['tabular-nums'] as const,
  },
  teleprompter: { fontFamily: fonts.display500, fontSize: 22, lineHeight: 33, color: palette.ink },
  partnerCaption: { fontSize: 14, lineHeight: 22, color: palette.moss },
  body: { fontSize: 15, lineHeight: 23, color: palette.ink },
  secondary: { fontSize: 13, lineHeight: 20, color: palette.moss },
  caption: { fontSize: 12, lineHeight: 17, color: palette.moss },
  whisper: { fontSize: 10.5, lineHeight: 17, color: ink.whisper },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: ink.dim,
    fontWeight: '600' as const,
  },
  totals: {
    fontFamily: fonts.display700,
    fontSize: 42,
    lineHeight: 48,
    color: palette.amber,
    fontVariant: ['tabular-nums'] as const,
  },
  milestone: {
    fontFamily: fonts.display700,
    fontSize: 88,
    lineHeight: 106,
    letterSpacing: -3,
    color: palette.amber,
    textShadowColor: glow.apricot,
    textShadowRadius: 44,
    textShadowOffset: { width: 0, height: 0 },
  },
  button: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
} as const;

export const radius = { sm: 12, md: 14, lg: 18, xl: 20, pill: 31 } as const;

/** 4pt spacing scale */
export const space = (n: number) => n * 4;

/** Springs only (damping 18, stiffness 180) */
export const spring = { damping: 18, stiffness: 180 } as const;
