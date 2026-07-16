/**
 * Interim onboarding — the v1 three beats restyled onto the Sky. The
 * conversational 5-beat onboarding (voice + career estimate) is Session 4;
 * logged in DESIGN-DEBT.md.
 */
import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lamp } from '@/brand';
import { FlameButton, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { useAuth } from '@/lib/auth';
import { ink, palette, space } from '@/theme/tokens';

const PAGES = [
  {
    title: 'Put the shift down.',
    body: 'unwindRN is your post-shift debrief partner and career logbook. Talk it out. Keep the record.',
  },
  {
    title: 'Your patients stay private.',
    body: "Talk about your day, not your patients' identities. We never ask for names, rooms, or details that could identify a patient. That protects them — and your license.",
  },
  {
    title: 'Not therapy. Still yours.',
    body: "unwindRN isn't medical care or therapy. If you're in crisis, call or text 988. For everything else — we're here after every shift.",
  },
] as const;

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuth();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (page < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
      setPage(page + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <Sky>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + space(6) }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          style={{ flex: 1 }}>
          {PAGES.map((p, i) => (
            <View key={p.title} style={[styles.page, { width }]}>
              {i === 0 && (
                <View style={{ marginBottom: space(7) }}>
                  <Lamp size={52} />
                </View>
              )}
              <T v="overline" style={{ marginBottom: space(3) }}>
                {i + 1} / {PAGES.length}
              </T>
              <T v="greeting" style={{ fontSize: 32, lineHeight: 40 }}>
                {p.title}
              </T>
              <T v="body" style={styles.body}>
                {p.body}
              </T>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        <View style={{ paddingHorizontal: space(6) }}>
          <FlameButton title={page < PAGES.length - 1 ? 'Next' : "I'm in"} onPress={next} />
        </View>
      </View>
    </Sky>
  );
}

const styles = StyleSheet.create({
  page: {
    justifyContent: 'center',
    paddingHorizontal: space(8),
  },
  body: {
    fontSize: 17,
    lineHeight: 28,
    color: ink.secondary,
    marginTop: space(4),
    maxWidth: 330,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space(2),
    marginVertical: space(6),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ink.faint,
  },
  dotActive: {
    backgroundColor: palette.apricot,
    width: 18,
  },
});
