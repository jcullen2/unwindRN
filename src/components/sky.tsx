/**
 * <Sky/> — the Deep Ward petrol night. One treatment on every screen:
 * a top→bottom petrol gradient + an amber afterglow radial anchored at the
 * bottom + 5% grain. `glowBoost` raises the afterglow for wrapped/milestone.
 * The bucket props are kept as no-ops for backward compatibility.
 */
import { Canvas, FractalNoise, Rect } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { sky, SkyBucket } from '@/theme/tokens';

type Props = {
  children?: ReactNode;
  forceBucket?: SkyBucket; // ignored — the sky is a single petrol treatment now
  glowBoost?: boolean;
};

export function Sky({ children, glowBoost }: Props) {
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== dims.w || height !== dims.h) setDims({ w: width, h: height });
  };

  const { w, h } = dims;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <LinearGradient colors={sky.stops} locations={sky.positions} style={StyleSheet.absoluteFill} />
      {/* Afterglow: ellipse 65% × 100% at 50% 100%. Approximated with a wide,
          soft radial via a positioned gradient block along the bottom. */}
      <View style={styles.afterglowWrap} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(255,140,90,.07)', glowBoost ? 'rgba(255,182,92,.30)' : 'rgba(255,182,92,.18)']}
          locations={[0.28, 0.6, 1]}
          style={styles.afterglow}
        />
      </View>
      {w > 0 && h > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0} y={0} width={w} height={h} opacity={0.045} blendMode="overlay">
            <FractalNoise freqX={0.9} freqY={0.9} octaves={3} />
          </Rect>
        </Canvas>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090F0E' },
  afterglowWrap: {
    position: 'absolute',
    left: '-20%',
    right: '-20%',
    bottom: '-24%',
    height: '52%',
    alignItems: 'center',
  },
  afterglow: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  content: { flex: 1 },
});
