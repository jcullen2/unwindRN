/**
 * The lantern, breathing. Lives here rather than inside the sign-in route:
 * three screens use it, and a component exported from a file that expo-router
 * also treats as a screen is a cycle waiting to happen.
 */
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Lantern } from '@/brand';
import { palette } from '@/theme/tokens';

/** The lantern glows on a slow idle pulse (§Motion). */
export function PulsingLantern({ size = 58 }: { size?: number }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [v, reduced]);
  const st = useAnimatedStyle(() => ({ shadowOpacity: 0.5 + v.value * 0.4, shadowRadius: 12 + v.value * 14 }));
  return (
    <Animated.View style={[{ shadowColor: palette.amber, shadowOffset: { width: 0, height: 0 } }, st]}>
      <Lantern size={size} />
    </Animated.View>
  );
}
