/**
 * The locked "Deep Ward" mark — Florence Nightingale's caged hand-lantern.
 * Geometry is copied verbatim from design/brand/lantern_mark_*.svg — never
 * redrawn. The original flame path lives seated low inside the cage and NEVER
 * appears without the lantern body.
 */
import { Canvas, ImageSVG, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { palette } from '@/theme/tokens';

const FLAME = 'M60 67C44 52 64 42 64 18C84 35 82 53 60 67Z';
// cage: ring handle, tapered top, body rails + base
const CAGE = {
  ring: 'circle',
  top: 'M52 28 L68 28 L75 38 L45 38 Z',
  body: 'M47 38 L43 92 M73 38 L77 92 M39 92 H81 M45 92 L47 102 H73 L75 92',
};

function lanternSvg(w: number, h: number, stroke: string, flame: string, sw: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="32 0 56 104">
    <g transform="translate(34.4 47) scale(0.4 0.55)"><path d="${FLAME}" fill="${flame}"/></g>
    <circle cx="60" cy="18" r="10" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
    <path d="${CAGE.top}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    <path d="${CAGE.body}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/**
 * The full lantern mark. `tone="night"` is the night-on-amber variant for
 * amber surfaces (heavier 6.5 stroke); default is the bone mark on dark.
 */
export function Lantern({ size = 24, tone = 'dark' }: { size?: number; tone?: 'dark' | 'night' }) {
  const w = size;
  const h = (size * 104) / 56;
  const stroke = tone === 'night' ? palette.night : palette.ink;
  const flame = tone === 'night' ? palette.night : palette.amber;
  const sw = tone === 'night' ? 6.5 : size < 20 ? 4 : 3.5;
  const svg = useMemo(() => Skia.SVG.MakeFromString(lanternSvg(w, h, stroke, flame, sw)), [w, h, stroke, flame, sw]);
  if (!svg) return null;
  return (
    <Canvas style={{ width: w, height: h }} pointerEvents="none">
      <ImageSVG svg={svg} x={0} y={0} width={w} height={h} />
    </Canvas>
  );
}

/**
 * Small lantern speaker mark (13–16px) for lines the partner "says" — the
 * cage is kept so the flame never appears alone. Branding only, never a button.
 */
export function LanternGlyph({ size = 13 }: { size?: number }) {
  return <Lantern size={size} tone="dark" />;
}

/** Legacy alias — old call sites pass a `size`; renders the small lantern. */
export function FlameGlyph({ size = 13 }: { size?: number; tint?: 'flame' | 'night' }) {
  return <Lantern size={size} tone="dark" />;
}

/** Legacy alias for the old full mark. */
export function Lamp({ size = 24 }: { size?: number }) {
  return <Lantern size={size} tone="dark" />;
}

/** The wordmark lockup: mark base-aligned to "unwind", RN small + raised amber. */
export function Lockup({ markSize = 13, fontSize = 16 }: { markSize?: number; fontSize?: number }) {
  // Rendered by the kit where <T> is available; this exports the mark only.
  return <Lantern size={markSize} tone="dark" />;
}
