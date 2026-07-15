import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Field, Label, Screen } from '@/components/ui';
import { localToday, ShiftDraft } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MILESTONES } from '@/lib/constants';
import { useInvalidateShiftData } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { colors, space, type } from '@/theme';

function MoodPicker({ value, onChange }: { value: number | null; onChange: (m: number | null) => void }) {
  return (
    <View>
      <View style={styles.moodRow}>
        {[1, 2, 3, 4, 5].map((m) => {
          const selected = value === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityLabel={`Mood ${m} of 5`}
              onPress={() => onChange(selected ? null : m)}
              style={[styles.moodDot, selected && styles.moodDotSelected]}>
              <Text style={[type.body, selected && { color: colors.bg, fontWeight: '700' }]}>{m}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.moodLabels}>
        <Text style={type.caption}>wrecked</Text>
        <Text style={type.caption}>great</Text>
      </View>
    </View>
  );
}

export default function ShiftFormScreen() {
  const params = useLocalSearchParams<{ mode?: string; debriefId?: string; draft?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const invalidate = useInvalidateShiftData();

  const fromDebrief = params.mode === 'confirm' || (params.mode === 'manual' && !!params.debriefId);
  let initial: Partial<ShiftDraft> = {};
  try {
    initial = params.draft ? JSON.parse(params.draft) : {};
  } catch {
    initial = {};
  }

  const [shiftDate, setShiftDate] = useState(initial.shift_date ?? localToday());
  const [hours, setHours] = useState(initial.hours != null ? String(initial.hours) : '');
  const [unit, setUnit] = useState(initial.unit ?? '');
  const [win, setWin] = useState(initial.win ?? '');
  const [loss, setLoss] = useState(initial.loss ?? '');
  const [lesson, setLesson] = useState(initial.lesson ?? '');
  const [mood, setMood] = useState<number | null>(initial.mood ?? null);
  const [saving, setSaving] = useState(false);

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(shiftDate);
  const parsedHours = hours.trim() === '' ? null : Number(hours.replace(',', '.'));
  const validHours = parsedHours === null || (Number.isFinite(parsedHours) && parsedHours > 0 && parsedHours <= 24);

  const save = async () => {
    if (!session || !validDate || !validHours || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('shifts').insert({
        user_id: session.user.id,
        shift_date: shiftDate,
        hours: parsedHours,
        unit: unit.trim() || null,
        win: win.trim(),
        loss: loss.trim(),
        lesson: lesson.trim(),
        mood,
        source: params.debriefId ? 'debrief' : 'manual',
        debrief_id: params.debriefId ?? null,
      });
      if (error) throw error;

      if (params.debriefId) {
        // If this fails the debrief stays open and could be saved twice —
        // retry once before moving on.
        const end = () =>
          supabase
            .from('debriefs')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', params.debriefId!);
        const { error: endError } = await end();
        if (endError) await end();
      }

      await invalidate();

      // Milestone check is best-effort: a failed totals read skips the card,
      // it never blocks the save.
      const { data: totals, error: totalsError } = await supabase
        .from('shift_totals')
        .select('total_shifts')
        .maybeSingle();
      const count = totalsError ? null : (totals?.total_shifts ?? 0);

      if (count !== null && (MILESTONES as readonly number[]).includes(count)) {
        router.replace({ pathname: '/milestone', params: { count: String(count) } });
      } else {
        router.back();
      }
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save your shift", 'Give it another try.');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={type.heading}>{fromDebrief ? 'Your shift, on the record' : 'Add a shift'}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: colors.muted, fontSize: 22 }}>✕</Text>
          </Pressable>
        </View>
        {fromDebrief && (
          <Text style={[type.caption, { paddingHorizontal: space(6) }]}>
            Check the details — everything is editable.
          </Text>
        )}

        <ScrollView
          contentContainerStyle={{ padding: space(6), paddingBottom: space(12) }}
          keyboardShouldPersistTaps="handled">
          <Label>Date</Label>
          <Field
            value={shiftDate}
            onChangeText={setShiftDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!validDate && shiftDate.length > 0 && (
            <Text style={[type.caption, { color: colors.danger, marginTop: space(1) }]}>
              Use the YYYY-MM-DD format.
            </Text>
          )}

          <Label>Hours worked</Label>
          <Field value={hours} onChangeText={setHours} placeholder="e.g. 12" keyboardType="decimal-pad" />
          {!validHours && (
            <Text style={[type.caption, { color: colors.danger, marginTop: space(1) }]}>
              Hours should be between 0 and 24.
            </Text>
          )}

          <Label>Unit</Label>
          <Field value={unit} onChangeText={setUnit} placeholder="e.g. Peds Onc" />

          <Label>Win</Label>
          <Field value={win} onChangeText={setWin} placeholder="One thing that went well" multiline />

          <Label>Loss</Label>
          <Field value={loss} onChangeText={setLoss} placeholder="One thing that was hard" multiline />

          <Label>Lesson</Label>
          <Field value={lesson} onChangeText={setLesson} placeholder="One thing worth remembering" multiline />

          <Label>How was it, 1 to 5?</Label>
          <MoodPicker value={mood} onChange={setMood} />

          <Button
            title="Save shift"
            onPress={save}
            disabled={!validDate || !validHours}
            loading={saving}
            style={{ marginTop: space(8) }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(6),
    paddingTop: space(6),
    paddingBottom: space(2),
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space(2),
    paddingHorizontal: space(1),
  },
  moodDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodDotSelected: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
});
