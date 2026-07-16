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
import { glass, ink, space } from '@/theme/tokens';

const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000];

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

  // If totals refine after the animation (query settles), snap to truth.
  useEffect(() => {
    if (played.current) setValue((v) => (v === target ? v : target));
  }, [target]);

  return value;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const totals = useCareerTotals();
  const { data: shifts } = useShifts();
  const shown = useCountUp(totals.shifts);

  const approx = totals.estimated ? '~' : '';
  const nextMilestone = MILESTONES.find((m) => m > totals.shifts);
  const toGo = nextMilestone ? nextMilestone - totals.shifts : null;
  const todayShift = shifts?.find((s) => s.shift_date === localToday());
  const initial = (profile?.display_name ?? '?').trim().charAt(0).toUpperCase();

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
              {totals.loggedShifts === 0
                ? 'Whenever you clock out, I’m here. Nothing you carry has to stay unwritten.'
                : 'The record is holding. Every shift you put down stays put.'}
            </T>
          </View>

          {toGo !== null && totals.loggedShifts > 0 && (
            <T v="whisper" style={{ marginTop: space(4) }}>
              {toGo} {toGo === 1 ? 'shift' : 'shifts'} to #{nextMilestone}
            </T>
          )}
        </View>

        {todayShift ? (
          <Glass warm style={{ marginBottom: space(28) }}>
            <T v="overline">Tonight</T>
            <T v="body" style={{ marginTop: space(1.5) }}>
              The shift is in the book. {Number(todayShift.hours)} hours, kept.
            </T>
          </Glass>
        ) : (
          <View style={{ marginBottom: space(28), alignItems: 'center' }}>
            <T v="whisper">The flame below starts tonight’s debrief.</T>
          </View>
        )}
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
});
