/**
 * The floating glass nav pill + flame orb — DESIGN.md §6.
 * Three unlabeled icons (Home, Logbook, Insights), dim → bone when active;
 * the orb (46px, flame, night glyph, breathing glow) opens /debrief.
 * No labels. No fifth slot.
 */
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameGlyph } from '@/brand';
import { glass, glow, ink, palette, radius } from '@/theme/tokens';

// 20px icons, 1.7 stroke — drawn, not imported (no icon dependency).
const ICON_PATHS: Record<string, string> = {
  index: 'M3 10 L10 3.5 L17 10 M5 8.5 V16.5 H15 V8.5', // home
  logbook: 'M4.5 3.5 H14 A1.8 1.8 0 0 1 15.8 5.3 V16.5 H6.3 A1.8 1.8 0 0 1 4.5 14.7 Z M7.5 7.5 H12.5 M7.5 10.5 H11', // book
  insights: 'M3.5 16.5 L8 10.5 L11.5 13 L16.5 5.5 M13.5 5.5 H16.5 V8.5', // trend
};

function TabIcon({ route, active }: { route: string; active: boolean }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(ICON_PATHS[route] ?? ''), [route]);
  if (!path) return null;
  return (
    <Canvas style={{ width: 20, height: 20 }} pointerEvents="none">
      <Path
        path={path}
        style="stroke"
        strokeWidth={1.7}
        strokeCap="round"
        strokeJoin="round"
        color={active ? palette.bone : ink.dim}
      />
    </Canvas>
  );
}

export function FlameOrb({
  size = 46,
  onPress,
  label = 'Debrief',
}: {
  size?: number;
  onPress: () => void;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    breathe.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [breathe, reduced]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.04 }],
    shadowOpacity: 0.55 + breathe.value * 0.15,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      hitSlop={8}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: palette.flame,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: palette.flame,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 2 },
          },
          orbStyle,
        ]}>
        <FlameGlyph size={size * 0.38} tint="night" />
      </Animated.View>
    </Pressable>
  );
}

// Structural type for the pieces of BottomTabBarProps we use — avoids a
// direct dependency on @react-navigation/bottom-tabs (bundled by expo-router).
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

export function NavPill({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <BlurView intensity={18} tint="dark" style={styles.pill}>
        <View style={styles.pillFill} pointerEvents="none" />
        {state.routes.map((route, i) => {
          const active = state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={route.name === 'index' ? 'Home' : route.name}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              hitSlop={10}
              style={styles.slot}>
              <TabIcon route={route.name} active={active} />
            </Pressable>
          );
        })}
        <View style={styles.orbSlot}>
          <FlameOrb onPress={() => router.push('/debrief')} />
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 10,
    height: 60,
  },
  pillFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: glass.bar,
    borderRadius: radius.pill,
  },
  slot: {
    width: 52,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbSlot: {
    paddingLeft: 6,
    paddingRight: 2,
  },
});
