/**
 * <Sky/> — DESIGN.md §2. Every screen renders inside it: time-reactive
 * vertical gradient + low afterglow radial + 5% fractal grain. Never flat.
 */
import {
  Canvas,
  FractalNoise,
  Group,
  Rect,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { bucketForHour, sky, SkyBucket } from '@/theme/tokens';

type Props = {
  children?: ReactNode;
  /** Testing hook — pins the bucket regardless of clock. */
  forceBucket?: SkyBucket;
  /** Milestone/Wrapped screens may raise the afterglow (§2). */
  glowBoost?: boolean;
};

export function Sky({ children, forceBucket, glowBoost }: Props) {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const bucket = forceBucket ?? bucketForHour(new Date().getHours());
  const spec = sky[bucket];

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== dims.w || height !== dims.h) setDims({ w: width, h: height });
  };

  const { w, h } = dims;
  // ellipse 130% × 42% at 50% 112% — drawn as a radial in y-squashed space
  const rx = w * 0.65;
  const squash = (h * 0.21) / (w * 0.65 || 1);
  const cy = h * 1.12;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <LinearGradient
        colors={spec.stops}
        locations={spec.positions}
        style={StyleSheet.absoluteFill}
      />
      {w > 0 && h > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Group
            transform={[{ translateY: cy }, { scaleY: squash }, { translateY: -cy }]}
            opacity={glowBoost ? 1.4 : 1}>
            <Rect x={0} y={0} width={w} height={h * 2}>
              <RadialGradient
                c={vec(w / 2, cy)}
                r={rx}
                colors={[...spec.afterglow]}
                positions={[...spec.afterglowPositions]}
              />
            </Rect>
          </Group>
          <Rect x={0} y={0} width={w} height={h} opacity={0.05} blendMode="overlay">
            <FractalNoise freqX={0.9} freqY={0.9} octaves={3} />
          </Rect>
        </Canvas>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0C0B' },
  content: { flex: 1 },
});
