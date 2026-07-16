import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuietButton, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { space, spring } from '@/theme/tokens';

const LINES: Record<number, string> = {
  1: 'Shift #1. The record starts here.',
  5: 'Five shifts down. Insights just lit up.',
  10: 'Ten shifts, written and kept.',
  25: 'Twenty-five shifts carried, processed, kept.',
  50: 'Fifty shifts. That’s a lot of people who had you.',
  100: 'One hundred shifts. A career is being written here.',
  250: 'Two hundred fifty. Few ever see what you’ve seen.',
  500: 'Five hundred shifts. This record is a life’s work.',
};

export default function MilestoneScreen() {
  const { count } = useLocalSearchParams<{ count?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const n = Number(count) || 1;

  const scale = useSharedValue(reduced ? 1 : 0.88);
  const opacity = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    scale.value = withSpring(1, spring);
    opacity.value = withTiming(1, { duration: 450 });
  }, [scale, opacity, reduced]);

  const enter = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Sky glowBoost>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + space(8),
          paddingHorizontal: space(8),
        }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ alignItems: 'center' }, enter]}>
            <T v="overline" style={{ letterSpacing: 8 }}>
              Shift
            </T>
            <T v="milestone" adjustsFontSizeToFit numberOfLines={1} style={{ marginTop: space(1) }}>
              #{n}
            </T>
            <T
              v="body"
              style={{
                fontSize: 19,
                lineHeight: 29,
                textAlign: 'center',
                maxWidth: 300,
                marginTop: space(6),
              }}>
              {LINES[n] ?? `${n.toLocaleString()} shifts in the record. All yours.`}
            </T>
          </Animated.View>
        </View>
        <QuietButton title="Keep going" onPress={() => router.dismissAll()} />
      </View>
    </Sky>
  );
}
