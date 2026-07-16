import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, QuietButton, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { localToday } from '@/lib/api';
import { LOAD_LABELS } from '@/lib/constants';
import { useShifts } from '@/lib/queries';
import { Shift } from '@/lib/supabase';
import { fonts, heat, heatFlipsText, ink, palette, space } from '@/theme/tokens';

type MonthSection = { title: string; stats: string; data: Shift[] };

function LoadDot({ load }: { load: number | null }) {
  if (!load) return null;
  const step = Math.min(4, Math.max(0, load - 1));
  return (
    <View style={[styles.loadDot, { backgroundColor: heat[step] }]}>
      {heatFlipsText(step) && <View style={styles.loadDotCore} />}
    </View>
  );
}

function ShiftRow({ shift, onPress }: { shift: Shift; onPress: () => void }) {
  const isToday = shift.shift_date === localToday();
  const date = format(parseISO(shift.shift_date), 'EEE d');
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ marginBottom: space(2.5) }}>
      {({ pressed }) => (
        <Glass warm={isToday} style={{ opacity: pressed ? 0.85 : 1, padding: space(3.5) }}>
          {shift.is_night && <View style={styles.nightTick} />}
          <View style={styles.rowTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <LoadDot load={shift.load} />
              <T v="body" style={{ fontWeight: '600' }}>
                {date}
              </T>
              {shift.load != null && <T v="caption">{LOAD_LABELS[shift.load - 1]}</T>}
            </View>
            <T v="caption">{Number(shift.hours)}h</T>
          </View>
          {!!shift.win && (
            <T v="secondary" numberOfLines={2} style={{ marginTop: space(1.5) }}>
              {shift.win}
            </T>
          )}
        </Glass>
      )}
    </Pressable>
  );
}

export default function LogbookScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: shifts, isLoading } = useShifts();

  const sections = useMemo<MonthSection[]>(() => {
    const byMonth = new Map<string, Shift[]>();
    for (const s of shifts ?? []) {
      const key = format(parseISO(s.shift_date), 'MMMM yyyy');
      const bucket = byMonth.get(key);
      if (bucket) bucket.push(s);
      else byMonth.set(key, [s]);
    }
    return [...byMonth.entries()].map(([title, data]) => {
      const hrs = data.reduce((sum, s) => sum + Number(s.hours ?? 0), 0);
      return {
        title,
        stats: `${data.length} ${data.length === 1 ? 'shift' : 'shifts'} · ${Math.round(hrs)} hrs`,
        data,
      };
    });
  }, [shifts]);

  return (
    <Sky>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          paddingTop: insets.top + space(4),
          paddingHorizontal: space(5),
          paddingBottom: space(30),
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View style={styles.top}>
            <T v="overline">Logbook</T>
            <QuietButton
              title="Add a shift"
              onPress={() => router.push({ pathname: '/record', params: { mode: 'manual' } })}
              style={{ minHeight: 40, paddingVertical: space(2) }}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.month}>
            <T style={styles.monthName}>{section.title.split(' ')[0]}</T>
            <T v="caption">{section.stats}</T>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <T v="greeting" style={{ textAlign: 'center', fontSize: 24, lineHeight: 32 }}>
                Shift #1 starts the record.
              </T>
              <T v="secondary" style={{ textAlign: 'center', marginTop: space(2) }}>
                Debrief tonight from the flame, or add one by hand — either way, it counts.
              </T>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ShiftRow shift={item} onPress={() => router.push(`/shift/${item.id}`)} />
        )}
      />
    </Sky>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(2),
  },
  month: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space(5),
    marginBottom: space(2.5),
    paddingHorizontal: space(1),
  },
  monthName: {
    fontFamily: fonts.serif500,
    fontSize: 22,
    lineHeight: 28,
    color: ink.text,
  },
  loadDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadDotCore: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.night,
  },
  nightTick: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 4,
    height: 4,
    borderRadius: 1,
    backgroundColor: palette.violet,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(6),
    paddingBottom: space(20),
  },
});
