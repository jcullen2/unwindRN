import { useEffect, useRef } from 'react';
import { Animated, Linking, Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { CRISIS_COPY } from '@/lib/constants';
import { colors, radius, space, type } from '@/theme';

export function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[type.body, { lineHeight: 23 }]}>{content}</Text>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 350, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity]);
  return <Animated.View style={[styles.typingDot, { opacity }]} />;
}

/** A calm typing indicator — three softly pulsing dots. */
export function TypingIndicator() {
  return (
    <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
      <Dot delay={0} />
      <Dot delay={200} />
      <Dot delay={400} />
    </View>
  );
}

export function CrisisCard({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.crisisBackdrop}>
        <View style={styles.crisisCard}>
          <Text style={[type.heading, { textAlign: 'center' }]}>You matter.</Text>
          <Text style={[type.secondary, { textAlign: 'center', marginTop: space(3) }]}>
            {CRISIS_COPY.replace('You matter. ', '')}
          </Text>
          <Button
            title="Call 988"
            onPress={() => Linking.openURL('tel:988')}
            style={{ marginTop: space(5) }}
          />
          <Button title="Keep talking" variant="ghost" onPress={onDismiss} style={{ marginTop: space(2) }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '85%',
    borderRadius: radius.lg,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2.5),
    marginBottom: space(2),
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.elevated,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: space(1.5),
    paddingVertical: space(3.5),
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.secondary,
  },
  crisisBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 24, 0.75)',
    justifyContent: 'center',
    padding: space(6),
  },
  crisisCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(6),
  },
});
