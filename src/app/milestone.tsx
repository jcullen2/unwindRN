/**
 * Milestone — a three-slide wrapped story. Slide 0: the number. Slide 1: the
 * life-totals. Slide 2: "This record is a life's work." Auto-advances (4.6s),
 * tap to skip forward, ✕ or the last button leaves. No guilt, only weight.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { useCareerTotals, useShifts } from '@/lib/queries';
import { ink, palette, space } from '@/theme/tokens';

const SLIDE_MS = 4600;

function Bar({ state }: { state: 'done' | 'now' | 'next' }) {
  const reduced = useReducedMotion();
  const w = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    if (state === 'done') w.value = 1;
    else if (state === 'now') w.value = reduced ? 1 : withTiming(1, { duration: SLIDE_MS, easing: Easing.linear });
    else w.value = 0;
  }, [state, w, reduced]);
  const st = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, st]} />
    </View>
  );
}

export default function MilestoneScreen() {
  const { count } = useLocalSearchParams<{ count?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const totals = useCareerTotals();
  const { data: shifts } = useShifts();

  const n = Number(count) || totals.shifts;
  const hours = Math.round(totals.hours);
  const nights = totals.nights;
  const wins = (shifts ?? []).filter((s) => s.win).length;

  const [slide, setSlide] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const leave = () => router.canGoBack() ? router.back() : router.replace('/');
  const advance = () => {
    if (slide < 2) setSlide((s) => s + 1);
    else leave();
  };

  useEffect(() => {
    timer.current = setTimeout(advance, SLIDE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  return (
    <Sky glowBoost>
      <Pressable style={{ flex: 1 }} onPress={advance}>
        <View style={{ flex: 1, paddingTop: insets.top + space(2.5), paddingBottom: insets.bottom + space(6), paddingHorizontal: space(8.5) }}>
          <View style={styles.bars}>
            {[0, 1, 2].map((i) => (
              <Bar key={i} state={i < slide ? 'done' : i === slide ? 'now' : 'next'} />
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={leave} hitSlop={12} style={styles.close}>
            <T style={{ color: ink.dim, fontSize: 18 }}>✕</T>
          </Pressable>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            {slide === 0 && (
              <>
                <T v="overline" style={{ letterSpacing: 2, color: ink.dim }}>
                  The record just turned
                </T>
                <T v="milestone" adjustsFontSizeToFit numberOfLines={1} style={{ marginTop: space(3) }}>
                  #{n.toLocaleString()}
                </T>
                <T v="ask" style={{ marginTop: space(4) }}>
                  {n.toLocaleString()} shifts, kept.
                </T>
              </>
            )}

            {slide === 1 && (
              <View style={{ gap: space(6.5) }}>
                <Stat value={hours.toLocaleString()} label="hours held" color={palette.ink} />
                <Stat value={nights.toLocaleString()} label="nights walked" color={palette.moon} />
                <Stat value={wins.toLocaleString()} label="wins written down" color={palette.amber} />
              </View>
            )}

            {slide === 2 && (
              <View style={{ alignItems: 'center' }}>
                <T v="ask" style={{ fontSize: 30, lineHeight: 39, textAlign: 'center' }}>
                  This record is{'\n'}a life’s work.
                </T>
                <Glass style={styles.cta}>
                  <T v="body" style={{ textAlign: 'center' }}>
                    Back to the record
                  </T>
                </Glass>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Sky>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View>
      <T style={{ fontFamily: 'Bricolage-Bold', fontSize: 44, lineHeight: 54, letterSpacing: -1, color }}>{value}</T>
      <T v="overline" style={{ marginTop: 2 }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', gap: space(1.5) },
  track: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(234,241,236,.18)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: palette.ink },
  close: { position: 'absolute', top: space(4.5), right: space(6), zIndex: 2 },
  cta: { paddingVertical: space(3.25), paddingHorizontal: space(7), marginTop: space(10) },
});
