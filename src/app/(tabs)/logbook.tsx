import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameGlyph } from '@/brand';
import { Heatfield } from '@/components/heatfield';
import { Glass, QuietButton, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { localToday } from '@/lib/api';
import { LOAD_LABELS } from '@/lib/constants';
import { useShifts } from '@/lib/queries';
import { Shift, supabase } from '@/lib/supabase';
import { fonts, glass, heat, ink, palette, space } from '@/theme/tokens';

function useMonthCaption(month: string, enabled: boolean) {
  return useQuery({
    queryKey: ['month-caption', month],
    enabled,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.functions.invoke('month-caption', {
        body: { month },
      });
      if (error) return null;
      return typeof data?.caption === 'string' ? data.caption : null;
    },
  });
}

function LoadDot({ load }: { load: number | null }) {
  if (!load) return null;
  return <View style={[styles.loadDot, { backgroundColor: heat[load - 1] }]} />;
}

function ShiftRow({ shift, onPress }: { shift: Shift; onPress: () => void }) {
  const isToday = shift.shift_date === localToday();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ marginBottom: space(2.5) }}>
      {({ pressed }) => (
        <Glass warm={isToday} style={{ opacity: pressed ? 0.85 : 1, padding: space(3.5) }}>
          {shift.is_night && <View style={styles.nightTick} />}
          <View style={styles.rowTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <LoadDot load={shift.load} />
              <T v="body" style={{ fontWeight: '600' }}>
                {format(parseISO(shift.shift_date), 'EEE d')}
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

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [view, setView] = useState<'field' | 'list'>('field');

  const monthKey = `${cursor.y}-${String(cursor.m).padStart(2, '0')}`;
  const monthShifts = useMemo(
    () => (shifts ?? []).filter((s) => s.shift_date.startsWith(monthKey)),
    [shifts, monthKey]
  );
  const monthHours = monthShifts.reduce((s, r) => s + Number(r.hours ?? 0), 0);
  const monthName = format(new Date(cursor.y, cursor.m - 1, 1), 'MMMM');

  const { data: caption } = useMonthCaption(monthKey, monthShifts.length >= 3);

  const step = (dir: -1 | 1) => {
    setCursor((c) => {
      let m = c.m + dir;
      let y = c.y;
      if (m === 0) {
        m = 12;
        y--;
      } else if (m === 13) {
        m = 1;
        y++;
      }
      return { y, m };
    });
  };

  const openShift = (s: Shift) => router.push(`/shift/${s.id}`);
  const empty = !isLoading && (shifts?.length ?? 0) === 0;

  return (
    <Sky>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space(4),
          paddingHorizontal: space(5),
          paddingBottom: space(30),
          flexGrow: 1,
        }}>
        <View style={styles.top}>
          <T v="overline">Logbook</T>
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={view === 'field' ? 'Switch to list' : 'Switch to calendar'}
              onPress={() => setView((v) => (v === 'field' ? 'list' : 'field'))}
              style={styles.toggle}>
              <T v="caption" style={{ color: ink.secondary }}>
                {view === 'field' ? 'List' : 'Field'}
              </T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a shift"
              onPress={() => router.push({ pathname: '/record', params: { mode: 'manual' } })}
              style={styles.toggle}>
              <T v="caption" style={{ color: ink.secondary }}>
                Add
              </T>
            </Pressable>
          </View>
        </View>

        {empty ? (
          <View style={styles.empty}>
            <T v="greeting" style={{ fontSize: 24, lineHeight: 32, textAlign: 'center' }}>
              Shift #1 starts the record.
            </T>
            <T v="secondary" style={{ textAlign: 'center', marginTop: space(2) }}>
              Debrief tonight from the flame, or add one by hand — either way, it counts.
            </T>
          </View>
        ) : (
          <>
            <View style={styles.monthRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => step(-1)} hitSlop={12}>
                <T style={{ color: ink.dim, fontSize: 20 }}>‹</T>
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <T style={styles.monthName}>{monthName}</T>
                <T v="caption">
                  {cursor.y} · {monthShifts.length} {monthShifts.length === 1 ? 'shift' : 'shifts'} ·{' '}
                  {Math.round(monthHours)} hrs
                </T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => step(1)} hitSlop={12}>
                <T style={{ color: ink.dim, fontSize: 20 }}>›</T>
              </Pressable>
            </View>

            {view === 'field' ? (
              <Heatfield year={cursor.y} month={cursor.m} shifts={monthShifts} onOpenDay={openShift} />
            ) : (
              <View style={{ marginTop: space(2) }}>
                {monthShifts.length === 0 ? (
                  <T v="whisper" style={{ textAlign: 'center', marginVertical: space(8) }}>
                    Nothing logged this month.
                  </T>
                ) : (
                  monthShifts.map((s) => <ShiftRow key={s.id} shift={s} onPress={() => openShift(s)} />)
                )}
              </View>
            )}

            {caption ? (
              <View style={styles.caption}>
                <View style={{ marginTop: 4 }}>
                  <FlameGlyph size={13} />
                </View>
                <T v="partnerCaption" style={{ flex: 1, fontSize: 14, lineHeight: 22 }}>
                  {caption}
                </T>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(3),
  },
  toggle: {
    backgroundColor: glass.fill,
    borderRadius: 14,
    paddingVertical: space(1.5),
    paddingHorizontal: space(3),
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(3),
    paddingHorizontal: space(1),
  },
  monthName: {
    fontFamily: fonts.serif500,
    fontSize: 24,
    lineHeight: 30,
    color: ink.text,
  },
  caption: {
    flexDirection: 'row',
    gap: space(2.5),
    marginTop: space(5),
    paddingHorizontal: space(1),
  },
  loadDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
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
    paddingTop: space(20),
  },
});
