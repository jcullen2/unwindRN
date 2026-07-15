import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Screen, Separator } from '@/components/ui';
import { requestAccountDeletion } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { NOT_THERAPY_COPY } from '@/lib/constants';
import { colors, radius, space, type } from '@/theme';

function Row({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={[type.body, danger && { color: colors.danger }]}>{label}</Text>
      {!danger && <Text style={{ color: colors.muted, fontSize: 18 }}>›</Text>}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;

  const confirmDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your debriefs, logbook, and account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await requestAccountDeletion();
              await signOut();
            } catch {
              Alert.alert("Couldn't delete your account", 'Give it another try in a moment.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(4) }}>
        <Row label="Profile" onPress={() => router.push('/settings/profile')} />
        <Separator />
        <Row label="Support resources" onPress={() => router.push('/resources')} />
        {privacyUrl ? (
          <>
            <Separator />
            <Row label="Privacy policy" onPress={() => Linking.openURL(privacyUrl)} />
          </>
        ) : null}
        <Separator />
        <Row label="Sign out" onPress={() => signOut()} />
        <Separator />
        <Row
          label={deleting ? 'Deleting…' : 'Delete account'}
          onPress={confirmDelete}
          danger
          disabled={deleting}
        />

        <Text style={[type.caption, { textAlign: 'center', marginTop: space(8) }]}>
          {NOT_THERAPY_COPY}
        </Text>
        <Text style={[type.caption, { textAlign: 'center', marginTop: space(1) }]}>
          In crisis? Call or text 988 — free, 24/7, confidential.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    paddingVertical: space(4),
    borderRadius: radius.md,
    marginVertical: space(1),
  },
});
