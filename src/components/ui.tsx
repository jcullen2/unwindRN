import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, space, type } from '@/theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const bg =
    variant === 'primary' ? colors.amber : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.elevated : 'transparent';
  const fg = variant === 'primary' ? colors.bg : variant === 'ghost' ? colors.secondary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[type.button, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      keyboardAppearance="dark"
      {...props}
      style={[styles.field, props.multiline && styles.fieldMultiline, props.style]}
    />
  );
}

export function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space(4),
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: space(3.5),
    paddingHorizontal: space(5),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  label: {
    ...type.caption,
    color: colors.secondary,
    marginBottom: space(1.5),
    marginTop: space(4),
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3),
    minHeight: 48,
  },
  fieldMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
});
