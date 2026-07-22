/**
 * Onboarding — six beats, dots + Skip (Deep Ward). Opens on Nightingale;
 * captures practice + pattern; resolves a live career estimate; then "Light it"
 * writes est_* and enters the welcome-wrapped story.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, FlameButton, GlassField, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { PulsingLantern } from '@/app/sign-in';
import { useAuth } from '@/lib/auth';
import { SPECIALTIES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { fonts, heat, ink, palette, space, type } from '@/theme/tokens';

const PATTERNS = [
  { key: 'Days', perYear: 152 },
  { key: 'Nights', perYear: 144 },
  { key: 'Rotating', perYear: 148 },
] as const;

const UNITS = ['Peds', 'Float', 'Charge', 'Precept', 'None'];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, refreshProfile } = useAuth();

  const [beat, setBeat] = useState(0);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [hospital, setHospital] = useState('');
  const [city, setCity] = useState('');
  const [years, setYears] = useState<number | null>(null);
  const [pattern, setPattern] = useState<(typeof PATTERNS)[number]['key']>('Days');
  const [usualHours, setUsualHours] = useState(12);
  const [saving, setSaving] = useState(false);

  const perYear = PATTERNS.find((p) => p.key === pattern)!.perYear;
  const estShifts = useMemo(() => (years ? years * perYear : 0), [years, perYear]);
  const estHours = estShifts * usualHours;

  const next = () => setBeat((b) => Math.min(5, b + 1));

  const write = async (skipped: boolean) => {
    if (!session) return false;
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      display_name: skipped ? null : name.trim() || null,
      specialty: skipped ? null : specialty,
      years_in: skipped ? null : years,
      usual_shift_hours: usualHours,
      est_career_shifts: skipped ? 0 : estShifts,
      est_career_hours: skipped ? 0 : estHours,
    });
    if (error) {
      Alert.alert("Couldn't save that", 'Give it another try.');
      return false;
    }
    return true;
  };

  const skip = async () => {
    setSaving(true);
    if (await write(true)) await refreshProfile();
    setSaving(false);
  };

  const lightIt = async () => {
    setSaving(true);
    const ok = await write(false);
    setSaving(false);
    if (ok)
      router.replace({
        pathname: '/welcome',
        params: { est: String(estShifts), hospital: hospital.trim(), years: String(years ?? 0) },
      });
  };

  const Dots = () => (
    <View style={styles.top}>
      <View style={{ flexDirection: 'row', gap: space(1.25) }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.dot, i === beat && styles.dotOn]} />
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={skip} disabled={saving} hitSlop={10}>
        <T style={{ fontSize: 12, color: 'rgba(234,241,236,.35)' }}>Skip</T>
      </Pressable>
    </View>
  );

  return (
    <Sky>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingTop: insets.top + space(3.5), paddingHorizontal: space(7.5), paddingBottom: insets.bottom + space(6) }}>
          <Dots />

          {beat === 0 && (
            <Pressable style={styles.beat} onPress={next}>
              <Animated.View entering={FadeIn.duration(400)}>
                <T style={styles.big1854}>1854.</T>
                <T v="ask" style={{ fontSize: 23, marginTop: space(4) }}>
                  A nurse walked the dark wards with a lamp.
                </T>
                <T v="secondary" style={{ marginTop: space(3.5), lineHeight: 22 }}>
                  The light meant one thing —{'\n'}someone is still watching.
                </T>
                <View style={{ marginTop: space(10) }}>
                  <PulsingLantern size={38} />
                </View>
              </Animated.View>
            </Pressable>
          )}

          {beat === 1 && (
            <Pressable style={styles.beat} onPress={next}>
              <Animated.View entering={FadeIn.duration(400)}>
                <T v="ask" style={{ fontSize: 26 }}>
                  Twelve hours of holding the line —
                </T>
                <T v="ask" style={{ fontSize: 26, color: ink.dim, marginTop: space(2.5) }}>
                  and nobody writes a word of it down.
                </T>
                <View style={{ marginTop: space(9), gap: space(2) }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={styles.ghostRow} />
                  ))}
                  <View style={styles.tonightRow}>
                    <T v="caption" style={{ color: palette.amber }}>
                      Tonight gets written.
                    </T>
                  </View>
                </View>
              </Animated.View>
            </Pressable>
          )}

          {beat === 2 && (
            <Pressable style={styles.beat} onPress={next}>
              <Animated.View entering={FadeIn.duration(400)}>
                <T v="title">Our promises</T>
                <View style={styles.dash} />
                <View style={{ marginTop: space(7), gap: space(5.5) }}>
                  {[
                    ['01', 'Yours alone.', 'Patients stay unnamed. Your voice never leaves the phone.'],
                    ['02', 'A logbook with a voice.', 'Never therapy. In crisis, we point to 988 — always.'],
                    ['03', 'No streaks. No guilt.', 'Twenty seconds a night. Saving without a word is always one tap.'],
                  ].map(([n, h, b]) => (
                    <View key={n} style={{ flexDirection: 'row', gap: space(3.5) }}>
                      <T style={styles.promiseNum}>{n}</T>
                      <View style={{ flex: 1 }}>
                        <T v="body" style={{ fontWeight: '600' }}>
                          {h}
                        </T>
                        <T v="secondary" style={{ marginTop: 2 }}>
                          {b}
                        </T>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            </Pressable>
          )}

          {beat === 3 && (
            <ScrollView contentContainerStyle={styles.beatScroll} keyboardShouldPersistTaps="handled">
              <T v="title">Where do you practice?</T>
              <View style={styles.dash} />
              <T v="overline" style={styles.label}>
                Specialty
              </T>
              <View style={styles.chips}>
                {SPECIALTIES.map((s) => (
                  <Chip key={s} label={s} selected={specialty === s} onPress={() => setSpecialty(s)} />
                ))}
              </View>
              <T v="overline" style={styles.label}>
                Unit
              </T>
              <View style={styles.chips}>
                {UNITS.map((u) => (
                  <Chip key={u} label={u} />
                ))}
              </View>
              <T v="overline" style={styles.label}>
                Hospital &amp; city
              </T>
              <GlassField>
                <TextInput value={hospital} onChangeText={setHospital} placeholder="Hospital" placeholderTextColor={ink.faint} keyboardAppearance="dark" style={styles.input} />
              </GlassField>
              <GlassField style={{ marginTop: space(2) }}>
                <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={ink.faint} keyboardAppearance="dark" style={styles.input} />
              </GlassField>
              <T v="whisper" style={{ marginTop: space(3) }}>
                Location powers pay context and peer insights — never shared, off by default.
              </T>
              <FlameButton title="Continue" onPress={next} disabled={!specialty} style={{ marginTop: space(6) }} />
            </ScrollView>
          )}

          {beat === 4 && (
            <ScrollView contentContainerStyle={styles.beatScroll} keyboardShouldPersistTaps="handled">
              <T v="title" style={{ lineHeight: 32 }}>
                Eight years? Twelve?{'\n'}The record wants it exact.
              </T>
              <View style={styles.dash} />
              <T v="overline" style={styles.label}>
                Years at the bedside
              </T>
              <View style={styles.chips}>
                {[1, 2, 3, 5, 8, 10, 12, 15, 20, 25].map((y) => (
                  <Chip key={y} label={String(y)} selected={years === y} onPress={() => setYears(y)} />
                ))}
              </View>
              <T v="overline" style={styles.label}>
                Pattern
              </T>
              <View style={styles.chips}>
                {PATTERNS.map((p) => (
                  <Chip key={p.key} label={p.key} selected={pattern === p.key} onPress={() => setPattern(p.key)} />
                ))}
              </View>
              <T v="overline" style={styles.label}>
                Usual shift
              </T>
              <View style={styles.chips}>
                {[8, 10, 12].map((hh) => (
                  <Chip key={hh} label={`${hh}h`} selected={usualHours === hh} onPress={() => setUsualHours(hh)} />
                ))}
              </View>

              {years && (
                <Animated.View entering={FadeIn} style={styles.estimate}>
                  <T v="secondary">
                    You've already carried{' '}
                    <T style={styles.estInline}>≈ {estShifts.toLocaleString()} shifts</T> · ≈{' '}
                    {estHours.toLocaleString()} hours. The count starts there.
                  </T>
                </Animated.View>
              )}
              <FlameButton title="Continue" onPress={next} disabled={!years} style={{ marginTop: space(6) }} />
            </ScrollView>
          )}

          {beat === 5 && (
            <View style={styles.beat}>
              <Animated.View entering={FadeIn.duration(400)}>
                <T v="title">Twenty seconds a night.</T>
                <View style={styles.dash} />
                <View style={{ marginTop: space(6), gap: space(3) }}>
                  <View style={styles.previewCard}>
                    <T v="body" style={{ fontWeight: '600' }}>
                      Clock out by taps
                    </T>
                    <View style={{ flexDirection: 'row', gap: space(1.5), marginTop: space(2.25) }}>
                      <Chip label="12h" selected />
                      <Chip label="1:5" />
                      <Chip label="Short-staffed" />
                    </View>
                  </View>
                  <View style={styles.previewCard}>
                    <T v="body" style={{ fontWeight: '600' }}>
                      The month writes itself
                    </T>
                    <View style={{ flexDirection: 'row', gap: space(1.25), marginTop: space(2.25) }}>
                      {[heat[1], heat[2], 'rgba(234,241,236,.05)', palette.amber, heat[3]].map((c, i) => (
                        <View key={i} style={{ width: 22, height: 16, borderRadius: 5, backgroundColor: c }} />
                      ))}
                    </View>
                  </View>
                  <View style={styles.previewCard}>
                    <T v="body" style={{ fontWeight: '600' }}>
                      Talk only when you want to
                    </T>
                    <T v="secondary" style={{ marginTop: space(1) }}>
                      A partner fluent in {specialty ?? 'your floor'} listens, and the record assembles itself.
                    </T>
                  </View>
                </View>
                <FlameButton title="Light it" onPress={lightIt} loading={saving} style={{ marginTop: space(6) }} />
              </Animated.View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(234,241,236,.2)' },
  dotOn: { width: 16, backgroundColor: palette.amber },
  beat: { flex: 1, justifyContent: 'center' },
  beatScroll: { paddingTop: space(8), paddingBottom: space(10) },
  big1854: { fontFamily: fonts.display700, fontSize: 60, letterSpacing: -2, color: palette.amber },
  ghostRow: { height: 34, borderRadius: 10, backgroundColor: 'rgba(234,241,236,.04)' },
  tonightRow: {
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,182,92,.14)',
    justifyContent: 'center',
    paddingHorizontal: space(3),
  },
  dash: { width: 26, height: 3, borderRadius: 2, backgroundColor: palette.amber, marginTop: space(2) },
  promiseNum: { fontFamily: fonts.display600, fontSize: 15, color: palette.amber, width: 20 },
  label: { marginTop: space(5), marginBottom: space(2) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) },
  input: { color: palette.ink, fontSize: type.body.fontSize, lineHeight: 22, padding: 0, minHeight: 24 },
  estimate: {
    marginTop: space(6),
    padding: space(4),
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,182,92,.10)',
  },
  estInline: { fontFamily: fonts.display600, fontSize: 15, color: palette.amber },
  previewCard: {
    backgroundColor: 'rgba(234,241,236,.055)',
    borderRadius: 16,
    padding: space(3.5),
    overflow: 'hidden',
  },
});
