/**
 * Core kit: <T/> type, glass surfaces, flame buttons. DESIGN.md §3–§6.
 * Opaque cards are banned; depth comes from glass, not borders.
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

import { glass, ink, palette, radius, space, type, warmRow } from '@/theme/tokens';

type Variant = keyof typeof type;

export function T({
  v = 'body',
  style,
  children,
  ...rest
}: TextProps & { v?: Variant }) {
  return (
    <Text {...rest} style={[type[v] as TextStyle, style]}>
      {children}
    </Text>
  );
}

/** L1 glass panel: glass.fill, radius 16, inset top-light, no border. */
export function Glass({
  children,
  style,
  warm,
}: {
  children: ReactNode;
  style?: ViewStyle;
  /** The warm exception — today/milestone rows. */
  warm?: boolean;
}) {
  if (warm) {
    return (
      <View style={[styles.glass, styles.clip, style]}>
        <LinearGradient
          colors={[warmRow.from, warmRow.to]}
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
    <View style={[styles.glass, { backgroundColor: glass.fill }, style]}>
      <View style={styles.topLight} />
      {children}
    </View>
  );
}

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
      style={({ pressed }) => [
        styles.flameBtn,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
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
      style={({ pressed }) => [
        styles.quietBtn,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <View style={styles.topLight} />
      <Text style={[type.button, { color: tone === 'bone' ? ink.text : ink.dim }]}>{title}</Text>
    </Pressable>
  );
}

/** Glass text field shell (fields fill live during record assembly). */
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
      style={[
        styles.glass,
        { backgroundColor: glass.fill, padding: space(3.5), opacity: dimmed ? 0.55 : 1 },
        style,
      ]}>
      <View style={styles.topLight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: radius.lg,
    padding: space(4),
    overflow: 'hidden',
  },
  clip: { overflow: 'hidden' },
  topLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: glass.hi,
  },
  flameBtn: {
    borderRadius: radius.md + 2,
    paddingVertical: space(3.5),
    paddingHorizontal: space(5),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: palette.flame,
    shadowColor: palette.flame,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
  },
  quietBtn: {
    borderRadius: radius.md + 2,
    paddingVertical: space(3.5),
    paddingHorizontal: space(5),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: glass.fill,
    overflow: 'hidden',
  },
});
