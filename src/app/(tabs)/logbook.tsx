/**
 * Logbook (Deep Ward) — two views. Month: the heatfield calendar with a memory
 * card ("one year ago") + this month's top entries beneath it. Journal: the
 * full list. Both open a day → /shift/[id]. Night shifts wear the moon-mint tick.
 */
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Heatfield } from '@/components/heatfield';
import { Lockup, PageTitle, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { localToday } from '@/lib/api';
import { LOAD_LABELS } from '@/lib/constants';
import { useCareerTotals, useShifts } from '@/lib/queries';
import { Shift, supabase } from '@/lib/supabase';
import { glass, heat, ink, palette, space, warmRow } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

function useMonthCaption(month: string, enabled: boolean) {
  return useQuery({
    queryKey: ['month-caption', month],
    enabled,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.functions.invoke('month-caption', { body: { month } });
      if (error) return null;
      return typeof data?.caption === 'string' ? data.caption : null;
    },
  });
}

const dot = (load: number | null) => (load ? heat[load - 1] : glass.hi);
const meta = (s: Shift) => `${Number(s.hours)}h · ${s.load ? LOAD_LABELS[s.load - 1].toLowerCase() : '—'}`;

function EntryRow({ s, onPress }: { s: Shift; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.jRow}>
      {s.is_night && <View style={styles.jNight} />}
      <View style={styles.jTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
          <View style={[styles.jDot, { backgroundColor: dot(s.load) }]} />
          <T v="body" style={{ fontWeight: '600' }}>
            {format(parseISO(s.shift_date), 'EEE d')}
          </T>
        </View>
        <T v="caption">{meta(s)}</T>
      </View>
      {!!s.win && (
        <T v="secondary" numberOfLines={2} style={{ marginTop: space(1.25) }}>
          {s.win}
        </T>
      )}
    </Pressable>
  );
}

export default function LogbookScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: shifts, isLoading } = useShifts();
  const totals = useCareerTotals();

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [view, setView] = useState<'month' | 'journal'>('month');

  const monthKey = `${cursor.y}-${String(cursor.m).padStart(2, '0')}`;
  const monthShifts = useMemo(
    () => (shifts ?? []).filter((s) => s.shift_date.startsWith(monthKey)),
    [shifts, monthKey]
  );
  const monthHours = monthShifts.reduce((s, r) => s + Number(r.hours ?? 0), 0);
  const monthNights = monthShifts.filter((s) => s.is_night).length;
  const monthName = format(new Date(cursor.y, cursor.m - 1, 1), 'MMMM');

  const { data: caption } = useMonthCaption(monthKey, monthShifts.length >= 3);

  // A memory ~one year ago (±10 days) with a win — real data only.
  const memory = useMemo(() => {
    const target = new Date();
    target.setFullYear(target.getFullYear() - 1);
    const withWins = (shifts ?? []).filter((s) => s.win);
    let best: { s: Shift; d: number } | null = null;
    for (const s of withWins) {
      const d = Math.abs(differenceInCalendarDays(parseISO(s.shift_date), target));
      if (d <= 14 && (!best || d < best.d)) best = { s, d };
    }
    return best?.s ?? null;
  }, [shifts]);

  // This month's strongest entries (by load), with wins first.
  const top = useMemo(
    () =>
      [...monthShifts]
        .sort((a, b) => (b.win ? 1 : 0) - (a.win ? 1 : 0) || (b.load ?? 0) - (a.load ?? 0))
        .slice(0, 3),
    [monthShifts]
  );

  const step = (dir: -1 | 1) =>
    setCursor((c) => {
      let m = c.m + dir;
      let y = c.y;
      if (m === 0) { m = 12; y--; }
      else if (m === 13) { m = 1; y++; }
      return { y, m };
    });

  const openShift = (s: Shift) => router.push(`/shift/${s.id}`);
  const empty = !isLoading && (shifts?.length ?? 0) === 0;

  return (
    <Sky>
      <View style={{ flex: 1, paddingTop: insets.top + space(3.5), paddingHorizontal: space(5) }}>
        <View style={styles.header}>
          <Lockup />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a shift"
            onPress={() => router.push({ pathname: '/record', params: { mode: 'manual' } })}
            style={styles.addBtn}>
            <T v="caption" style={{ color: palette.moss }}>
              Add
            </T>
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          <PageTitle>{view === 'month' ? 'Logbook' : 'Journal'}</PageTitle>
          {view === 'month' ? (
            <T v="caption" style={{ color: ink.dim }}>
              {totals.shifts.toLocaleString()} shifts kept
            </T>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setView('month')} style={styles.addBtn}>
              <T v="caption" style={{ color: palette.moss }}>
                ‹ Month
              </T>
            </Pressable>
          )}
        </View>

        {empty ? (
          <View style={styles.empty}>
            <T v="ask" style={{ textAlign: 'center' }}>
              Shift #1 starts the record.
            </T>
            <T v="secondary" style={{ textAlign: 'center', marginTop: space(2) }}>
              Clock out tonight, or add one by hand — either way, it counts.
            </T>
          </View>
        ) : view === 'month' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(28) }}>
            <View style={styles.monthRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => step(-1)} hitSlop={12}>
                <T style={{ color: ink.dim, fontSize: 20 }}>‹</T>
              </Pressable>
              <T style={styles.monthName}>
                {monthName}{' '}
                <T v="caption" style={{ color: ink.dim }}>
                  · {monthShifts.length} shifts · {Math.round(monthHours)}h · {monthNights} nights
                </T>
              </T>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => step(1)} hitSlop={12}>
                <T style={{ color: ink.dim, fontSize: 20 }}>›</T>
              </Pressable>
            </View>

            <Heatfield year={cursor.y} month={cursor.m} shifts={monthShifts} onOpenDay={openShift} />

            <View style={styles.split}>
              <Pressable
                accessibilityRole="button"
                onPress={() => (memory ? openShift(memory) : setView('journal'))}
                style={{ flex: 1.12 }}>
                <View style={styles.memory}>
                  <LinearGradient colors={[warmRow.from, warmRow.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.topLight} />
                  <T style={styles.memoryOver}>{memory ? 'One year ago' : 'The month writes itself'}</T>
                  <T style={styles.memoryQuote}>
                    {memory?.win
                      ? `"${memory.win}"`
                      : caption ?? 'Every shift you put down becomes part of this.'}
                  </T>
                  {memory && (
                    <T style={styles.memoryMeta}>
                      {meta(memory)}
                      {memory.is_night ? ' · ' : ''}
                      {memory.is_night ? <T style={{ color: palette.moon }}>night</T> : null}
                    </T>
                  )}
                  <T style={styles.memoryOpen}>Open journal ›</T>
                </View>
              </Pressable>

              <View style={{ flex: 1, gap: space(2) }}>
                <T v="overline" style={{ paddingLeft: 2 }}>
                  Top entries
                </T>
                {top.length === 0 ? (
                  <View style={styles.topEmpty}>
                    <T v="whisper">Nothing kept yet this month.</T>
                  </View>
                ) : (
                  top.map((s) => (
                    <Pressable key={s.id} accessibilityRole="button" onPress={() => openShift(s)} style={styles.topCard}>
                      <View style={styles.jTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1.5) }}>
                          <View style={[styles.jDot, { backgroundColor: dot(s.load) }]} />
                          <T v="caption" style={{ color: ink.text, fontWeight: '600' }}>
                            {format(parseISO(s.shift_date), 'MMM d')}
                          </T>
                        </View>
                        <T v="whisper">{Number(s.hours)}h</T>
                      </View>
                      {!!s.win && (
                        <T v="whisper" numberOfLines={2} style={{ marginTop: 3, color: palette.moss, lineHeight: 15 }}>
                          {s.win}
                        </T>
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: space(2), paddingBottom: space(28), gap: space(2) }}>
            {(shifts ?? []).map((s) => (
              <EntryRow key={s.id} s={s} onPress={() => openShift(s)} />
            ))}
          </ScrollView>
        )}
      </View>
    </Sky>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { backgroundColor: glass.fill, borderRadius: 14, paddingVertical: space(1.5), paddingHorizontal: space(3) },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: space(3.5), marginBottom: space(3) },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space(3), paddingHorizontal: space(1) },
  monthName: { fontFamily: 'Bricolage-Medium', fontSize: 19, color: palette.ink },
  split: { flexDirection: 'row', gap: space(2), marginTop: space(3.5) },
  memory: { borderRadius: 18, padding: space(3.5), overflow: 'hidden', flex: 1, justifyContent: 'center', minHeight: 132 },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: glass.hi },
  memoryOver: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,182,92,.85)' },
  memoryQuote: { fontFamily: 'Bricolage-Medium', fontSize: 14.5, lineHeight: 21, color: palette.ink, marginTop: space(1.75) },
  memoryMeta: { fontSize: 10.5, color: ink.dim, marginTop: space(1.75) },
  memoryOpen: { fontSize: 10.5, color: 'rgba(234,241,236,.5)', marginTop: space(2) },
  topEmpty: { backgroundColor: glass.fill, borderRadius: 14, padding: space(3), flex: 1, justifyContent: 'center' },
  topCard: { backgroundColor: glass.fill, borderRadius: 14, paddingVertical: space(2.25), paddingHorizontal: space(3), flex: 1, justifyContent: 'center', overflow: 'hidden' },
  jRow: { backgroundColor: glass.fill, borderRadius: 16, paddingVertical: space(3), paddingHorizontal: space(3.75), overflow: 'hidden' },
  jTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jDot: { width: 9, height: 9, borderRadius: 3 },
  jNight: { position: 'absolute', top: 8, right: 8, width: 4, height: 4, borderRadius: 1, backgroundColor: palette.moon },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: space(6), paddingBottom: space(20) },
});
