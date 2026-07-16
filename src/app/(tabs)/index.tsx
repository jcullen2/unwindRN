import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameGlyph, Lamp } from '@/brand';
import { Glass, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { localToday } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCareerTotals, useShifts } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { glass, ink, palette, space } from '@/theme/tokens';

const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000];
const ACTIVE_SHIFT_KEY = 'unwindrn_active_shift_started_at';

function greeting(name?: string | null): string {
  const h = new Date().getHours();
  const who = name ? `, ${name}` : '';
  if (h >= 5 && h < 12) return `Morning${who}.`;
  if (h >= 12 && h < 17) return `Afternoon${who}.`;
  if (h >= 17 && h < 22) return `Evening${who}.`;
  return `Still up${who}?`;
}

/** Monument numeral counts up 900ms on first focus each day (§7). */
function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const played = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (played.current) return;
      played.current = true;
      if (reduced || target === 0) {
        setValue(target);
        return;
      }
      const start = Date.now();
      const tick = () => {
        const t = Math.min(1, (Date.now() - start) / 900);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, [target, reduced])
  );

  useEffect(() => {
    if (played.current) setValue((v) => (v === target ? v : target));
  }, [target]);

  return value;
}

function useDailyLine(hasLogged: boolean) {
  return useQuery({
    queryKey: ['daily-line', localToday()],
    enabled: hasLogged,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.functions.invoke('daily-line', {
        body: { today: localToday() },
      });
      if (error) return null;
      return typeof data?.line === 'string' ? data.line : null;
    },
  });
}

/** In-app stand-in for the Live Activity (timeboxed per Session 5). */
function useActiveShift() {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_SHIFT_KEY).then(setStartedAt).catch(() => {});
  }, []);
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [startedAt]);

  const clockIn = useCallback(() => {
    const now = new Date().toISOString();
    setStartedAt(now);
    AsyncStorage.setItem(ACTIVE_SHIFT_KEY, now).catch(() => {});
  }, []);
  const clockOut = useCallback(() => {
    setStartedAt(null);
    AsyncStorage.removeItem(ACTIVE_SHIFT_KEY).catch(() => {});
  }, []);

  const elapsedHours = startedAt
    ? (Date.now() - new Date(startedAt).getTime()) / 3_600_000
    : 0;
  return { startedAt, elapsedHours, clockIn, clockOut };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const totals = useCareerTotals();
  const { data: shifts } = useShifts();
  const shown = useCountUp(totals.shifts);
  const { data: dailyLine } = useDailyLine(totals.loggedShifts > 0);
  const active = useActiveShift();

  const usual = Number(profile?.usual_shift_hours ?? 12);
  const approx = totals.estimated ? '~' : '';
  const nextMilestone = MILESTONES.find((m) => m > totals.shifts);
  const toGo = nextMilestone ? nextMilestone - totals.shifts : null;
  const todayShift = shifts?.find((s) => s.shift_date === localToday());
  const initial = (profile?.display_name ?? '?').trim().charAt(0).toUpperCase();
  const overtime = active.elapsedHours > usual;

  const clockOutToDebrief = () => {
    const started = active.startedAt ? new Date(active.startedAt) : null;
    const hours = Math.max(0.5, Math.round(active.elapsedHours * 2) / 2);
    const night = started ? started.getHours() >= 17 || started.getHours() < 5 : false;
    active.clockOut();
    router.push({
      pathname: '/debrief',
      params: { hours: String(hours), night: night ? '1' : '0' },
    });
  };

  const fmtElapsed = () => {
    const h = Math.floor(active.elapsedHours);
    const m = Math.floor((active.elapsedHours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  return (
    <Sky>
      <View style={{ flex: 1, paddingTop: insets.top + space(3), paddingHorizontal: space(6) }}>
        <View style={styles.header}>
          <Lamp size={26} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => router.push('/profile')}
            hitSlop={10}
            style={styles.avatar}>
            <T v="secondary" style={{ color: ink.text }}>
              {initial}
            </T>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <T v="greeting">{greeting(profile?.display_name)}</T>

          <View style={{ marginTop: space(6) }}>
            <T v="overline">Career shifts</T>
            <T v="monument" style={{ marginTop: space(1) }}>
              {approx}
              {shown.toLocaleString()}
            </T>
            <T v="secondary" style={{ marginTop: space(1) }}>
              {approx}
              {Math.round(totals.hours).toLocaleString()} hours held
            </T>
          </View>

          <View style={styles.presence}>
            <View style={{ marginTop: 3 }}>
              <FlameGlyph size={13} />
            </View>
            <T v="partnerCaption" style={{ flex: 1 }}>
              {dailyLine ??
                (totals.loggedShifts === 0
                  ? 'Whenever you clock out, I’m here. Nothing you carry has to stay unwritten.'
                  : 'The record is holding. Every shift you put down stays put.')}
            </T>
          </View>

          {toGo !== null && totals.loggedShifts > 0 && (
            <T v="whisper" style={{ marginTop: space(4) }}>
              {toGo} {toGo === 1 ? 'shift' : 'shifts'} to #{nextMilestone}
            </T>
          )}
        </View>

        <View style={{ marginBottom: space(28) }}>
          {active.startedAt ? (
            <Glass warm>
              <View style={styles.clockRow}>
                <View>
                  <T v="overline">On shift</T>
                  <T
                    v="totals"
                    style={{
                      fontSize: 30,
                      lineHeight: 36,
                      color: overtime ? palette.apricot : ink.text,
                    }}>
                    {fmtElapsed()}
                  </T>
                  {overtime && <T v="whisper">past your usual {usual}h</T>}
                </View>
                <Pressable accessibilityRole="button" onPress={clockOutToDebrief} style={styles.clockBtn}>
                  <T v="caption" style={{ color: palette.night, fontWeight: '600' }}>
                    Clock out → debrief
                  </T>
                </Pressable>
              </View>
            </Glass>
          ) : todayShift ? (
            <Glass warm>
              <T v="overline">Tonight</T>
              <T v="body" style={{ marginTop: space(1.5) }}>
                The shift is in the book. {Number(todayShift.hours)} hours, kept.
              </T>
            </Glass>
          ) : (
            <View style={{ alignItems: 'center', gap: space(3) }}>
              <Pressable accessibilityRole="button" onPress={active.clockIn} style={styles.clockInBtn}>
                <T v="caption" style={{ color: ink.secondary }}>
                  Clock in
                </T>
              </Pressable>
              <T v="whisper">The flame below starts tonight’s debrief.</T>
            </View>
          )}
        </View>
      </View>
    </Sky>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: glass.fill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  presence: {
    flexDirection: 'row',
    gap: space(2.5),
    marginTop: space(8),
    paddingRight: space(4),
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clockBtn: {
    backgroundColor: palette.apricot,
    borderRadius: 12,
    paddingVertical: space(2.5),
    paddingHorizontal: space(3.5),
  },
  clockInBtn: {
    backgroundColor: glass.fill,
    borderRadius: 16,
    paddingVertical: space(2),
    paddingHorizontal: space(4),
  },
});
