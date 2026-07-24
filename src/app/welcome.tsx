/**
 * The wrapped — the first thing unwindRN ever gives back.
 *
 * Five slides, and on four of them the app says almost nothing: the grid
 * draws, the number lands, the night cells light, the line crosses the
 * country. Every figure is derived in lib/career.ts and wears the ~, because
 * the one thing that would ruin this is a number she can tell was invented.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CareerGrid } from '@/components/career-grid';
import { CountUp } from '@/components/count-up';
import { FlameButton, QuietButton, T } from '@/components/kit';
import { PulsingLantern } from '@/components/lantern';
import { Sky } from '@/components/sky';
import { useAuth } from '@/lib/auth';
import { estimateCareer, milesLandmark, type Pattern } from '@/lib/career';
import { palette, space } from '@/theme/tokens';

const SLIDE_MS = 5200;
const SLIDES = 5;
const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

function Progress({ state }: { state: 'done' | 'now' | 'next' }) {
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

/** A rule that draws itself across the screen — distance, made literal. */
function DrawnLine({ delay = 0 }: { delay?: number }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.value = withDelay(delay, withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }));
  }, [p, delay, reduced]);
  const st = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={styles.lineTrack}>
      <Animated.View style={[styles.lineFill, st]} />
    </View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const years = Number(profile?.years_in) || 0;
  const pattern = (profile?.shift_pattern as Pattern) || 'Rotating';
  const usual = Number(profile?.usual_shift_hours ?? 12);
  // Prefer what onboarding actually wrote; fall back to a fresh derivation so
  // the story still holds for a profile that predates the estimate columns.
  const derived = estimateCareer(years, pattern, usual);
  const shifts = profile?.est_career_shifts || derived.shifts;
  const hours = profile?.est_career_hours || derived.hours;
  const nights = derived.nights;
  const miles = derived.miles;
  const days = Math.round(hours / 24);
  const yearsOfLife = hours / 8_760;
  const landmark = milesLandmark(miles);

  const where = profile?.hospital?.trim() || 'the bedside';
  const yearsWord = years >= 1 && years <= 12 ? WORDS[years - 1] : String(years || '—');
  const spec = profile?.specialty;

  const [slide, setSlide] = useState(0);
  const [gridW, setGridW] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draw = useSharedValue(0);

  const advance = () => {
    if (slide < SLIDES - 1) setSlide((s) => s + 1);
    else router.replace('/');
  };

  useEffect(() => {
    if (slide === 0 || slide === 2) {
      draw.value = 0;
      draw.value = withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) });
    }
    timer.current = setTimeout(advance, SLIDE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  return (
    <Sky glowBoost>
      <Pressable style={{ flex: 1 }} onPress={advance} accessibilityRole="button" accessibilityLabel="Next">
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + space(2.5),
            paddingBottom: insets.bottom + space(6),
            paddingHorizontal: space(7),
          }}>
          <View style={styles.bars}>
            {Array.from({ length: SLIDES }, (_, i) => (
              <Progress key={i} state={i < slide ? 'done' : i === slide ? 'now' : 'next'} />
            ))}
          </View>

          <View style={styles.center} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
            {/* 0 · the grid draws, and the number lands on it */}
            {slide === 0 && (
              <Animated.View key="s0" entering={FadeIn.duration(400)}>
                <T v="overline" style={{ letterSpacing: 2 }}>
                  {yearsWord} years at {where}
                </T>
                {gridW > 0 && (
                  <View style={{ marginTop: space(5) }}>
                    <CareerGrid shifts={shifts} nights={nights} width={gridW} progress={draw} maxRows={20} />
                  </View>
                )}
                <CountUp value={shifts} prefix="~" style={styles.hero} duration={1800} />
                <T v="ask">{spec ? `${spec} shifts.` : 'shifts.'}</T>
                <T v="secondary" style={{ marginTop: space(2) }}>
                  Not one of them written down.
                </T>
              </Animated.View>
            )}

            {/* 1 · hours, made real */}
            {slide === 1 && (
              <Animated.View key="s1" entering={FadeIn.duration(400)}>
                <CountUp value={hours} prefix="~" style={styles.hero} duration={1900} />
                <T v="ask">hours on the floor.</T>
                <View style={{ marginTop: space(8) }}>
                  <DrawnLine delay={700} />
                  <T v="secondary" style={{ marginTop: space(3) }}>
                    {days.toLocaleString()} full days.
                    {yearsOfLife >= 0.85
                      ? ` About ${yearsOfLife < 1.6 ? 'a year' : `${Math.round(yearsOfLife)} years`} of your life.`
                      : ''}
                  </T>
                </View>
              </Animated.View>
            )}

            {/* 2 · only the nights light */}
            {slide === 2 && (
              <Animated.View key="s2" entering={FadeIn.duration(400)}>
                <CountUp value={nights} prefix="~" style={[styles.hero, { color: palette.moon }]} duration={1700} />
                <T v="ask">of them were nights.</T>
                {gridW > 0 && (
                  <View style={{ marginTop: space(7) }}>
                    <CareerGrid shifts={shifts} nights={nights} width={gridW} progress={draw} maxRows={16} />
                  </View>
                )}
              </Animated.View>
            )}

            {/* 3 · the miles */}
            {slide === 3 && (
              <Animated.View key="s3" entering={FadeIn.duration(400)}>
                <CountUp value={miles} prefix="~" style={styles.hero} duration={1900} />
                <T v="ask">miles, on your feet.</T>
                <View style={{ marginTop: space(8) }}>
                  <DrawnLine delay={600} />
                  {landmark && (
                    <T v="secondary" style={{ marginTop: space(3) }}>
                      {landmark[0].toUpperCase() + landmark.slice(1)}.
                    </T>
                  )}
                </View>
              </Animated.View>
            )}

            {/* 4 · the handoff */}
            {slide === 4 && (
              <Animated.View key="s4" entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
                <PulsingLantern size={48} />
                <T style={styles.next}>Shift #{(shifts + 1).toLocaleString()}</T>
                <T v="secondary" style={{ marginTop: space(2), textAlign: 'center' }}>
                  is the first one you keep.
                </T>
                <FlameButton
                  title="Start there"
                  onPress={() => router.replace('/')}
                  style={{ marginTop: space(9), paddingHorizontal: space(9) }}
                />
                <QuietButton
                  title="Replay"
                  tone="dim"
                  onPress={() => setSlide(0)}
                  style={{ marginTop: space(2.5), paddingHorizontal: space(7) }}
                />
              </Animated.View>
            )}
          </View>

          {slide < SLIDES - 1 && (
            <T v="whisper" style={{ textAlign: 'center' }}>
              ~ estimated from {years} {years === 1 ? 'year' : 'years'} of {pattern.toLowerCase()}. Everything you log
              from here is exact.
            </T>
          )}
        </View>
      </Pressable>
    </Sky>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', gap: space(1.5) },
  track: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(234,241,236,.18)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: palette.ink },
  center: { flex: 1, justifyContent: 'center' },
  hero: {
    fontFamily: 'Bricolage-Bold',
    fontSize: 66,
    lineHeight: 78,
    letterSpacing: -3,
    color: palette.amber,
    fontVariant: ['tabular-nums'],
    marginTop: space(5),
  },
  next: { fontFamily: 'Bricolage-SemiBold', fontSize: 30, lineHeight: 38, color: palette.ink, marginTop: space(7) },
  lineTrack: { height: 2, borderRadius: 1, backgroundColor: 'rgba(234,241,236,.10)', overflow: 'hidden' },
  lineFill: { height: '100%', backgroundColor: palette.amber, borderRadius: 1 },
});
