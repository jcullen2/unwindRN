import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useShifts, useTotals } from '@/lib/queries';
import { Shift } from '@/lib/supabase';
import { colors, radius, serif, space, type } from '@/theme';

function formatHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

/** Mood 1–5 rendered as a small dot fading from muted to amber. */
const MOOD_DOT: Record<number, string> = {
  1: '#5B5E85',
  2: '#8A7A6A',
  3: '#B08D52',
  4: '#D09A46',
  5: '#E9A83F',
};

function TotalsHeader({ shifts, hours }: { shifts: number; hours: number }) {
  return (
    <View style={styles.totalsRow}>
      <View style={styles.totalCard}>
        <Text style={styles.totalNumber} adjustsFontSizeToFit numberOfLines={1}>
          {shifts}
        </Text>
        <Text style={styles.totalLabel}>{shifts === 1 ? 'SHIFT' : 'SHIFTS'}</Text>
      </View>
      <View style={styles.totalCard}>
        <Text style={styles.totalNumber} adjustsFontSizeToFit numberOfLines={1}>
          {formatHours(hours)}
        </Text>
        <Text style={styles.totalLabel}>HOURS</Text>
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
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.elevated }]}>
      <View style={styles.rowHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
          {shift.mood != null && (
            <View style={[styles.moodDot, { backgroundColor: MOOD_DOT[shift.mood] }]} />
          )}
          <Text style={[type.body, { fontWeight: '600' }]}>{date}</Text>
        </View>
        {meta.length > 0 && <Text style={type.caption}>{meta}</Text>}
      </View>
      {shift.win.length > 0 && (
        <Text style={[type.secondary, { marginTop: space(1.5) }]} numberOfLines={2}>
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

  const sections = useMemo(() => {
    const byMonth = new Map<string, Shift[]>();
    for (const s of shifts ?? []) {
      const key = format(parseISO(s.shift_date), 'MMMM yyyy');
      const bucket = byMonth.get(key);
      if (bucket) bucket.push(s);
      else byMonth.set(key, [s]);
    }
    return [...byMonth.entries()].map(([title, data]) => ({ title, data }));
  }, [shifts]);

  const addShift = () =>
    router.push({ pathname: '/shift-form', params: { mode: 'manual' } });

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        stickySectionHeadersEnabled={false}
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
              style={{ marginBottom: space(2) }}
            />
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: space(5),
    paddingHorizontal: space(3),
    alignItems: 'center',
  },
  totalNumber: {
    fontFamily: serif,
    fontSize: 44,
    lineHeight: 52,
    color: colors.amber,
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    ...type.overline,
    marginTop: space(1),
  },
  sectionHeader: {
    ...type.overline,
    marginTop: space(5),
    marginBottom: space(2),
    marginLeft: space(1),
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
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(6),
    paddingBottom: space(20),
  },
});
