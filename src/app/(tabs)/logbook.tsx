import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useShifts, useTotals } from '@/lib/queries';
import { Shift } from '@/lib/supabase';
import { colors, radius, space, type } from '@/theme';

function formatHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

function TotalsHeader({ shifts, hours }: { shifts: number; hours: number }) {
  return (
    <View style={styles.totalsRow}>
      <View style={styles.totalCard}>
        <Text style={styles.totalNumber}>{shifts}</Text>
        <Text style={type.caption}>{shifts === 1 ? 'shift' : 'shifts'}</Text>
      </View>
      <View style={styles.totalCard}>
        <Text style={styles.totalNumber}>{formatHours(hours)}</Text>
        <Text style={type.caption}>hours</Text>
      </View>
    </View>
  );
}

function ShiftRow({ shift, onPress }: { shift: Shift; onPress: () => void }) {
  const date = format(parseISO(shift.shift_date), 'EEE, MMM d');
  const meta = [
    shift.hours != null ? `${formatHours(Number(shift.hours))}h` : null,
    shift.unit,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <View style={styles.rowHeader}>
        <Text style={[type.body, { fontWeight: '600' }]}>{date}</Text>
        {meta.length > 0 && <Text style={type.caption}>{meta}</Text>}
      </View>
      {shift.win.length > 0 && (
        <Text style={[type.secondary, { marginTop: space(1) }]} numberOfLines={2}>
          {shift.win}
        </Text>
      )}
    </Pressable>
  );
}

export default function LogbookScreen() {
  const router = useRouter();
  const { data: shifts, isLoading } = useShifts();
  const { data: totals } = useTotals();

  const addShift = () =>
    router.push({ pathname: '/shift-form', params: { mode: 'manual' } });

  return (
    <Screen>
      <FlatList
        data={shifts ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10), flexGrow: 1 }}
        ListHeaderComponent={
          <>
            <TotalsHeader
              shifts={totals?.total_shifts ?? 0}
              hours={totals?.total_hours ?? 0}
            />
            <Button
              title="Add shift"
              variant="secondary"
              onPress={addShift}
              style={{ marginBottom: space(4) }}
            />
          </>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={[type.heading, { textAlign: 'center' }]}>
                Shift #1 starts your record.
              </Text>
              <Text style={[type.secondary, { textAlign: 'center', marginTop: space(2) }]}>
                Debrief a shift or add one by hand — either way, it counts.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ShiftRow shift={item} onPress={() => router.push(`/shift/${item.id}`)} />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalsRow: {
    flexDirection: 'row',
    gap: space(3),
    marginBottom: space(3),
  },
  totalCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space(4),
    alignItems: 'center',
  },
  totalNumber: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    color: colors.amber,
    fontVariant: ['tabular-nums'],
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space(4),
    marginBottom: space(2.5),
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(6),
    paddingBottom: space(20),
  },
});
