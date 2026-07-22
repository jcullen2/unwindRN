/**
 * A single day in the record (Deep Ward) — date + amber dash, amber pills for
 * hours & load, a moon-mint night pill, then the win and the weight as glass
 * cards. weight = the emotional note, never the load.
 */
import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageTitle, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { LOAD_LABELS } from '@/lib/constants';
import { useShift } from '@/lib/queries';
import { glass, ink, palette, space } from '@/theme/tokens';

function Pill({ children, tone = 'amber' }: { children: string; tone?: 'amber' | 'moon' }) {
  const amber = tone === 'amber';
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: amber ? 'rgba(255,182,92,.13)' : 'rgba(155,199,189,.12)',
          borderColor: amber ? 'rgba(255,182,92,.35)' : 'transparent',
          borderWidth: amber ? 1 : 0,
        },
      ]}>
      <T v="caption" style={{ color: amber ? palette.amber : palette.moon }}>
        {children}
      </T>
    </View>
  );
}

function Note({ label, value, dim }: { label: string; value: string | null; dim?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.card}>
      <View style={styles.topLight} />
      <T v="overline">{label}</T>
      <T v="body" style={{ marginTop: space(1.5), lineHeight: 24, color: dim ? palette.moss : palette.ink }}>
        {value}
      </T>
    </View>
  );
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: shift, isLoading } = useShift(id);

  if (isLoading || !shift) {
    return (
      <Sky>
        <View style={{ flex: 1, justifyContent: 'center', padding: space(8) }}>
          {!isLoading && <T v="secondary">This shift isn’t in the record.</T>}
        </View>
      </Sky>
    );
  }

  const d = parseISO(shift.shift_date);

  return (
    <Sky>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space(3), paddingHorizontal: space(6), paddingBottom: space(20) }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <T v="caption" style={{ color: palette.moss }}>
            ‹ Back
          </T>
        </Pressable>

        <PageTitle style={{ marginTop: space(2) }}>{format(d, 'EEEE, MMM d')}</PageTitle>

        <View style={styles.pills}>
          <Pill>{`${Number(shift.hours)} hours`}</Pill>
          {shift.load != null && <Pill>{LOAD_LABELS[shift.load - 1]}</Pill>}
          {shift.is_night && <Pill tone="moon">night</Pill>}
        </View>

        {(shift.tags?.length ?? 0) > 0 && (
          <View style={styles.tags}>
            {shift.tags!.map((t) => (
              <View key={t} style={styles.tag}>
                <T v="caption" style={{ color: palette.moss }}>
                  {t}
                </T>
              </View>
            ))}
          </View>
        )}

        <View style={{ gap: space(2.5), marginTop: space(5.5) }}>
          <Note label="The win" value={shift.win} />
          <Note label="The weight" value={shift.weight} dim />
          <Note label="Lesson" value={shift.lesson} dim />
          {!shift.win && !shift.weight && !shift.lesson && (
            <View style={styles.card}>
              <View style={styles.topLight} />
              <T v="secondary">No notes on this one — it still counts.</T>
            </View>
          )}
        </View>

        <T v="whisper" style={{ marginTop: space(4) }}>
          {shift.source === 'taps' ? 'Saved without another word' : 'Saved from a debrief'}
        </T>
      </ScrollView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', backgroundColor: glass.fill, borderRadius: 14, paddingVertical: space(1.5), paddingHorizontal: space(3) },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.75), marginTop: space(4.5) },
  pill: { borderRadius: 12, paddingVertical: space(1.5), paddingHorizontal: space(3) },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  tag: { backgroundColor: glass.fill, borderRadius: 12, paddingVertical: space(1.5), paddingHorizontal: space(3) },
  card: { backgroundColor: glass.fill, borderRadius: 16, padding: space(4), overflow: 'hidden' },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: glass.hi },
});
