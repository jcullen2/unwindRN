/**
 * "Last light" — the single source of design truth. Dark only.
 * This app is opened exhausted at 8pm and 7:40am — calm over clever.
 */

export const colors = {
  bg: '#14152B',
  surface: '#20224A',
  elevated: '#2A2D5E',
  line: '#3A3D6B',
  text: '#F4F2EA',
  secondary: '#C9C7DD',
  muted: '#8A8CA8',
  amber: '#E9A83F',
  danger: '#E06C5A',
} as const;

export const radius = {
  md: 12,
  lg: 16,
} as const;

/**
 * Fraunces is reserved for large logbook numerals and the milestone card —
 * everywhere else is the system font. Loaded in the root layout.
 */
export const serif = 'Fraunces-SemiBold';

/** 4pt spacing scale: space(4) = 16 */
export const space = (n: number) => n * 4;

export const type = {
  title: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, color: colors.text },
  heading: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, color: colors.text },
  secondary: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22, color: colors.secondary },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, color: colors.muted },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  /** Overline labels: small caps feel via letterspacing. */
  overline: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 2,
    color: colors.muted,
    textTransform: 'uppercase' as const,
  },
} as const;

/** Navigation theme for expo-router / react-navigation */
export const navTheme = {
  dark: true,
  colors: {
    primary: colors.amber,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.line,
    notification: colors.amber,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};
