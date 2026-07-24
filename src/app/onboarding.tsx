/**
 * Onboarding — one instrument, three questions.
 *
 * The career grid is mounted once and never leaves the screen: her thumb moves
 * the year dial and ~740 cells grow under it, she picks nights and a share of
 * them turn moon-mint, she picks twelves and the hours climb. Three answers,
 * and a career she has never seen drawn is drawn.
 *
 * Deliberately not a form and not a story. Nothing here explains the product —
 * the numbers do that, and they arrive before we ask her for anything.
 * Nightingale and the promises moved out; they were a toll booth standing in
 * front of the only moment that matters.
 */
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CareerGrid } from '@/components/career-grid';
import { CountUp } from '@/components/count-up';
import { Chip, FlameButton, GlassField, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { YearDial } from '@/components/year-dial';
import { useAuth } from '@/lib/auth';
import { estimateCareer, PATTERNS, type Pattern } from '@/lib/career';
import { SPECIALTIES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { ink, palette, space, type } from '@/theme/tokens';

const BEATS = 3;

/** One live figure above the grid. Dashed until she's told us enough to know it. */
function Stat({ value, label, color, known }: { value: number; label: string; color: string; known: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      {known ? (
        <CountUp value={value} prefix="~" style={[styles.stat, { color }]} />
      ) : (
        <T style={[styles.stat, { color: 'rgba(234,241,236,.12)' }]}>—</T>
      )}
      <T v="overline" style={{ marginTop: 2 }}>
        {label}
      </T>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, refreshProfile } = useAuth();

  const [beat, setBeat] = useState(0);
  const [years, setYears] = useState(5);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [usualHours, setUsualHours] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [hospital, setHospital] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);

  // Stand-ins keep the grid alive on the first frame; the counters stay dashed
  // until she has actually answered, so nothing on screen is ever a guess
  // presented as a fact.
  const est = estimateCareer(years, pattern ?? 'Rotating', usualHours ?? 12);

  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) });
  }, [reveal]);

  const onGridLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);

  const advance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBeat((b) => Math.min(BEATS - 1, b + 1));
  };

  const finish = async () => {
    if (!session || saving) return;
    setSaving(true);
    const final = estimateCareer(years, pattern ?? 'Rotating', usualHours ?? 12);
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      display_name: name.trim() || null,
      specialty,
      years_in: years,
      usual_shift_hours: usualHours ?? 12,
      shift_pattern: pattern ?? 'Rotating',
      est_career_shifts: final.shifts,
      est_career_hours: final.hours,
      hospital: hospital.trim() || null,
      city: city.trim() || null,
    });
    if (error) {
      setSaving(false);
      Alert.alert("Couldn't save that", 'Give it another try.');
      return;
    }
    // /welcome sits behind the `authed` guard, which reads the context
    // profile — refresh before replacing or the navigation gets swallowed.
    await refreshProfile();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace('/welcome');
    setSaving(false);
  };

  /** Skip writes the shape of a shift, never a career she didn't claim. */
  const skip = async () => {
    if (!session || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, usual_shift_hours: usualHours ?? 12 }, { ignoreDuplicates: true });
    if (error) Alert.alert("Couldn't save that", 'Give it another try.');
    else await refreshProfile();
    setSaving(false);
  };

  const canContinue = beat === 0 ? true : beat === 1 ? !!pattern && !!usualHours : !!specialty;

  return (
    <Sky>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingTop: insets.top + space(3), paddingBottom: insets.bottom + space(4) }}>
          <View style={styles.top}>
            <View style={{ flexDirection: 'row', gap: space(1.25) }}>
              {Array.from({ length: BEATS }, (_, i) => (
                <View key={i} style={[styles.dot, i <= beat && styles.dotOn]} />
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={skip} disabled={saving} hitSlop={12}>
              <T v="caption" style={{ color: ink.faint }}>
                Skip
              </T>
            </Pressable>
          </View>

          {/* THE INSTRUMENT — mounted once, never unmounts, always live. */}
          <View style={styles.instrument}>
            <View style={styles.stats}>
              <Stat value={est.shifts} label="shifts" color={palette.ink} known />
              <Stat value={est.nights} label="nights" color={palette.moon} known={!!pattern} />
              <Stat value={est.hours} label="hours" color={palette.amber} known={!!usualHours} />
            </View>
            <View onLayout={onGridLayout} style={{ marginTop: space(3.5) }}>
              {gridWidth > 0 && (
                <CareerGrid
                  shifts={est.shifts}
                  nights={pattern ? est.nights : 0}
                  width={gridWidth}
                  progress={reveal}
                  cell={5}
                  gap={2}
                  // 49 cols x 16 rows = 784 cells, so the default five-year
                  // career (740) draws one square per shift. Longer careers
                  // downscale and the grid says so.
                  maxRows={16}
                />
              )}
            </View>
          </View>

          <View style={styles.body}>
            {/* No `entering` here: beat 0 mounts WITH the screen, and under
                reanimated 4.5 + the React Compiler that leaves it at opacity 0
                forever (CLAUDE.md landmine). Beats 1 and 2 mount on a later
                state change, so they animate fine. */}
            {beat === 0 && (
              <View key="b0">
                <T v="ask">How long have you been a nurse?</T>
                <View style={{ marginTop: space(5) }}>
                  <YearDial value={years} onChange={setYears} />
                </View>
              </View>
            )}

            {beat === 1 && (
              <Animated.View key="b1" entering={FadeIn.duration(280)}>
                <T v="ask">What do you work?</T>
                <View style={styles.chips}>
                  {PATTERNS.map((p) => (
                    <Chip
                      key={p}
                      label={p}
                      selected={pattern === p}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setPattern(p);
                      }}
                    />
                  ))}
                </View>
                <T v="overline" style={{ marginTop: space(5) }}>
                  Usual shift
                </T>
                <View style={styles.chips}>
                  {[8, 10, 12].map((h) => (
                    <Chip
                      key={h}
                      label={`${h}h`}
                      selected={usualHours === h}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setUsualHours(h);
                      }}
                    />
                  ))}
                </View>
              </Animated.View>
            )}

            {beat === 2 && (
              <ScrollView
                key="b2"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: space(4) }}>
                <Animated.View entering={FadeInDown.duration(280)}>
                  <T v="ask">Where do you practice?</T>
                  <View style={styles.chips}>
                    {SPECIALTIES.map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        selected={specialty === s}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setSpecialty(s);
                        }}
                      />
                    ))}
                  </View>
                  <View style={styles.fieldRow}>
                    <GlassField style={{ flex: 1 }}>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="First name"
                        placeholderTextColor={ink.faint}
                        keyboardAppearance="dark"
                        autoCapitalize="words"
                        autoComplete="given-name"
                        textContentType="givenName"
                        style={styles.input}
                      />
                    </GlassField>
                  </View>
                  <View style={styles.fieldRow}>
                    <GlassField style={{ flex: 1.35 }}>
                      <TextInput
                        value={hospital}
                        onChangeText={setHospital}
                        placeholder="Hospital"
                        placeholderTextColor={ink.faint}
                        keyboardAppearance="dark"
                        style={styles.input}
                      />
                    </GlassField>
                    <GlassField style={{ flex: 1 }}>
                      <TextInput
                        value={city}
                        onChangeText={setCity}
                        placeholder="City"
                        placeholderTextColor={ink.faint}
                        keyboardAppearance="dark"
                        style={styles.input}
                      />
                    </GlassField>
                  </View>
                  <T v="whisper" style={{ marginTop: space(3) }}>
                    Yours alone. No hospital sees any of this.
                  </T>
                </Animated.View>
              </ScrollView>
            )}
          </View>

          <View style={{ paddingHorizontal: space(7) }}>
            <FlameButton
              title={beat === BEATS - 1 ? 'See my career' : 'Continue'}
              onPress={beat === BEATS - 1 ? finish : advance}
              disabled={!canContinue}
              loading={saving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(7),
  },
  dot: { width: 18, height: 3, borderRadius: 2, backgroundColor: 'rgba(234,241,236,.14)' },
  dotOn: { backgroundColor: palette.amber },
  instrument: { paddingHorizontal: space(7), marginTop: space(6) },
  stats: { flexDirection: 'row', gap: space(3) },
  stat: {
    fontFamily: 'Bricolage-Bold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  // flex-start, not center: centring inside the leftover space floated the
  // question halfway down an empty screen once the grid shrank.
  body: { flex: 1, paddingHorizontal: space(7), paddingTop: space(7) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  fieldRow: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  input: { color: palette.ink, fontSize: type.body.fontSize, lineHeight: 22, padding: 0, minHeight: 24 },
});
