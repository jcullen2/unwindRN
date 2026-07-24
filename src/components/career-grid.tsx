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
import { View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { T } from '@/components/kit';
import { palette, space } from '@/theme/tokens';

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
  // A career that won't fit at one-cell-per-shift shrinks the cell first, and
  // only once the cells would stop reading as cells does one cell start
  // standing for ten. Truncating instead would put a hero number of ~2,960
  // above a grid of 700 dots — in an app whose promise is an honest count,
  // that is the one error not worth making. `per` is surfaced so the caller
  // can say so on screen.
  let c = cell;
  let cols = Math.max(1, Math.floor((width + gap) / (c + gap)));
  while (c > 4 && Math.ceil(shifts / cols) > maxRows) {
    c -= 0.5;
    cols = Math.max(1, Math.floor((width + gap) / (c + gap)));
  }
  const per = Math.ceil(shifts / (cols * maxRows)) || 1;
  const marks = Math.ceil(shifts / per);
  const nightMarks = Math.round(nights / per);

  const pitch = c + gap;
  const rows = Math.max(1, Math.ceil(marks / cols));
  const height = rows * pitch - gap;

  // Nights are distributed evenly through the grid rather than clumped at the
  // end — a real career interleaves them, and an even scatter reads as texture
  // instead of as a block.
  const { dayPath, nightPath, framePath } = useMemo(() => {
    const day = Skia.Path.Make();
    const night = Skia.Path.Make();
    const frame = Skia.Path.Make();
    const drawn = Math.min(marks, cols * rows);
    const nightEvery = nightMarks > 0 ? drawn / nightMarks : 0;
    let nightsPlaced = 0;

    for (let i = 0; i < cols * rows; i++) {
      const x = (i % cols) * pitch;
      const y = Math.floor(i / cols) * pitch;
      const r = Skia.RRectXY(Skia.XYWHRect(x, y, c, c), 1.6, 1.6);
      if (i >= drawn) {
        frame.addRRect(r);
        continue;
      }
      const wantNights = nightEvery > 0 ? Math.floor(i / nightEvery) + 1 : 0;
      if (nightsPlaced < wantNights && nightsPlaced < nightMarks) {
        night.addRRect(r);
        nightsPlaced++;
      } else {
        day.addRRect(r);
      }
    }
    return { dayPath: day, nightPath: night, framePath: frame };
  }, [marks, nightMarks, cols, rows, pitch, c]);

  // Built as a plain object rather than Skia's rect() helper: this runs on the
  // UI thread and must not depend on a non-worklet factory.
  const clip = useDerivedValue(() => ({
    x: 0,
    y: 0,
    width,
    height: height * (progress ? progress.value : 1),
  }));

  return (
    <View>
      <Canvas style={{ width, height }}>
        {/* the unworked remainder of the frame, barely there */}
        <Path path={framePath} color={palette.ink} opacity={0.05} />
        <Group clip={clip}>
          <Path path={dayPath} color={palette.amber} opacity={0.85} />
          <Path path={nightPath} color={palette.moon} opacity={0.9} />
        </Group>
      </Canvas>
      {per > 1 && (
        <T v="whisper" style={{ marginTop: space(1.5) }}>
          one square = {per} shifts
        </T>
      )}
    </View>
  );
}
