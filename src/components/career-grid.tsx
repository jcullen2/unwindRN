/**
 * The career grid — one cell per shift, drawn in a single Skia canvas.
 *
 * This is the object the whole onboarding is built around: a nurse five years
 * in watches ~740 cells appear, and for the first time her career is a thing
 * with a shape instead of a feeling. Nights are moon-mint, days amber, exactly
 * as they are everywhere else in the app.
 *
 * Performance: the cells are baked into two paths (day, night) and rebuilt
 * only when the counts change — never per frame. The reveal is an animated
 * clip over those static paths, so dragging the year dial stays at 60fps even
 * at a thirty-year career (~4,500 cells).
 */
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { palette } from '@/theme/tokens';

type Props = {
  shifts: number;
  nights: number;
  width: number;
  /** 0→1 reveal, top to bottom. Pass a shared value to animate it. */
  progress?: SharedValue<number>;
  /** Target cell edge in px; the grid picks a column count to fill `width`. */
  cell?: number;
  gap?: number;
  /** Cap the drawn cells so a 30-year career still fits the frame. */
  maxRows?: number;
};

export function CareerGrid({
  shifts,
  nights,
  width,
  progress,
  cell = 7,
  gap = 2.5,
  maxRows = 26,
}: Props) {
  const pitch = cell + gap;
  const cols = Math.max(1, Math.floor((width + gap) / pitch));
  const rows = Math.min(maxRows, Math.max(1, Math.ceil(shifts / cols)));
  const height = rows * pitch - gap;

  // Nights are distributed evenly through the grid rather than clumped at the
  // end — a real career interleaves them, and an even scatter reads as texture
  // instead of as a block.
  const { dayPath, nightPath, framePath } = useMemo(() => {
    const day = Skia.Path.Make();
    const night = Skia.Path.Make();
    const frame = Skia.Path.Make();
    const drawn = Math.min(shifts, cols * rows);
    const nightEvery = nights > 0 ? drawn / nights : 0;
    let nightsPlaced = 0;

    for (let i = 0; i < cols * rows; i++) {
      const x = (i % cols) * pitch;
      const y = Math.floor(i / cols) * pitch;
      const r = Skia.RRectXY(Skia.XYWHRect(x, y, cell, cell), 1.6, 1.6);
      if (i >= drawn) {
        frame.addRRect(r);
        continue;
      }
      const wantNights = nightEvery > 0 ? Math.floor(i / nightEvery) + 1 : 0;
      if (nightsPlaced < wantNights && nightsPlaced < nights) {
        night.addRRect(r);
        nightsPlaced++;
      } else {
        day.addRRect(r);
      }
    }
    return { dayPath: day, nightPath: night, framePath: frame };
  }, [shifts, nights, cols, rows, pitch, cell]);

  // Built as a plain object rather than Skia's rect() helper: this runs on the
  // UI thread and must not depend on a non-worklet factory.
  const clip = useDerivedValue(() => ({
    x: 0,
    y: 0,
    width,
    height: height * (progress ? progress.value : 1),
  }));

  return (
    <Canvas style={{ width, height }}>
      {/* the unworked remainder of the frame, barely there */}
      <Path path={framePath} color={palette.ink} opacity={0.05} />
      <Group clip={clip}>
        <Path path={dayPath} color={palette.amber} opacity={0.85} />
        <Path path={nightPath} color={palette.moon} opacity={0.9} />
      </Group>
    </Canvas>
  );
}
