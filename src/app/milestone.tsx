import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { colors, space, type } from '@/theme';

export default function MilestoneScreen() {
  const { count } = useLocalSearchParams<{ count?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const n = Number(count) || 1;

  return (
    <Screen
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom + space(8),
        paddingHorizontal: space(8),
      }}>
      <View style={styles.center}>
        <Text style={styles.kicker}>SHIFT</Text>
        <Text style={styles.numeral} adjustsFontSizeToFit numberOfLines={1}>
          #{n}
        </Text>
        <Text style={styles.subtitle}>
          {n === 1 ? 'Shift #1 starts your record.' : `${n} shifts in your logbook. All yours.`}
        </Text>
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
    ...type.caption,
    color: colors.secondary,
    letterSpacing: 6,
    fontWeight: '600',
  },
  numeral: {
    fontSize: 148,
    lineHeight: 160,
    fontWeight: '800',
    color: colors.amber,
    letterSpacing: -4,
    marginVertical: space(2),
  },
  subtitle: {
    ...type.body,
    fontSize: 18,
    color: colors.secondary,
    textAlign: 'center',
  },
});
