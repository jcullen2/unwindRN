/**
 * Deep Ward kit: type, glass surfaces, amber actions, chips, the lockup.
 * No borders on content cards — depth is glass + inset top-light. The one
 * amber action per screen is the live/earned one.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Lantern } from '@/brand';
import { chipOn, glass, ink, palette, radius, space, type } from '@/theme/tokens';

type Variant = keyof typeof type;

export function T({ v = 'body', style, children, ...rest }: TextProps & { v?: Variant }) {
  return (
    <Text {...rest} style={[type[v] as TextStyle, style]}>
      {children}
    </Text>
  );
}

/** The wordmark lockup: lantern base-aligned to "unwind", RN small + raised amber. */
export function Lockup({ markSize = 13, fontSize = 16 }: { markSize?: number; fontSize?: number }) {
  return (
    <View style={styles.lockup}>
      <Lantern size={markSize} />
      <Text style={[styles.wm, { fontSize }]}>
        unwind
        <Text style={[styles.wmRN, { fontSize: fontSize * 0.56, top: -fontSize * 0.4 }]}>RN</Text>
      </Text>
    </View>
  );
}

/** Page title + the 26×3 amber rounded dash 7px below it. */
export function PageTitle({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={style}>
      <T v="title">{children}</T>
      <View style={styles.dash} />
    </View>
  );
}

export function Glass({
  children,
  style,
  warm,
}: {
  children: ReactNode;
  style?: ViewStyle;
  warm?: boolean;
}) {
  if (warm) {
    return (
      <View style={[styles.card, styles.clip, style]}>
        <LinearGradient
          colors={['rgba(255,201,126,.12)', 'rgba(255,182,92,.16)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.topLight} />
        {children}
      </View>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: glass.fill }, style]}>
      <View style={styles.topLight} />
      {children}
    </View>
  );
}

/** The one amber action. Gradient fill, night-colored label. */
export function FlameButton({
  title,
  onPress,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.amberWrap, { opacity: disabled ? 0.5 : pressed ? 0.9 : 1 }, style]}>
      <LinearGradient
        colors={[palette.amberHi, palette.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {loading ? (
        <ActivityIndicator color={palette.night} />
      ) : (
        <Text style={[type.button, { color: palette.night }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function QuietButton({
  title,
  onPress,
  disabled,
  style,
  tone = 'bone',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  tone?: 'bone' | 'dim';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.quiet, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}>
      <View style={styles.topLight} />
      <Text style={[type.button, { color: tone === 'bone' ? ink.text : ink.dim }]}>{title}</Text>
    </Pressable>
  );
}

/** A tap chip — selected = amber gradient + border + glow. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}>
      {selected && (
        <LinearGradient
          colors={[chipOn.from, chipOn.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text style={[type.caption, { color: selected ? palette.amber : ink.dim }]}>{label}</Text>
    </Pressable>
  );
}

export function GlassField({
  children,
  style,
  dimmed,
}: {
  children: ReactNode;
  style?: ViewStyle;
  dimmed?: boolean;
}) {
  return (
    <View
      style={[styles.card, { backgroundColor: glass.fill, padding: space(3.5), opacity: dimmed ? 0.55 : 1 }, style]}>
      <View style={styles.topLight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  wm: { fontFamily: 'Bricolage-Medium', color: palette.ink },
  wmRN: { fontFamily: 'Bricolage-SemiBold', color: palette.amber, position: 'relative' },
  dash: { width: 26, height: 3, borderRadius: 2, backgroundColor: palette.amber, marginTop: space(1.75) },
  card: { borderRadius: radius.lg, padding: space(4), overflow: 'hidden' },
  clip: { overflow: 'hidden' },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: glass.hi },
  amberWrap: {
    borderRadius: radius.xl,
    paddingVertical: space(3.75),
    paddingHorizontal: space(5),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    overflow: 'hidden',
    shadowColor: palette.amber,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
  },
  quiet: {
    borderRadius: radius.xl,
    paddingVertical: space(3.75),
    paddingHorizontal: space(5),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: glass.fill,
    overflow: 'hidden',
  },
  chip: {
    borderRadius: radius.md,
    paddingVertical: space(2),
    paddingHorizontal: space(3),
    overflow: 'hidden',
  },
  chipOn: {
    borderWidth: 1,
    borderColor: chipOn.border,
    shadowColor: palette.amber,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
