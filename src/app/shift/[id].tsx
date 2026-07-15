import { format, parseISO } from 'date-fns';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { useShift } from '@/lib/queries';
import { colors, space, type } from '@/theme';

const MOOD_LABELS: Record<number, string> = {
  1: 'Wrecked',
  2: 'Rough',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

function Section({ label, value, first }: { label: string; value: string; first?: boolean }) {
  if (!value) return null;
  return (
    <View style={{ marginTop: first ? 0 : space(5) }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={[type.body, { marginTop: space(1.5), lineHeight: 25 }]}>{value}</Text>
    </View>
  );
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: shift, isLoading } = useShift(id);

  if (isLoading || !shift) {
    return (
      <Screen style={{ padding: space(6) }}>
        {!isLoading && <Text style={type.secondary}>This shift isn't in your logbook.</Text>}
      </Screen>
    );
  }

  const title = format(parseISO(shift.shift_date), 'EEEE, MMMM d, yyyy');
  const meta = [
    shift.hours != null ? `${Number(shift.hours)} hours` : null,
    shift.unit,
    shift.mood != null ? `Mood: ${MOOD_LABELS[shift.mood] ?? shift.mood}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Screen>
      <Stack.Screen options={{ title: format(parseISO(shift.shift_date), 'MMM d') }} />
      <ScrollView contentContainerStyle={{ padding: space(6) }}>
        <Text style={type.title}>{title}</Text>
        {meta.length > 0 && <Text style={[type.caption, { marginTop: space(2) }]}>{meta}</Text>}

        <Card style={{ marginTop: space(5) }}>
          <Section label="WIN" value={shift.win} first />
          <Section label="LOSS" value={shift.loss} first={!shift.win} />
          <Section label="LESSON" value={shift.lesson} first={!shift.win && !shift.loss} />
          {!shift.win && !shift.loss && !shift.lesson && (
            <Text style={type.secondary}>No notes on this one — it still counts.</Text>
          )}
        </Card>

        <Text style={[type.caption, { marginTop: space(4) }]}>
          {shift.source === 'debrief' ? 'Saved from a debrief' : 'Added manually'}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...type.caption,
    color: colors.amber,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
});
