/**
 * Profile (Deep Ward) — a tab, not a sheet. Amber-ring avatar, "Keeper of N
 * shifts", a "From your record" card drawn from her own logged shifts, then the
 * settings list (reminder, career signals, export, resources) and in-app account
 * deletion (full cascade). 988 always in the footer.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lockup, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { requestAccountDeletion } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCareerTotals, useShifts } from '@/lib/queries';
import { glass, ink, palette, space } from '@/theme/tokens';

const SIGNALS_KEY = 'unwindrn_signals_on';
const REMINDER_KEY = 'unwindrn_reminder_on';
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'to', 'of', 'in', 'on', 'it', 'was', 'for', 'with', 'her', 'his', 'she', 'he', 'they', 'my', 'i', 'at', 'as', 'through', 'kept', 'held']);

function Row({ label, value, onPress, danger }: { label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <T v="body" style={danger ? { color: palette.amber } : undefined}>
        {label}
      </T>
      {value ? <T v="caption" style={{ color: ink.dim }}>{value}</T> : <T style={{ color: ink.faint, fontSize: 15 }}>›</T>}
    </Pressable>
  );
}
const Hairline = () => <View style={styles.hairline} />;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const totals = useCareerTotals();
  const { data: shifts } = useShifts();
  const [deleting, setDeleting] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [signalsOn, setSignalsOn] = useState(true);

  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
  const name = profile?.display_name?.trim() || 'You';
  const initial = name.charAt(0).toUpperCase();
  const sub = [profile?.specialty, profile?.years_in != null ? `${Number(profile.years_in)} yrs in` : null].filter(Boolean).join(' · ');

  useEffect(() => {
    AsyncStorage.getItem(REMINDER_KEY).then((v) => setReminderOn(v === 'true')).catch(() => {});
    AsyncStorage.getItem(SIGNALS_KEY).then((v) => setSignalsOn(v !== 'false')).catch(() => {});
  }, []);

  // "From your record" — real derived facts.
  const record = useMemo(() => {
    const rows = shifts ?? [];
    // longest consecutive-day stretch
    const dates = [...new Set(rows.map((s) => s.shift_date))].sort();
    let longest = dates.length ? 1 : 0;
    let run = dates.length ? 1 : 0;
    for (let i = 1; i < dates.length; i++) {
      const gap = (parseISO(dates[i]).getTime() - parseISO(dates[i - 1]).getTime()) / 86400000;
      run = gap === 1 ? run + 1 : 1;
      if (run > longest) longest = run;
    }
    // most-written word across wins
    const words = new Map<string, number>();
    for (const s of rows) {
      for (const w of (s.win ?? '').toLowerCase().match(/[a-z']{3,}/g) ?? []) {
        if (!STOPWORDS.has(w)) words.set(w, (words.get(w) ?? 0) + 1);
      }
    }
    const topWord = [...words.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    // most-named tag
    const tags = new Map<string, number>();
    for (const s of rows) for (const t of s.tags ?? []) tags.set(t, (tags.get(t) ?? 0) + 1);
    const topTag = [...tags.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    // keeping since
    const since = profile?.created_at ?? dates[0];
    return { longest, topWord, topTag, since: since ? format(parseISO(since), 'MMMM yyyy') : null };
  }, [shifts, profile?.created_at]);

  const toggleSignals = (on: boolean) => {
    setSignalsOn(on);
    AsyncStorage.setItem(SIGNALS_KEY, String(on)).catch(() => {});
  };

  const toggleReminder = async (on: boolean) => {
    setReminderOn(on);
    AsyncStorage.setItem(REMINDER_KEY, String(on)).catch(() => {});
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (on) {
        const perms = await Notifications.requestPermissionsAsync();
        if (!perms.granted) {
          setReminderOn(false);
          AsyncStorage.setItem(REMINDER_KEY, 'false').catch(() => {});
          return;
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(19, 30, 0, 0);
        await Notifications.scheduleNotificationAsync({
          content: { title: 'unwindRN', body: 'When you’re ready — tonight’s shift can go in the book.' },
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

  return (
    <Sky>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + space(3.5), paddingHorizontal: space(6), paddingBottom: space(28) }}>
        <View style={styles.header}>
          <Lockup />
          <Pressable accessibilityRole="button" onPress={() => signOut()} hitSlop={10}>
            <T v="caption" style={{ color: ink.dim }}>
              Sign out
            </T>
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <T style={{ fontFamily: 'Bricolage-SemiBold', fontSize: 22, color: palette.ink }}>{initial}</T>
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: 'Bricolage-SemiBold', fontSize: 21, color: palette.ink }}>{name}</T>
            {sub.length > 0 && (
              <T v="caption" style={{ color: palette.moss, marginTop: 1 }}>
                {sub}
              </T>
            )}
            <T v="caption" style={{ color: palette.amber, marginTop: 3 }}>
              Keeper of {totals.shifts.toLocaleString()} shifts
            </T>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.topLight} />
          <T v="overline">From your record</T>
          <View style={styles.recRow}>
            <T v="caption" style={{ color: palette.moss }}>Longest stretch held</T>
            <T v="caption" style={{ color: ink.text }}>{record.longest} {record.longest === 1 ? 'shift' : 'shifts'}</T>
          </View>
          {record.topWord && (
            <View style={styles.recRow}>
              <T v="caption" style={{ color: palette.moss }}>Most-written word in wins</T>
              <T v="caption" style={{ color: palette.amber }}>"{record.topWord}"</T>
            </View>
          )}
          {record.topTag && (
            <View style={styles.recRow}>
              <T v="caption" style={{ color: palette.moss }}>Most-named tag</T>
              <T v="caption" style={{ color: ink.text }}>{record.topTag}</T>
            </View>
          )}
          {record.since && (
            <View style={styles.recRow}>
              <T v="caption" style={{ color: palette.moss }}>Keeping the record since</T>
              <T v="caption" style={{ color: ink.text }}>{record.since}</T>
            </View>
          )}
        </View>

        <View style={[styles.card, { padding: 0, marginTop: space(3) }]}>
          <View style={styles.topLight} />
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: space(3) }}>
              <T v="body">Reminder</T>
              <T v="whisper" style={{ marginTop: 2 }}>
                One gentle reminder after your next shift. No nagging, ever.
              </T>
            </View>
            <Switch value={reminderOn} onValueChange={toggleReminder} trackColor={{ true: palette.amber, false: glass.hi }} thumbColor={palette.ink} />
          </View>
          <Hairline />
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: space(3) }}>
              <T v="body">Career signals</T>
              <T v="whisper" style={{ marginTop: 2 }}>
                Pay context and eligibility — only when you ask.
              </T>
            </View>
            <Switch value={signalsOn} onValueChange={toggleSignals} trackColor={{ true: palette.moon, false: glass.hi }} thumbColor={palette.ink} />
          </View>
          <Hairline />
          <Row label="Export the record" value="soon" onPress={() => Alert.alert('Export is coming', 'The record is yours to take anywhere — PDF and CSV export lands soon.')} />
          {privacyUrl ? (
            <>
              <Hairline />
              <Row label="Privacy & data" onPress={() => Linking.openURL(privacyUrl)} />
            </>
          ) : null}
          <Hairline />
          <Row label="Resources" onPress={() => router.push('/resources')} />
        </View>

        <View style={[styles.card, { padding: 0, marginTop: space(3) }]}>
          <View style={styles.topLight} />
          <Row label={deleting ? 'Deleting…' : 'Delete account'} onPress={confirmDelete} danger />
        </View>

        <T v="whisper" style={styles.footer}>
          unwindRN isn’t medical care or therapy.{'\n'}In crisis, call or text{' '}
          <T v="whisper" style={{ color: palette.amber }}>988</T>.
        </T>
      </ScrollView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space(3.5), marginTop: space(5) },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: glass.hi,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,182,92,.5)',
    shadowColor: palette.amber,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  card: { backgroundColor: glass.fill, borderRadius: 16, padding: space(3.5), overflow: 'hidden', marginTop: space(4) },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: glass.hi },
  recRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(2.25) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space(4), paddingVertical: space(3.5) },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: ink.hairline, marginHorizontal: space(4) },
  footer: { textAlign: 'center', marginTop: space(8), lineHeight: 17 },
});
