/**
 * Conversational onboarding — one continuous scene, no pagination (Session 4).
 * Four beats after sign-in: (1) years + shifts/week → her estimated career
 * renders live in apricot and writes est_* to the profile; (2) specialty cards
 * with the partner's preview line (spoken when TTS is live); (3) the two
 * promises; (4) handoff into tonight's debrief or one honest reminder.
 * The lamp's flame grows with each completed beat. Skippable from beat 1.
 */
import * as Notifications from 'expo-notifications';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameGlyph } from '@/brand';
import { FlameButton, Glass, GlassField, QuietButton, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { useAuth } from '@/lib/auth';
import { SPECIALTIES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { speak } from '@/lib/tts';
import { fonts, glass, ink, palette, space, type } from '@/theme/tokens';

const PREVIEW_LINES: Record<string, string> = {
  'Pediatric Oncology': 'Peds onc. The heaviest floor there is, carried lightly enough that the kids never feel it.',
  Emergency: 'The department. Where every plan survives about four minutes.',
  ICU: 'The unit. Two patients, twenty drips, and a family at each bed.',
  'Med-Surg': 'Med-surg. Six patients, no such thing as a routine day.',
  'L&D': 'L and D. The best day of someone’s life, until the moment it isn’t.',
  OR: 'The OR. Hours of choreography nobody outside the room ever sees.',
  'Psych/Behavioral': 'Psych. Where the vitals that matter don’t show on a monitor.',
  Other: 'Wherever you work — the floor is the floor. I’ll learn yours.',
};

function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Less"
        onPress={() => onChange(Math.max(min, value - step))}
        style={styles.stepBtn}>
        <T v="body" style={{ color: ink.secondary }}>
          −
        </T>
      </Pressable>
      <T v="body" style={{ minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value}
        {suffix ?? ''}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More"
        onPress={() => onChange(Math.min(max, value + step))}
        style={styles.stepBtn}>
        <T v="body" style={{ color: ink.secondary }}>
          +
        </T>
      </Pressable>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, refreshProfile } = useAuth();

  const [beat, setBeat] = useState(0);
  const [name, setName] = useState('');
  const [years, setYears] = useState(3);
  const [perWeek, setPerWeek] = useState(3);
  const [usualHours, setUsualHours] = useState(12);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const estShifts = useMemo(() => Math.round(years * 46 * perWeek), [years, perWeek]);
  const estHours = useMemo(() => Math.round(estShifts * usualHours), [estShifts, usualHours]);

  const writeProfile = async (skipped: boolean) => {
    if (!session) return false;
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      display_name: skipped ? null : name.trim() || null,
      specialty: skipped ? null : specialty,
      years_in: skipped ? null : years,
      shifts_per_week: skipped ? null : perWeek,
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
    if (await writeProfile(true)) await refreshProfile();
    setSaving(false);
  };

  const commitPromises = async () => {
    setSaving(true);
    const ok = await writeProfile(false);
    setSaving(false);
    if (ok) setBeat(3);
  };

  const finishToDebrief = async () => {
    await refreshProfile();
    router.push('/debrief');
  };

  const finishWithReminder = async () => {
    try {
      const perms = await Notifications.requestPermissionsAsync();
      if (perms.granted) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(19, 30, 0, 0);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'unwindRN',
            body: 'When you’re ready — tonight’s shift can go in the book.',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrow },
        });
      }
    } catch {
      // no reminder is fine — never nag
    }
    await refreshProfile();
  };

  const flameSize = 16 + beat * 8; // the flame grows with each beat

  return (
    <Sky>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + space(8),
            paddingHorizontal: space(6),
            paddingBottom: insets.bottom + space(10),
          }}
          keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: space(6), height: 52, justifyContent: 'flex-end' }}>
            <FlameGlyph size={flameSize} />
          </View>

          {/* Beat 1 — the estimate */}
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <T v="greeting" style={{ fontSize: 26, lineHeight: 33 }}>
              Before tonight — who's talking?
            </T>

            <T v="overline" style={styles.label}>
              What should we call you?
            </T>
            <GlassField>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={ink.faint}
                keyboardAppearance="dark"
                autoCapitalize="words"
                style={styles.input}
              />
            </GlassField>

            <View style={styles.stepRow}>
              <View style={{ flex: 1 }}>
                <T v="overline" style={styles.label}>
                  Years in
                </T>
                <Stepper value={years} onChange={setYears} min={0} max={50} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="overline" style={styles.label}>
                  Shifts a week
                </T>
                <Stepper value={perWeek} onChange={setPerWeek} min={1} max={6} />
              </View>
            </View>
            <T v="overline" style={styles.label}>
              Usual shift
            </T>
            <Stepper value={usualHours} onChange={setUsualHours} min={4} max={16} step={2} suffix="h" />

            {years > 0 && (
              <View style={{ marginTop: space(6) }}>
                <T style={styles.estimate}>
                  ~{estShifts.toLocaleString()} shifts · ~{estHours.toLocaleString()} hours
                </T>
                <T v="secondary" style={{ marginTop: space(2) }}>
                  …and nobody wrote a word of it down. That ends tonight.
                </T>
              </View>
            )}

            {beat === 0 && (
              <>
                <FlameButton title="That's me" onPress={() => setBeat(1)} style={{ marginTop: space(6) }} />
                <Pressable accessibilityRole="button" onPress={skip} disabled={saving} style={{ alignItems: 'center', padding: space(3) }}>
                  <T v="whisper">Skip for now</T>
                </Pressable>
              </>
            )}
          </Animated.View>

          {/* Beat 2 — specialty */}
          {beat >= 1 && (
            <Animated.View entering={FadeInDown.springify().damping(18)} style={{ marginTop: space(8) }}>
              <T v="greeting" style={{ fontSize: 22, lineHeight: 28 }}>
                Your floor?
              </T>
              <View style={styles.cards}>
                {SPECIALTIES.map((s) => {
                  const on = specialty === s;
                  return (
                    <Pressable
                      key={s}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        setSpecialty(s);
                        speak(PREVIEW_LINES[s]);
                      }}
                      style={[styles.card, on && styles.cardOn]}>
                      <T v="secondary" style={{ color: on ? palette.apricot : ink.secondary }}>
                        {s}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
              {specialty && (
                <View style={styles.preview}>
                  <View style={{ marginTop: 4 }}>
                    <FlameGlyph size={13} />
                  </View>
                  <T v="partnerCaption" style={{ flex: 1 }}>
                    {PREVIEW_LINES[specialty]}
                  </T>
                </View>
              )}
              {beat === 1 && (
                <FlameButton
                  title="Keep going"
                  onPress={() => setBeat(2)}
                  disabled={!specialty}
                  style={{ marginTop: space(5) }}
                />
              )}
            </Animated.View>
          )}

          {/* Beat 3 — the two promises */}
          {beat >= 2 && (
            <Animated.View entering={FadeInDown.springify().damping(18)} style={{ marginTop: space(8), gap: space(3) }}>
              <Glass>
                <T v="body" style={{ fontWeight: '600' }}>
                  Your patients stay private.
                </T>
                <T v="secondary" style={{ marginTop: space(2) }}>
                  Talk about your day, not their identities. We never ask for names, rooms, or
                  details that could identify a patient. That protects them — and your license.
                </T>
              </Glass>
              <Glass>
                <T v="body" style={{ fontWeight: '600' }}>
                  Not therapy. Still yours.
                </T>
                <T v="secondary" style={{ marginTop: space(2) }}>
                  unwindRN isn't medical care or therapy. If you're in crisis, call or text 988.
                  For everything else — the lamp is here after every shift.
                </T>
              </Glass>
              {beat === 2 && (
                <FlameButton title="I'm in" onPress={commitPromises} loading={saving} style={{ marginTop: space(2) }} />
              )}
            </Animated.View>
          )}

          {/* Beat 4 — handoff */}
          {beat >= 3 && (
            <Animated.View entering={FadeInDown.springify().damping(18)} style={{ marginTop: space(8) }}>
              <T v="greeting" style={{ fontSize: 22, lineHeight: 28 }}>
                Shift #{(estShifts + 1).toLocaleString()} is next.
              </T>
              <FlameButton title="Debrief tonight's shift" onPress={finishToDebrief} style={{ marginTop: space(5) }} />
              <QuietButton
                title="After my next shift"
                onPress={finishWithReminder}
                tone="dim"
                style={{ marginTop: space(2) }}
              />
              <T v="whisper" style={{ textAlign: 'center', marginTop: space(3) }}>
                One gentle reminder, no nagging.
              </T>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: space(5),
    marginBottom: space(2),
  },
  input: {
    color: ink.text,
    fontSize: type.body.fontSize,
    lineHeight: 22,
    padding: 0,
    minHeight: 24,
  },
  stepRow: {
    flexDirection: 'row',
    gap: space(4),
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.fill,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  stepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimate: {
    fontFamily: fonts.serif600,
    fontSize: 30,
    lineHeight: 38,
    color: palette.apricot,
    fontVariant: ['tabular-nums'],
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
    marginTop: space(4),
  },
  card: {
    backgroundColor: glass.fill,
    borderRadius: 14,
    paddingVertical: space(3),
    paddingHorizontal: space(3.5),
  },
  cardOn: {
    backgroundColor: 'rgba(255,104,70,.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,173,114,.35)',
  },
  preview: {
    flexDirection: 'row',
    gap: space(2.5),
    marginTop: space(4),
    paddingRight: space(2),
  },
});
