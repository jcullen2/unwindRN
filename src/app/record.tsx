/**
 * The record — glass fields per DESIGN.md §6. Reached two ways:
 * confirm (from a debrief, pre-filled by extraction) and manual (Logbook add).
 * Load bar = 5 heat segments with escalating haptics; tags = canonical chips.
 */
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameButton, GlassField, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { localToday, RecordDraft } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LOAD_LABELS, TAGS } from '@/lib/constants';
import { useCareerTotals, useInvalidateShiftData } from '@/lib/queries';
import { saveShift } from '@/lib/queue';
import { supabase } from '@/lib/supabase';
import { glass, heat, heatFlipsText, ink, palette, space, type } from '@/theme/tokens';

const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000];

const HAPTICS = [
  Haptics.ImpactFeedbackStyle.Light,
  Haptics.ImpactFeedbackStyle.Light,
  Haptics.ImpactFeedbackStyle.Medium,
  Haptics.ImpactFeedbackStyle.Medium,
  Haptics.ImpactFeedbackStyle.Heavy,
] as const;

function LoadBar({ value, onChange }: { value: number | null; onChange: (l: number) => void }) {
  return (
    <View>
      <View style={styles.loadRow}>
        {[1, 2, 3, 4, 5].map((l) => {
          const step = l - 1;
          const selected = value != null && l <= value;
          return (
            <Pressable
              key={l}
              accessibilityRole="button"
              accessibilityLabel={`Load ${LOAD_LABELS[step]}`}
              onPress={() => {
                Haptics.impactAsync(HAPTICS[step]);
                onChange(l);
              }}
              style={[
                styles.loadSeg,
                { backgroundColor: selected ? heat[Math.min(4, (value ?? 1) - 1)] : glass.fill },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.loadLabels}>
        <T v="whisper">{value ? LOAD_LABELS[value - 1] : 'Light … Brutal'}</T>
      </View>
    </View>
  );
}

function TagChips({ value, onToggle }: { value: string[]; onToggle: (t: string) => void }) {
  return (
    <View style={styles.chips}>
      {TAGS.map((t) => {
        const on = value.includes(t);
        return (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              Haptics.selectionAsync();
              onToggle(t);
            }}
            style={[styles.chip, on && styles.chipOn]}>
            <T v="caption" style={{ color: on ? palette.apricot : ink.dim }}>
              {t}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ marginTop: space(4) }}>
      <T v="overline" style={{ marginBottom: space(1.5) }}>
        {label}
      </T>
      <GlassField dimmed={value.length === 0}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={ink.faint}
          keyboardAppearance="dark"
          multiline
          style={styles.fieldInput}
        />
      </GlassField>
    </View>
  );
}

export default function RecordScreen() {
  const params = useLocalSearchParams<{ mode?: string; sessionId?: string; draft?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const totals = useCareerTotals();
  const invalidate = useInvalidateShiftData();

  let initial: Partial<RecordDraft> = {};
  try {
    initial = params.draft ? JSON.parse(params.draft) : {};
  } catch {
    initial = {};
  }

  const fromDebrief = params.mode === 'confirm';
  const usual = Number(profile?.usual_shift_hours ?? 12);

  const [shiftDate, setShiftDate] = useState(initial.shift_date ?? localToday());
  const [hours, setHours] = useState(initial.hours != null ? String(initial.hours) : String(usual));
  const [load, setLoad] = useState<number | null>(initial.load ?? null);
  const [tags, setTags] = useState<string[]>(initial.tags ?? []);
  const [isNight, setIsNight] = useState(initial.is_night ?? false);
  const [win, setWin] = useState(initial.win ?? '');
  const [weight, setWeight] = useState(initial.weight ?? '');
  const [lesson, setLesson] = useState(initial.lesson ?? '');
  const [saving, setSaving] = useState(false);

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(shiftDate);
  const parsedHours = Number(hours.replace(',', '.'));
  const validHours = Number.isFinite(parsedHours) && parsedHours > 0 && parsedHours <= 24;

  const save = async () => {
    if (!session || !validDate || !validHours || saving) return;
    setSaving(true);
    // Local-first: the queue keeps the record even in a dead zone.
    const { synced, shiftId } = await saveShift({
      user_id: session.user.id,
      shift_date: shiftDate,
      hours: parsedHours,
      load,
      tags,
      is_night: isNight,
      win: win.trim() || null,
      weight: weight.trim() || null,
      lesson: lesson.trim() || null,
      source: initial.source ?? (fromDebrief ? 'voice' : 'taps'),
    });

    if (synced && params.sessionId && shiftId) {
      const end = () =>
        supabase
          .from('debrief_sessions')
          .update({ ended_at: new Date().toISOString(), shift_id: shiftId })
          .eq('id', params.sessionId!);
      const { error: endError } = await end();
      if (endError) await end();
    }

    if (synced) await invalidate();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newTotal = totals.shifts + 1;
    if (synced && MILESTONES.includes(newTotal)) {
      router.replace({ pathname: '/milestone', params: { count: String(newTotal) } });
    } else if (fromDebrief) {
      // Leave both the record sheet and the debrief modal.
      router.dismissAll();
    } else {
      router.back();
    }
  };

  return (
    <Sky>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top > 0 ? insets.top : space(6),
            paddingHorizontal: space(6),
            paddingBottom: space(12),
          }}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <T v="greeting" style={{ fontSize: 24, lineHeight: 30 }}>
              {fromDebrief ? 'The record, formed.' : 'Add a shift'}
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
              <T style={{ color: ink.dim, fontSize: 20 }}>✕</T>
            </Pressable>
          </View>
          {fromDebrief && (
            <T v="whisper" style={{ marginTop: space(1) }}>
              Everything below is editable. It saves when you say so.
            </T>
          )}

          <View style={styles.shiftRow}>
            <View style={{ flex: 1.4 }}>
              <T v="overline" style={{ marginBottom: space(1.5) }}>
                Shift
              </T>
              <GlassField>
                <TextInput
                  value={shiftDate}
                  onChangeText={setShiftDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={ink.faint}
                  keyboardAppearance="dark"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.fieldInput, { minHeight: 22 }]}
                />
              </GlassField>
            </View>
            <View style={{ flex: 0.8 }}>
              <T v="overline" style={{ marginBottom: space(1.5) }}>
                Hours
              </T>
              <GlassField>
                <TextInput
                  value={hours}
                  onChangeText={setHours}
                  placeholder={String(usual)}
                  placeholderTextColor={ink.faint}
                  keyboardAppearance="dark"
                  keyboardType="decimal-pad"
                  style={[styles.fieldInput, { minHeight: 22 }]}
                />
              </GlassField>
            </View>
          </View>
          {!validHours && hours.length > 0 && (
            <T v="caption" style={{ color: palette.flame, marginTop: space(1) }}>
              Hours should land between 0 and 24.
            </T>
          )}

          <View style={{ marginTop: space(4) }}>
            <T v="overline" style={{ marginBottom: space(1.5) }}>
              Load
            </T>
            <LoadBar value={load} onChange={setLoad} />
          </View>

          <View style={{ marginTop: space(4) }}>
            <T v="overline" style={{ marginBottom: space(1.5) }}>
              Tags
            </T>
            <TagChips
              value={tags}
              onToggle={(t) =>
                setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
              }
            />
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: isNight }}
            onPress={() => setIsNight((v) => !v)}
            style={styles.nightRow}>
            <View style={[styles.nightTick, { opacity: isNight ? 1 : 0.25 }]} />
            <T v="secondary" style={{ color: isNight ? ink.text : ink.dim }}>
              Night shift
            </T>
          </Pressable>

          <Field label="Win" value={win} onChange={setWin} placeholder={fromDebrief ? 'still listening…' : 'One thing that went right'} />
          <Field label="The weight" value={weight} onChange={setWeight} placeholder={fromDebrief ? 'still listening…' : 'What you’re still carrying'} />
          <Field label="Lesson" value={lesson} onChange={setLesson} placeholder={fromDebrief ? 'still listening…' : 'Worth remembering'} />

          <FlameButton
            title="That's the shift — save it"
            onPress={save}
            disabled={!validDate || !validHours}
            loading={saving}
            style={{ marginTop: space(8) }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftRow: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(5),
  },
  fieldInput: {
    color: ink.text,
    fontSize: type.body.fontSize,
    lineHeight: 22,
    padding: 0,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  loadRow: {
    flexDirection: 'row',
    gap: space(1.5),
  },
  loadSeg: {
    flex: 1,
    height: 34,
    borderRadius: 8,
  },
  loadLabels: {
    marginTop: space(1.5),
    alignItems: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  chip: {
    backgroundColor: glass.fill,
    borderRadius: 16,
    paddingVertical: space(2),
    paddingHorizontal: space(3),
  },
  chipOn: {
    backgroundColor: 'rgba(255,104,70,.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,173,114,.35)',
  },
  nightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(4),
  },
  nightTick: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: palette.violet,
  },
});
