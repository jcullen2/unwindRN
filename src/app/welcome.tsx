/**
 * Welcome — the four-slide wrapped story after onboarding. Auto-advances
 * (4.6s), tap to skip forward, then into the record. Honors reduced-motion.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PulsingLantern } from '@/app/sign-in';
import { FlameButton, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { useAuth } from '@/lib/auth';
import { palette, space } from '@/theme/tokens';

const SLIDE_MS = 4600;
const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

function ProgressBar({ state }: { state: 'done' | 'now' | 'next' }) {
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

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ est?: string; hospital?: string; years?: string }>();

  const est = Number(params.est) || profile?.est_career_shifts || 0;
  const estHours = profile?.est_career_hours || est * Number(profile?.usual_shift_hours ?? 12);
  const hospital = params.hospital?.trim() || 'the bedside';
  const years = Number(params.years) || Number(profile?.years_in) || 0;
  const yearsWord = years >= 1 && years <= 12 ? WORDS[years - 1] : String(years || '—');
  const spec = profile?.specialty ?? '';

  const [slide, setSlide] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = () => {
    if (slide < 3) setSlide((s) => s + 1);
    else router.replace('/');
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
            {[0, 1, 2, 3].map((i) => (
              <ProgressBar key={i} state={i < slide ? 'done' : i === slide ? 'now' : 'next'} />
            ))}
          </View>

          <View style={styles.center}>
            {slide === 0 && (
              <Animated.View key="s0" entering={FadeIn.duration(600)}>
                <T v="overline" style={{ letterSpacing: 2 }}>
                  Before tonight
                </T>
                <T style={styles.big}>
                  {yearsWord} years{'\n'}at {hospital}.
                </T>
              </Animated.View>
            )}

            {slide === 1 && (
              <Animated.View key="s1" entering={FadeIn.duration(600)}>
                <T v="hero" adjustsFontSizeToFit numberOfLines={1}>
                  ≈{est.toLocaleString()}
                </T>
                <T v="ask" style={{ marginTop: space(3.5) }}>
                  {spec ? `${spec} shifts` : 'shifts'} already carried.
                </T>
                <T v="secondary" style={{ marginTop: space(2.5) }}>
                  ≈{estHours.toLocaleString()} hours — and not one written down.
                </T>
              </Animated.View>
            )}

            {slide === 2 && (
              <Animated.View key="s2" entering={FadeIn.duration(600)}>
                <T v="ask" style={{ fontSize: 34, lineHeight: 44 }}>
                  Starting tonight,{'\n'}every one is <T v="ask" style={{ fontSize: 34, lineHeight: 44, color: palette.amber }}>kept</T>.
                </T>
              </Animated.View>
            )}

            {slide === 3 && (
              <Animated.View key="s3" entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
                <PulsingLantern size={50} />
                <T v="title" style={{ marginTop: space(6.5) }}>
                  Shift #{(est + 1).toLocaleString()}
                </T>
                <T v="secondary" style={{ marginTop: space(2) }}>
                  whenever you’re ready.
                </T>
                <FlameButton title="Enter the record" onPress={() => router.replace('/')} style={{ marginTop: space(9), paddingHorizontal: space(8) }} />
              </Animated.View>
            )}
          </View>
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
  big: { fontFamily: 'Bricolage-Bold', fontSize: 46, lineHeight: 53, letterSpacing: -1.5, color: palette.ink, marginTop: space(3.5) },
});
