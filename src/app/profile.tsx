import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { requestAccountDeletion } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { NOT_THERAPY_COPY } from '@/lib/constants';
import { useCareerTotals } from '@/lib/queries';
import { glass, ink, palette, space } from '@/theme/tokens';

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
      <T v="body" style={danger ? { color: palette.flame } : undefined}>
        {label}
      </T>
      {!danger && <T style={{ color: ink.faint, fontSize: 17 }}>›</T>}
    </Pressable>
  );
}

const Hairline = () => <View style={styles.hairline} />;

export default function ProfileSheet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const totals = useCareerTotals();
  const [deleting, setDeleting] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);

  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;

  useEffect(() => {
    AsyncStorage.getItem('unwindrn_reminder_on')
      .then((v) => setReminderOn(v === 'true'))
      .catch(() => {});
  }, []);

  const toggleReminder = async (on: boolean) => {
    setReminderOn(on);
    AsyncStorage.setItem('unwindrn_reminder_on', String(on)).catch(() => {});
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (on) {
        const perms = await Notifications.requestPermissionsAsync();
        if (!perms.granted) {
          setReminderOn(false);
          AsyncStorage.setItem('unwindrn_reminder_on', 'false').catch(() => {});
          return;
        }
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
      // never block the sheet on notification plumbing
    }
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await requestAccountDeletion();
      await signOut();
    } catch {
      Alert.alert("Couldn't delete the account", 'Give it another try in a moment.');
    } finally {
      setDeleting(false);
    }
  };

  // Typed confirmation (Session 4): DELETE, spelled out.
  const confirmDelete = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Delete account?',
        'This permanently deletes your debriefs, logbook, and account. Type DELETE to confirm.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: (text?: string) => {
              if ((text ?? '').trim().toUpperCase() === 'DELETE') runDelete();
              else Alert.alert('Not deleted', 'Type DELETE to confirm — everything is still here.');
            },
          },
        ],
        'plain-text'
      );
    } else {
      Alert.alert('Delete account?', 'This permanently deletes your debriefs, logbook, and account.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: runDelete },
      ]);
    }
  };

  const meta = [
    profile?.specialty,
    profile?.years_in != null ? `${Number(profile.years_in)} yrs in` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Sky>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top > 0 ? insets.top : space(8),
          paddingHorizontal: space(6),
          paddingBottom: space(12),
        }}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <T v="greeting" style={{ fontSize: 22, lineHeight: 26 }}>
              {(profile?.display_name ?? '?').trim().charAt(0).toUpperCase()}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <T v="greeting" style={{ fontSize: 24, lineHeight: 30 }}>
              {profile?.display_name ?? 'You'}
            </T>
            {meta.length > 0 && (
              <T v="secondary" style={{ marginTop: 2 }}>
                {meta}
              </T>
            )}
          </View>
        </View>

        <Glass style={{ marginTop: space(6) }}>
          <T v="overline">Your career record</T>
          <View style={styles.recordRow}>
            <View>
              <T v="totals" style={{ fontSize: 34, lineHeight: 40 }}>
                {totals.loggedShifts}
              </T>
              <T v="caption">logged here</T>
            </View>
            <View>
              <T v="totals" style={{ fontSize: 34, lineHeight: 40, color: ink.dim }}>
                {totals.estimated ? `~${(totals.shifts - totals.loggedShifts).toLocaleString()}` : '—'}
              </T>
              <T v="caption">estimated before</T>
            </View>
          </View>
          <T v="whisper" style={{ marginTop: space(3) }}>
            Export is coming — the record is yours to take anywhere.
          </T>
        </Glass>

        <Glass style={{ marginTop: space(4), padding: 0 }}>
          <Row label="Support resources" onPress={() => router.push('/resources')} />
          {privacyUrl ? (
            <>
              <Hairline />
              <Row label="Privacy policy" onPress={() => Linking.openURL(privacyUrl)} />
            </>
          ) : null}
          <Hairline />
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: space(3) }}>
              <T v="body">Reminder</T>
              <T v="whisper" style={{ marginTop: 2 }}>
                One gentle reminder after your next shift. No nagging, ever.
              </T>
            </View>
            <Switch
              value={reminderOn}
              onValueChange={toggleReminder}
              trackColor={{ true: palette.flame, false: glass.fill }}
              thumbColor={palette.bone}
            />
          </View>
        </Glass>

        <Glass style={{ marginTop: space(4), padding: 0 }}>
          <Row label="Sign out" onPress={() => signOut()} />
          <Hairline />
          <Row
            label={deleting ? 'Deleting…' : 'Delete account'}
            onPress={confirmDelete}
            danger
            disabled={deleting}
          />
        </Glass>

        <T v="whisper" style={{ textAlign: 'center', marginTop: space(8) }}>
          Your voice never leaves the phone. Transcripts and records stay yours.
        </T>
        <T v="whisper" style={{ textAlign: 'center', marginTop: space(1) }}>
          {NOT_THERAPY_COPY} In crisis? Call or text 988.
        </T>
      </ScrollView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(4),
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: glass.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordRow: {
    flexDirection: 'row',
    gap: space(10),
    marginTop: space(3),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingVertical: space(4),
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ink.hairline,
    marginHorizontal: space(4),
  },
});
