import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { Button, Field, Label, Screen } from '@/components/ui';
import { SpecialtyPicker } from '@/app/profile-setup';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [specialty, setSpecialty] = useState<string | null>(profile?.specialty ?? null);
  const [yearsIn, setYearsIn] = useState(profile ? String(profile.years_in) : '');
  const [saving, setSaving] = useState(false);

  const canSave = displayName.trim().length > 0 && specialty !== null;

  const save = async () => {
    if (!session || !canSave || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        specialty: specialty!,
        years_in: Math.max(0, parseInt(yearsIn, 10) || 0),
      })
      .eq('id', session.user.id);
    if (error) {
      setSaving(false);
      Alert.alert("Couldn't save your profile", 'Give it another try.');
      return;
    }
    await refreshProfile();
    router.back();
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: space(6), paddingBottom: space(12) }}
          keyboardShouldPersistTaps="handled">
          <Label>Display name</Label>
          <Field
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            autoCapitalize="words"
          />

          <Label>Specialty</Label>
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
            title="Save"
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
