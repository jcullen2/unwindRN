/**
 * unwindRN tokens — every value from DESIGN.md §1–§5.
 * No hex codes anywhere else in the app, ever.
 */

// §1 · Palette
export const palette = {
  night: '#10100F',
  bone: '#F3F0E8',
  flame: '#FF6846',
  apricot: '#FFAD72',
  ash: '#AAA69D',
  violet: '#7670FF',
} as const;

export const ink = {
  text: palette.bone,
  secondary: palette.ash,
  dim: 'rgba(243,240,232,.45)',
  faint: 'rgba(243,240,232,.28)',
  hairline: 'rgba(243,240,232,.07)', // max one per screen
} as const;

export const glass = {
  fill: 'rgba(243,240,232,.055)',
  hi: 'rgba(243,240,232,.09)', // inset top-light 1px
  bar: 'rgba(20,17,14,.55)', // + blur(18) for nav pill / sheets
} as const;

export const glow = {
  flame: 'rgba(255,104,70,.22)',
  apricot: 'rgba(255,173,114,.20)',
} as const;

// §3 · The warm exception (today/milestone rows over glass)
export const warmRow = {
  from: 'rgba(255,173,114,.10)',
  to: 'rgba(255,104,70,.14)',
} as const;

// §4 · Heat scale (calendar & load) — text flips to night on the top two steps
export const heat = [
  'rgba(170,166,157,.03)',
  'rgba(255,173,114,.16)',
  'rgba(255,173,114,.34)',
  'rgba(255,104,70,.55)',
  palette.flame,
] as const;
export const heatFlipsText = (step: number) => step >= 3; // 0-indexed

// §2 · Sky buckets by local hour
export type SkyBucket = 'ember' | 'deepNight' | 'dawn' | 'day';

type SkySpec = {
  stops: [string, string, string];
  positions: [number, number, number];
  afterglow: [string, string, string];
  afterglowPositions: [number, number, number];
};

export const sky: Record<SkyBucket, SkySpec> = {
  ember: {
    stops: ['#221A14', '#161210', '#0D0C0B'],
    positions: [0, 0.38, 1],
    afterglow: [glow.apricot, 'rgba(255,104,70,.07)', 'transparent'],
    afterglowPositions: [0, 0.46, 0.72],
  },
  deepNight: {
    stops: ['#1A1620', '#121016', '#0C0B0E'],
    positions: [0, 0.4, 1],
    afterglow: ['rgba(255,140,90,.18)', 'rgba(118,112,255,.08)', 'transparent'],
    afterglowPositions: [0, 0.46, 0.72],
  },
  dawn: {
    stops: ['#241C15', '#171310', '#0E0D0B'],
    positions: [0, 0.38, 1],
    afterglow: ['rgba(255,173,114,.26)', 'rgba(255,104,70,.08)', 'transparent'],
    afterglowPositions: [0, 0.46, 0.72],
  },
  day: {
    stops: ['#1F1913', '#151110', '#0D0C0B'], // ember at ~80% saturation
    positions: [0, 0.38, 1],
    afterglow: ['rgba(255,173,114,.12)', 'rgba(255,104,70,.05)', 'transparent'],
    afterglowPositions: [0, 0.46, 0.72],
  },
};

export function bucketForHour(h: number): SkyBucket {
  if (h >= 17 && h < 22) return 'ember';
  if (h >= 22 || h < 5) return 'deepNight';
  if (h >= 5 && h < 10) return 'dawn';
  return 'day';
}

// §5 · Type (device points). Fraunces 500/600 ONLY for greetings, monument
// numerals, month names, milestone numerals (+ teleprompter per §5).
export const fonts = {
  serif500: 'Fraunces-Medium',
  serif600: 'Fraunces-SemiBold',
} as const;

export const type = {
  monument: {
    fontFamily: fonts.serif600,
    fontSize: 100,
    lineHeight: 104,
    letterSpacing: -2,
    color: palette.bone,
    fontVariant: ['tabular-nums'] as const,
    textShadowColor: glow.apricot,
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
  },
  greeting: { fontFamily: fonts.serif500, fontSize: 30, lineHeight: 36, color: ink.text },
  teleprompter: { fontFamily: fonts.serif500, fontSize: 22, lineHeight: 33, color: ink.text },
  partnerCaption: { fontSize: 16, lineHeight: 26, color: ink.secondary },
  body: { fontSize: 16, lineHeight: 24, color: ink.text },
  secondary: { fontSize: 14, lineHeight: 21, color: ink.secondary },
  caption: { fontSize: 12, lineHeight: 18, color: ink.dim },
  whisper: { fontSize: 11.5, lineHeight: 17, color: ink.faint },
  overline: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 11 * 0.16,
    textTransform: 'uppercase' as const,
    color: ink.dim,
  },
  totals: {
    fontFamily: fonts.serif600,
    fontSize: 46,
    lineHeight: 52,
    color: palette.apricot,
    fontVariant: ['tabular-nums'] as const,
  },
  milestone: {
    fontFamily: fonts.serif600,
    fontSize: 104,
    lineHeight: 112,
    color: palette.apricot,
    textShadowColor: 'rgba(255,173,114,.35)',
    textShadowRadius: 44,
    textShadowOffset: { width: 0, height: 0 },
  },
  button: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
} as const;

export const radius = { md: 12, lg: 16, pill: 30 } as const;

/** 4pt spacing scale */
export const space = (n: number) => n * 4;

/** Springs only (§7) */
export const spring = { damping: 18, stiffness: 180 } as const;
