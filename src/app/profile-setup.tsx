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
import { useAuth } from '@/lib/auth';
import { SPECIALTIES } from '@/lib/constants';
import { glass, ink, palette, space, type } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';

export function SpecialtyPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (s: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {SPECIALTIES.map((s) => {
        const on = value === s;
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(s)}
            style={[styles.chip, on && styles.chipOn]}>
            <T v="secondary" style={{ color: on ? palette.apricot : ink.secondary }}>
              {s}
            </T>
          </Pressable>
        );
      })}
    </View>
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
    if (!session || !canSave || saving) return;
    setSaving(true);
    // upsert so a transient profile-fetch failure can't strand an existing user
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      display_name: displayName.trim(),
      specialty,
      years_in: Math.max(0, parseFloat(yearsIn) || 0),
    });
    if (error) {
      setSaving(false);
      Alert.alert("Couldn't save your profile", 'Give it another try.');
      return;
    }
    await refreshProfile();
  };

  return (
    <Sky>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + space(10),
            paddingBottom: insets.bottom + space(8),
            paddingHorizontal: space(6),
          }}
          keyboardShouldPersistTaps="handled">
          <T v="greeting" style={{ fontSize: 28, lineHeight: 35 }}>
            Before the first debrief.
          </T>
          <T v="secondary" style={{ marginTop: space(2) }}>
            So your partner knows who's talking.
          </T>

          <T v="overline" style={styles.label}>
            What should we call you?
          </T>
          <GlassField>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={ink.faint}
              keyboardAppearance="dark"
              autoCapitalize="words"
              style={styles.input}
            />
          </GlassField>

          <T v="overline" style={styles.label}>
            Your specialty
          </T>
          <SpecialtyPicker value={specialty} onChange={setSpecialty} />

          <T v="overline" style={styles.label}>
            Years in nursing
          </T>
          <GlassField>
            <TextInput
              value={yearsIn}
              onChangeText={setYearsIn}
              placeholder="e.g. 4"
              placeholderTextColor={ink.faint}
              keyboardAppearance="dark"
              keyboardType="decimal-pad"
              maxLength={4}
              style={styles.input}
            />
          </GlassField>

          <FlameButton
            title="Light the lamp"
            onPress={save}
            disabled={!canSave}
            loading={saving}
            style={{ marginTop: space(8) }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: space(6),
    marginBottom: space(2),
  },
  input: {
    color: ink.text,
    fontSize: type.body.fontSize,
    lineHeight: 22,
    padding: 0,
    minHeight: 24,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  chip: {
    backgroundColor: glass.fill,
    borderRadius: 18,
    paddingVertical: space(2.5),
    paddingHorizontal: space(3.5),
  },
  chipOn: {
    backgroundColor: 'rgba(255,104,70,.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,173,114,.35)',
  },
});
