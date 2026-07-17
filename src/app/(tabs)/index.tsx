import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanternGlyph } from '@/brand';
import { Glass, Lockup, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { localToday } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCareerTotals, useShifts } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { glass, heat, ink, palette, space } from '@/theme/tokens';

const ACTIVE_KEY = 'unwindrn_active_shift_started_at';

function greeting(name?: string | null): string {
  const h = new Date().getHours();
  const who = name ? `, ${name}` : '';
  if (h >= 5 && h < 12) return `Morning${who}.`;
  if (h >= 12 && h < 17) return `Afternoon${who}.`;
  if (h >= 17 && h < 22) return `Evening${who}.`;
  return `Still up${who}?`;
}

function useDailyLine(hasLogged: boolean) {
  return useQuery({
    queryKey: ['daily-line', localToday()],
    enabled: hasLogged,
    staleTime: 6 * 3600 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.functions.invoke('daily-line', { body: { today: localToday() } });
      if (error) return null;
      return typeof data?.line === 'string' ? data.line : null;
    },
  });
}

function useActiveShift() {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_KEY).then(setStartedAt).catch(() => {});
  }, []);
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [startedAt]);
  const clockIn = useCallback(() => {
    const now = new Date().toISOString();
    setStartedAt(now);
    AsyncStorage.setItem(ACTIVE_KEY, now).catch(() => {});
  }, []);
  const clockOut = useCallback(() => {
    setStartedAt(null);
    AsyncStorage.removeItem(ACTIVE_KEY).catch(() => {});
  }, []);
  const elapsed = startedAt ? (Date.now() - new Date(startedAt).getTime()) / 3_600_000 : 0;
  return { startedAt, elapsed, clockIn, clockOut };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const totals = useCareerTotals();
  const { data: shifts } = useShifts();
  const { data: dailyLine } = useDailyLine(totals.loggedShifts > 0);
  const active = useActiveShift();

  // Keep career count fresh on focus.
  useFocusEffect(useCallback(() => {}, []));

  const usual = Number(profile?.usual_shift_hours ?? 12);
  const approx = totals.estimated ? '~' : '';
  const todayShift = shifts?.find((s) => s.shift_date === localToday());

  // This-week strip (Sun..Sat around today)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return format(d, 'yyyy-MM-dd');
  });
  const byDate = new Map((shifts ?? []).map((s) => [s.shift_date, s]));
  const weekShifts = weekDays.filter((d) => byDate.has(d)).length;
  const weekHours = weekDays.reduce((sum, d) => sum + Number(byDate.get(d)?.hours ?? 0), 0);
  const nightCount = (shifts ?? []).filter((s) => s.is_night).length;
  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Next milestone progress.
  const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 3000];
  const career = totals.shifts;
  const nextMilestone = MILESTONES.find((m) => m > career) ?? career + 500;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= career) ?? 0;
  const milestoneFrac = Math.min(1, (career - prevMilestone) / (nextMilestone - prevMilestone || 1));

  const fmtElapsed = () => {
    const h = Math.floor(active.elapsed);
    const m = Math.floor((active.elapsed - h) * 60);
    return `${h}h ${m}m`;
  };

  const clockOutToDebrief = () => {
    const started = active.startedAt ? new Date(active.startedAt) : null;
    const hours = Math.max(0.5, Math.round(active.elapsed * 2) / 2);
    const night = started ? started.getHours() >= 17 || started.getHours() < 5 : false;
    active.clockOut();
    router.push({ pathname: '/debrief', params: { hours: String(hours), night: night ? '1' : '0' } });
  };

  return (
    <Sky>
      <View style={{ flex: 1, paddingTop: insets.top + space(3.5), paddingHorizontal: space(6) }}>
        <View style={styles.header}>
          <Lockup />
          <T style={{ fontSize: 11, color: palette.moss }}>{format(now, 'EEE · MMM d')}</T>
        </View>

        <T v="greeting" style={{ marginTop: space(5.5) }}>
          {greeting(profile?.display_name)}
        </T>
        <T v="secondary" style={{ marginTop: 4 }}>
          {active.startedAt
            ? 'Still on the floor. The record waits for you.'
            : todayShift
              ? "Tonight's already in the book."
              : 'The record is ready when you are.'}
        </T>

        {/* Primary card: on-shift ⇄ next / clock-in */}
        {active.startedAt ? (
          <Glass warm style={styles.primary}>
            <View>
              <T v="overline">On shift · {fmtElapsed()}</T>
              <T style={[styles.primaryBig, { color: active.elapsed > usual ? palette.amber : palette.ink }]}>
                {active.elapsed > usual ? 'Overtime' : 'Still going'}
              </T>
            </View>
            <Pressable accessibilityRole="button" onPress={clockOutToDebrief} style={styles.amberChip}>
              <T v="caption" style={{ color: palette.night, fontWeight: '600' }}>
                Clock out ›
              </T>
            </Pressable>
          </Glass>
        ) : (
          <Glass style={styles.primary}>
            <View>
              <T v="overline">Next shift</T>
              <T style={styles.primaryBig}>Not clocked in</T>
              <T v="caption" style={{ marginTop: 2 }}>
                {usual}h · your usual
              </T>
            </View>
            <Pressable accessibilityRole="button" onPress={active.clockIn} style={styles.ghostChip}>
              <T v="caption" style={{ color: ink.text }}>
                Clock in
              </T>
            </Pressable>
          </Glass>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.push('/debrief')} style={{ marginTop: space(3) }}>
          <T v="caption" style={{ color: ink.dim }}>
            Put a past shift down ›
          </T>
        </Pressable>

        {/* Week strip */}
        <View style={styles.weekHead}>
          <T v="overline">This week</T>
          <T v="caption">
            {weekShifts} shifts · {Math.round(weekHours)}h ›
          </T>
        </View>
        <View style={styles.week}>
          {weekDays.map((d, i) => {
            const s = byDate.get(d);
            const isToday = d === localToday();
            const step = s?.load != null ? s.load - 1 : -1;
            const dark = step >= 3;
            const dayNum = d.slice(8);
            return (
              <View
                key={d}
                style={[
                  styles.weekCell,
                  { backgroundColor: step >= 0 ? heat[step] : 'rgba(234,241,236,.03)' },
                  isToday && styles.weekToday,
                ]}>
                <T style={{ fontSize: 9, letterSpacing: 0.5, color: dark ? 'rgba(9,15,14,.6)' : ink.dim }}>
                  {DAY_LETTERS[i]}
                </T>
                <T style={{ fontSize: 13, fontFamily: 'Bricolage-SemiBold', color: dark ? palette.night : palette.ink }}>
                  {dayNum}
                </T>
              </View>
            );
          })}
        </View>

        {/* Milestone progress */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/milestone')} style={styles.milestone}>
          <View style={styles.msHead}>
            <T v="overline">Milestone</T>
            <T v="caption" style={{ color: palette.amber }}>
              #{nextMilestone.toLocaleString()} · {(nextMilestone - career).toLocaleString()} to go ›
            </T>
          </View>
          <View style={styles.msTrack}>
            <View style={[styles.msFill, { width: `${Math.round(milestoneFrac * 100)}%` }]} />
          </View>
        </Pressable>

        {/* Stat tiles */}
        <View style={styles.tiles}>
          <Pressable style={styles.tile} onPress={() => router.push('/logbook')}>
            <T v="statValue">
              {approx}
              {totals.shifts.toLocaleString()}
            </T>
            <T v="overline" style={{ marginTop: 2 }}>
              career shifts
            </T>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => router.push('/insights')}>
            <T v="statValue" style={{ color: palette.amber }}>
              {approx}
              {Math.round(totals.hours).toLocaleString()}
            </T>
            <T v="overline" style={{ marginTop: 2 }}>
              hours held
            </T>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => router.push('/insights')}>
            <T v="statValue" style={{ color: palette.moon }}>
              {nightCount}
            </T>
            <T v="overline" style={{ marginTop: 2 }}>
              nights
            </T>
          </Pressable>
        </View>

        <View style={styles.presence}>
          <View style={{ marginTop: 1 }}>
            <LanternGlyph size={11} />
          </View>
          <T v="partnerCaption" style={{ flex: 1, fontSize: 11.5 }}>
            {dailyLine ??
              (totals.loggedShifts === 0
                ? 'The lantern is lit whenever you clock out. Nothing has to stay unwritten.'
                : 'The record is holding. Every shift you put down stays put.')}
          </T>
        </View>
      </View>
    </Sky>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primary: { marginTop: space(4), padding: space(4), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryBig: { fontFamily: 'Bricolage-SemiBold', fontSize: 26, lineHeight: 32, color: palette.ink, marginTop: 2 },
  amberChip: { backgroundColor: palette.amber, borderRadius: 14, paddingVertical: space(2.25), paddingHorizontal: space(3.25) },
  ghostChip: { backgroundColor: glass.fill, borderRadius: 14, paddingVertical: space(2.25), paddingHorizontal: space(4) },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space(4.5) },
  week: { flexDirection: 'row', gap: space(1.5), marginTop: space(2) },
  weekCell: { flex: 1, paddingVertical: space(1.75), borderRadius: 11, alignItems: 'center', gap: 2 },
  weekToday: { borderWidth: 1.5, borderColor: palette.amber },
  milestone: { marginTop: space(3), backgroundColor: glass.fill, borderRadius: 16, paddingVertical: space(2.75), paddingHorizontal: space(3.5), overflow: 'hidden' },
  msHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  msTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,182,92,.14)', overflow: 'hidden', marginTop: space(2) },
  msFill: { height: '100%', borderRadius: 2, backgroundColor: palette.amber },
  tiles: { flexDirection: 'row', gap: space(2), marginTop: space(4) },
  tile: { flex: 1, backgroundColor: glass.fill, borderRadius: 14, padding: space(3), overflow: 'hidden' },
  presence: { flexDirection: 'row', gap: space(2), marginTop: space(4), paddingRight: space(1.5) },
});
