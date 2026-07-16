/**
 * The locked brand (design/brand/README.txt). SVG geometry below is copied
 * verbatim from the supplied files — never rebuilt, never reshaped. The only
 * permitted variations: the flame-only glyph (orb + speaker marks per
 * DESIGN.md §6, night-colored inside the flame orb) and pixel size.
 */
import { Canvas, ImageSVG, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { palette } from '@/theme/tokens';

// design/brand/unwindRN_mark_dark.svg — verbatim paths
const BOWL_PATH =
  'M12 75H108C104 96 88 106 60 106C32 106 16 96 12 75Z';
const FLAME_PATH = 'M60 67C44 52 64 42 64 18C84 35 82 53 60 67Z';

function markSvg(w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 120 124"><g>
    <path d="${BOWL_PATH}" fill="none" stroke="${palette.bone}" stroke-width="7" stroke-linejoin="round"/>
    <path d="${FLAME_PATH}" fill="${palette.flame}"/>
  </g></svg>`;
}

// Flame-only glyph: supplied flame path, viewport cropped tight (geometry untouched)
function flameSvg(w: number, h: number, fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="43 16 42 53">
    <path d="${FLAME_PATH}" fill="${fill}"/>
  </svg>`;
}

/** Full lamp (bowl + flame). Min 24px per brand rules. Home header: 26px. */
export function Lamp({ size = 26 }: { size?: number }) {
  const w = Math.max(24, size);
  const h = (w * 124) / 120;
  const svg = useMemo(() => Skia.SVG.MakeFromString(markSvg(w, h)), [w, h]);
  if (!svg) return null;
  return (
    <Canvas style={{ width: w, height: h }} pointerEvents="none">
      <ImageSVG svg={svg} x={0} y={0} width={w} height={h} />
    </Canvas>
  );
}

/**
 * Flame-only glyph — the orb (night-colored) and the partner's speaker mark
 * (flame, 13–16px). Never loose decoration.
 */
export function FlameGlyph({
  size = 14,
  tint = 'flame',
}: {
  size?: number;
  tint?: 'flame' | 'night';
}) {
  const w = size;
  const h = (size * 53) / 42;
  const fill = tint === 'night' ? palette.night : palette.flame;
  const svg = useMemo(() => Skia.SVG.MakeFromString(flameSvg(w, h, fill)), [w, h, fill]);
  if (!svg) return null;
  return (
    <Canvas style={{ width: w, height: h }} pointerEvents="none">
      <ImageSVG svg={svg} x={0} y={0} width={w} height={h} />
    </Canvas>
  );
}
