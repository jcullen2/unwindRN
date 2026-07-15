import { useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, space, type } from '@/theme';

// Copy is verbatim from CLAUDE.md — do not edit without updating CLAUDE.md.
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
    <Screen style={{ paddingTop: insets.top, paddingBottom: insets.bottom + space(6) }}>
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
              <Image
                source={require('@/assets/images/splash-icon.png')}
                style={styles.mark}
                accessibilityLabel="unwindRN"
              />
            )}
            <Text style={styles.kicker}>{`${i + 1} / ${PAGES.length}`}</Text>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.body}>{p.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <View style={{ paddingHorizontal: space(6) }}>
        <Button title={page < PAGES.length - 1 ? 'Next' : 'Get started'} onPress={next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    justifyContent: 'center',
    paddingHorizontal: space(8),
  },
  mark: {
    width: 56,
    height: 56,
    marginBottom: space(6),
  },
  kicker: {
    ...type.overline,
    marginBottom: space(3),
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: -0.4,
    color: colors.amber,
  },
  body: {
    ...type.body,
    fontSize: 18,
    lineHeight: 29,
    color: colors.secondary,
    marginTop: space(4),
    maxWidth: 340,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space(2),
    marginVertical: space(6),
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.line,
  },
  dotActive: {
    backgroundColor: colors.amber,
    width: 20,
  },
});
