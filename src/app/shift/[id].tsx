import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { LOAD_LABELS } from '@/lib/constants';
import { useShift } from '@/lib/queries';
import { fonts, glass, heat, ink, palette, space } from '@/theme/tokens';

function Section({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={{ marginTop: space(5) }}>
      <T v="overline" style={{ color: palette.apricot }}>
        {label}
      </T>
      <T v="body" style={{ marginTop: space(1.5), lineHeight: 25 }}>
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
          {!isLoading && <T v="secondary">This shift isn't in the record.</T>}
        </View>
      </Sky>
    );
  }

  const d = parseISO(shift.shift_date);
  const loadStep = shift.load != null ? shift.load - 1 : null;

  return (
    <Sky>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space(3),
          paddingHorizontal: space(6),
          paddingBottom: space(30),
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={{ alignSelf: 'flex-start', paddingVertical: space(2) }}>
          <T style={{ color: ink.dim, fontSize: 22, lineHeight: 24 }}>‹</T>
        </Pressable>

        <T style={styles.month}>{format(d, 'MMMM')}</T>
        <T v="greeting" style={{ fontSize: 26, lineHeight: 32, marginTop: 2 }}>
          {format(d, 'EEEE d')}
        </T>

        <View style={styles.metaRow}>
          <T v="secondary">{Number(shift.hours)} hours</T>
          {loadStep != null && (
            <View style={styles.loadWrap}>
              <View style={[styles.loadDot, { backgroundColor: heat[loadStep] }]} />
              <T v="secondary">{LOAD_LABELS[loadStep]}</T>
            </View>
          )}
          {shift.is_night && (
            <View style={styles.loadWrap}>
              <View style={[styles.loadDot, { backgroundColor: palette.violet, borderRadius: 1 }]} />
              <T v="secondary">Night</T>
            </View>
          )}
        </View>

        {(shift.tags?.length ?? 0) > 0 && (
          <View style={styles.tags}>
            {shift.tags!.map((t) => (
              <View key={t} style={styles.tag}>
                <T v="caption" style={{ color: palette.apricot }}>
                  {t}
                </T>
              </View>
            ))}
          </View>
        )}

        <Glass style={{ marginTop: space(5) }}>
          <Section label="Win" value={shift.win} />
          <Section label="The weight" value={shift.weight} />
          <Section label="Lesson" value={shift.lesson} />
          {!shift.win && !shift.weight && !shift.lesson && (
            <T v="secondary">No notes on this one — it still counts.</T>
          )}
        </Glass>

        <T v="whisper" style={{ marginTop: space(4) }}>
          {shift.source === 'taps' ? 'Saved without talking' : 'Saved from a debrief'}
        </T>
      </ScrollView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  month: {
    fontFamily: fonts.serif500,
    fontSize: 15,
    lineHeight: 20,
    color: palette.apricot,
    marginTop: space(2),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(5),
    marginTop: space(3),
  },
  loadWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  loadDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
    marginTop: space(4),
  },
  tag: {
    backgroundColor: glass.fill,
    borderRadius: 14,
    paddingVertical: space(1.5),
    paddingHorizontal: space(3),
  },
});
