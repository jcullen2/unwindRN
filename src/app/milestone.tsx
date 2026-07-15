import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { colors, serif, space, type } from '@/theme';

// One short, true line per milestone. Calm over clever.
const LINES: Record<number, string> = {
  1: 'Shift #1 starts your record.',
  10: 'Ten shifts, on the record. This is a habit now.',
  25: 'Twenty-five shifts carried, processed, and kept.',
  50: 'Fifty shifts. That’s a lot of people who had you.',
  100: 'One hundred shifts. A career is being written here.',
  250: 'Two hundred fifty shifts. Few people ever see what you’ve seen.',
  500: 'Five hundred shifts. This logbook is a life’s work.',
};

export default function MilestoneScreen() {
  const { count } = useLocalSearchParams<{ count?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const n = Number(count) || 1;

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Screen
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom + space(8),
        paddingHorizontal: space(8),
      }}>
      <View style={styles.center}>
        <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
          <Text style={styles.kicker}>SHIFT</Text>
          <Text style={styles.numeral} adjustsFontSizeToFit numberOfLines={1}>
            #{n}
          </Text>
          <View style={styles.rule} />
          <Text style={styles.subtitle}>
            {LINES[n] ?? `${n} shifts in your logbook. All yours.`}
          </Text>
        </Animated.View>
      </View>
      <Button title="Keep going" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    ...type.overline,
    color: colors.secondary,
    letterSpacing: 8,
  },
  numeral: {
    fontFamily: serif,
    fontSize: 150,
    lineHeight: 175,
    color: colors.amber,
    marginTop: space(1),
  },
  rule: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.line,
    marginVertical: space(5),
  },
  subtitle: {
    ...type.body,
    fontSize: 19,
    lineHeight: 29,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});
