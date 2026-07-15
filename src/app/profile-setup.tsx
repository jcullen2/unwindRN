import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, Label, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { SPECIALTIES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { colors, radius, space, type } from '@/theme';

export function SpecialtyPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (s: string) => void;
}) {
  return (
    <>
      {SPECIALTIES.map((s) => {
        const selected = value === s;
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            onPress={() => onChange(s)}
            style={[styles.specialtyRow, selected && styles.specialtyRowSelected]}>
            <Text style={[type.body, selected && { color: colors.amber, fontWeight: '600' }]}>
              {s}
            </Text>
          </Pressable>
        );
      })}
    </>
  );
}

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { session, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [yearsIn, setYearsIn] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = displayName.trim().length > 0 && specialty !== null;

  const save = async () => {
    if (!session || !canSave) return;
    setSaving(true);
    // upsert, not insert: if a profile row already exists (e.g. the fetch
    // failed transiently at launch and routed an existing user here), saving
    // must still succeed rather than dead-ending on the primary-key conflict.
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      display_name: displayName.trim(),
      specialty: specialty!,
      years_in: Math.max(0, parseInt(yearsIn, 10) || 0),
    });
    if (error) {
      setSaving(false);
      Alert.alert("Couldn't save your profile", 'Give it another try.');
      return;
    }
    await refreshProfile();
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + space(8),
            paddingBottom: insets.bottom + space(8),
            paddingHorizontal: space(6),
          }}
          keyboardShouldPersistTaps="handled">
          <Text style={type.title}>Before your first debrief</Text>
          <Text style={[type.secondary, { marginTop: space(2) }]}>
            So your debrief partner knows who they're talking to.
          </Text>

          <Label>What should we call you?</Label>
          <Field
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            autoCapitalize="words"
            autoComplete="name"
          />

          <Label>Your specialty</Label>
          <SpecialtyPicker value={specialty} onChange={setSpecialty} />

          <Label>Years in nursing</Label>
          <Field
            value={yearsIn}
            onChangeText={setYearsIn}
            placeholder="e.g. 4"
            keyboardType="number-pad"
            maxLength={2}
          />

          <Button
            title="Start debriefing"
            onPress={save}
            disabled={!canSave}
            loading={saving}
            style={{ marginTop: space(8) }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  specialtyRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    marginBottom: space(2),
  },
  specialtyRowSelected: {
    borderColor: colors.amber,
    backgroundColor: colors.elevated,
  },
});
