/**
 * The floating glass nav pill — Deep Ward. Four unlabeled icon tabs
 * (Home · Journal · Insights · Profile), active = ink stroke, inactive = 40%
 * dim. The debrief is launched from Home, not the nav. A non-interactive
 * lantern emblem is available but hidden by default (branding, never a button).
 */
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { glass, ink, palette, radius } from '@/theme/tokens';

const ICON_PATHS: Record<string, string> = {
  index: 'M3 10 L10 3.5 L17 10 M5 8.5 V16.5 H15 V8.5', // home
  logbook: 'M4.5 3.5 H14 A1.8 1.8 0 0 1 15.8 5.3 V16.5 H6.3 A1.8 1.8 0 0 1 4.5 14.7 Z M7.5 7.5 H12.5 M7.5 10.5 H11', // journal
  insights: 'M3.5 16.5 L8 10.5 L11.5 13 L16.5 5.5 M13.5 5.5 H16.5 V8.5', // trend
  profile: 'M10 9.5 a3.1 3.1 0 1 0 0-6.2 a3.1 3.1 0 0 0 0 6.2 M4 16.5 C4.8 13.4 7.1 11.8 10 11.8 C12.9 11.8 15.2 13.4 16 16.5',
};

// Parsed once. The icons never change, and Skia paths are native objects —
// re-parsing them every render allocated four of them per tab switch.
const ICONS: Record<string, ReturnType<typeof Skia.Path.MakeFromSVGString>> = Object.fromEntries(
  Object.entries(ICON_PATHS).map(([k, d]) => [k, Skia.Path.MakeFromSVGString(d)])
);

function TabIcon({ route, active }: { route: string; active: boolean }) {
  const path = ICONS[route];
  if (!path) return null;
  return (
    <Canvas style={{ width: 20, height: 20 }} pointerEvents="none">
      <Path
        path={path}
        style="stroke"
        strokeWidth={1.7}
        strokeCap="round"
        strokeJoin="round"
        color={active ? palette.ink : ink.dim}
      />
    </Canvas>
  );
}

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

const LABELS: Record<string, string> = {
  index: 'Home',
  logbook: 'Journal',
  insights: 'Insights',
  profile: 'Profile',
};

export function NavPill({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 6 }]}>
      <BlurView intensity={18} tint="dark" style={styles.pill}>
        <View style={styles.pillFill} pointerEvents="none" />
        {state.routes.map((route, i) => {
          const active = state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={LABELS[route.name] ?? route.name}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              hitSlop={10}
              style={styles.slot}>
              <TabIcon route={route.name} active={active} />
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 8,
    height: 62,
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
  slot: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
});
