/**
 * The debrief flow behind the flame orb — three stages (CLAUDE.md):
 *   1. Clock-out taps (20 seconds, thumb-only; "Save without talking" always)
 *   2. Voice conversation — on-device STT teleprompter, streaming partner,
 *      live chips from the per-turn utility call, TTS captions. Degrades to
 *      quiet-mode text ("Aa") wherever STT is unavailable.
 *   3. The record, forming → /record (glass fields, editable, save).
 */
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameGlyph } from '@/brand';
import { FlameButton, Glass, QuietButton, T } from '@/components/kit';
import { FlameOrb } from '@/components/nav-pill';
import { Sky } from '@/components/sky';
import { localToday, RecordDraft } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CRISIS_COPY, LOAD_LABELS, TAGS } from '@/lib/constants';
import { useInvalidateShiftData } from '@/lib/queries';
import { saveShift } from '@/lib/queue';
import { Json, supabase } from '@/lib/supabase';
import { speak, stopSpeaking } from '@/lib/tts';
import { ChatMessage, streamDebriefTurn, Taps, Utility } from '@/lib/turn';
import { useVoiceTurn } from '@/lib/voice';
import { glass, heat, ink, palette, space, type } from '@/theme/tokens';

const TURN_ERROR = "Couldn't reach your debrief partner. Try again.";
const HOURS_CHIPS = [8, 10, 12, 12.5, 14, 16];
const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000];

type Facts = {
  win: string | null;
  weight: string | null;
  lesson: string | null;
  hours: number | null;
  tags: string[];
};

function ThinkingBar({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0.4);
  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 420, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [v, delay, reduced]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: v.value }] }));
  return <Animated.View style={[styles.bar, st]} />;
}

function Waveform() {
  return (
    <View style={styles.bars}>
      <ThinkingBar delay={0} />
      <ThinkingBar delay={140} />
      <ThinkingBar delay={280} />
    </View>
  );
}

/** Live chips — detected facts ignite beneath the teleprompter (§6). */
function LiveChips({ facts }: { facts: Facts }) {
  const chips: string[] = [
    ...facts.tags,
    ...(facts.hours != null ? [`${facts.hours}h`] : []),
    ...(facts.win ? ['Win, caught'] : []),
    ...(facts.weight ? ['The weight, named'] : []),
    ...(facts.lesson ? ['Lesson, kept'] : []),
  ];
  if (chips.length === 0) return null;
  return (
    <View style={styles.chipRow}>
      {chips.map((c) => (
        <Animated.View key={c} entering={ZoomIn.springify().damping(18).stiffness(180)} style={styles.liveChip}>
          <T v="caption" style={{ color: palette.apricot }}>
            {c}
          </T>
        </Animated.View>
      ))}
    </View>
  );
}

export default function DebriefScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const invalidate = useInvalidateShiftData();
  const scrollRef = useRef<ScrollView>(null);
  const userId = session?.user.id;
  const usual = Number(profile?.usual_shift_hours ?? 12);

  const [stage, setStage] = useState<'taps' | 'talk'>('taps');

  // Stage 1 — clock-out taps. A live clock-out hands elapsed hours + night in.
  const params = useLocalSearchParams<{ hours?: string; night?: string }>();
  const handedHours = params.hours ? Number(params.hours) : null;
  const nearestChip = HOURS_CHIPS.reduce((a, b) =>
    Math.abs(b - usual) < Math.abs(a - usual) ? b : a
  );
  const [hours, setHours] = useState<number>(
    handedHours && Number.isFinite(handedHours) && handedHours > 0 && handedHours <= 24
      ? handedHours
      : nearestChip
  );
  const [load, setLoad] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isNight, setIsNight] = useState(params.night === '1');
  const [savingTaps, setSavingTaps] = useState(false);

  // Stage 2 — conversation
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [partial, setPartial] = useState(''); // partner reply, streaming in
  const [awaiting, setAwaiting] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [draft, setDraft] = useState('');
  const [capped, setCapped] = useState(false);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const [facts, setFacts] = useState<Facts>({ win: null, weight: null, lesson: null, hours: null, tags: [] });

  const sendingRef = useRef(false);
  const transcriptRef = useRef<ChatMessage[]>([]);
  const factsRef = useRef(facts);
  const latencies = useRef<number[]>([]);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    factsRef.current = facts;
  }, [facts]);
  useEffect(() => () => stopSpeaking(), []);

  const taps: Taps = { hours, load, tags, is_night: isNight };

  const mergeUtility = useCallback((u: Utility) => {
    if (u.crisis) {
      setCrisisVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setFacts((prev) => {
      const next: Facts = {
        win: u.win ?? prev.win,
        weight: u.weight ?? prev.weight,
        lesson: u.lesson ?? prev.lesson,
        hours: u.hours_mentioned ?? prev.hours,
        tags: [...new Set([...prev.tags, ...u.tags_detected])],
      };
      const grew =
        next.tags.length > prev.tags.length ||
        (!prev.win && next.win) ||
        (!prev.weight && next.weight) ||
        (!prev.lesson && next.lesson);
      if (grew) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return next;
    });
  }, []);

  const persistTranscript = useCallback(async (sid: string, t: ChatMessage[]) => {
    try {
      await supabase
        .from('debrief_sessions')
        .update({ transcript: t as unknown as Json })
        .eq('id', sid);
    } catch {
      // transcript persistence is best-effort; the turn continues regardless
    }
  }, []);

  const sendTurn = useCallback(
    async (text: string) => {
      const turn = text.trim();
      if (!turn || !userId || sendingRef.current) return;
      sendingRef.current = true;
      stopSpeaking();
      try {
        let sid = sessionId;
        if (!sid) {
          const { data, error } = await supabase
            .from('debrief_sessions')
            .insert({ user_id: userId, mode: quietMode ? 'text' : 'voice' })
            .select('id')
            .single();
          if (error) throw error;
          sid = data.id;
          setSessionId(sid);
        }
        const prior = transcriptRef.current;
        const withUser = [...prior, { role: 'user' as const, content: turn }];
        setTranscript(withUser);
        setAwaiting(true);
        setPartial('');
        persistTranscript(sid!, withUser);

        const t0 = Date.now();
        let first = 0;
        const { reply, capped: hitCap } = await streamDebriefTurn({
          taps,
          transcript: prior,
          userTurn: turn,
          onDelta: (chunk) => {
            if (!first) {
              first = Date.now() - t0;
              latencies.current.push(first);
              if (__DEV__) {
                const sorted = [...latencies.current].sort((a, b) => a - b);
                const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
                console.log(
                  `[debrief] first-token ${first}ms · P50 ${q(0.5)}ms · P90 ${q(0.9)}ms (target <1500ms voice-to-voice)`
                );
              }
            }
            setPartial((p) => p + chunk);
          },
          onUtility: mergeUtility,
        });

        const withReply = [...withUser, { role: 'assistant' as const, content: reply }];
        setTranscript(withReply);
        setPartial('');
        if (hitCap) setCapped(true);
        persistTranscript(sid!, withReply);
        if (!quietMode) speak(reply);
      } catch {
        setPartial('');
        setDraft(turn); // hand her words back
        Alert.alert(TURN_ERROR);
      } finally {
        setAwaiting(false);
        sendingRef.current = false;
      }
    },
    [userId, sessionId, quietMode, taps, mergeUtility, persistTranscript]
  );

  const voice = useVoiceTurn(sendTurn);

  const orbPress = useCallback(() => {
    if (awaiting) return;
    if (quietMode || !voice.available) {
      sendTurn(draft);
      setDraft('');
      return;
    }
    if (voice.listening) voice.stop();
    else voice.start();
  }, [awaiting, quietMode, voice, draft, sendTurn]);

  const saveWithoutTalking = async () => {
    if (!userId || savingTaps) return;
    setSavingTaps(true);
    const { synced } = await saveShift({
      user_id: userId,
      shift_date: localToday(),
      hours,
      load,
      tags,
      is_night: isNight,
      source: 'taps',
    });
    if (synced) await invalidate();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const wrapUp = () => {
    if (!sessionId) return;
    const f = factsRef.current;
    const record: RecordDraft = {
      shift_date: localToday(),
      hours: f.hours ?? hours,
      load,
      win: f.win ?? '',
      weight: f.weight ?? '',
      lesson: f.lesson ?? '',
      tags: [...new Set([...tags, ...f.tags])],
      is_night: isNight,
      source: 'both',
    };
    stopSpeaking();
    router.push({
      pathname: '/record',
      params: { mode: 'confirm', sessionId, draft: JSON.stringify(record) },
    });
  };

  const userTurns = transcript.filter((m) => m.role === 'user');
  const lastUserIdx = transcript.map((m) => m.role).lastIndexOf('user');

  // ---------- STAGE 1 · Clock out ----------
  if (stage === 'taps') {
    return (
      <Sky>
        <View style={{ flex: 1, paddingTop: insets.top + space(3), paddingHorizontal: space(6) }}>
          <View style={styles.top}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
              <T style={{ color: ink.dim, fontSize: 20, lineHeight: 22 }}>✕</T>
            </Pressable>
            <T v="whisper">Yours alone. Patients stay unnamed.</T>
            <View style={{ width: 20 }} />
          </View>

          <T v="greeting" style={{ fontSize: 26, lineHeight: 33, marginTop: space(6) }}>
            Clock out.
          </T>

          <T v="overline" style={{ marginTop: space(6), marginBottom: space(2) }}>
            Hours
          </T>
          <View style={styles.chipWrap}>
            {HOURS_CHIPS.map((h) => {
              const on = hours === h;
              return (
                <Pressable
                  key={h}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setHours(h);
                  }}
                  style={[styles.tapChip, on && styles.tapChipOn]}>
                  <T v="secondary" style={{ color: on ? palette.apricot : ink.secondary }}>
                    {h}h
                  </T>
                </Pressable>
              );
            })}
          </View>

          <T v="overline" style={{ marginTop: space(5), marginBottom: space(2) }}>
            Load
          </T>
          <View style={styles.loadRow}>
            {[1, 2, 3, 4, 5].map((l) => {
              const selected = load != null && l <= load;
              return (
                <Pressable
                  key={l}
                  accessibilityRole="button"
                  accessibilityLabel={`Load ${LOAD_LABELS[l - 1]}`}
                  onPress={() => {
                    Haptics.impactAsync(
                      [
                        Haptics.ImpactFeedbackStyle.Light,
                        Haptics.ImpactFeedbackStyle.Light,
                        Haptics.ImpactFeedbackStyle.Medium,
                        Haptics.ImpactFeedbackStyle.Medium,
                        Haptics.ImpactFeedbackStyle.Heavy,
                      ][l - 1]
                    );
                    setLoad(l);
                  }}
                  style={[
                    styles.loadSeg,
                    { backgroundColor: selected ? heat[(load ?? 1) - 1] : glass.fill },
                  ]}
                />
              );
            })}
          </View>
          <T v="whisper" style={{ textAlign: 'center', marginTop: space(1.5) }}>
            {load ? LOAD_LABELS[load - 1] : 'Light … Brutal'}
          </T>

          <T v="overline" style={{ marginTop: space(5), marginBottom: space(2) }}>
            Tonight had
          </T>
          <View style={styles.chipWrap}>
            {TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTags((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]));
                  }}
                  style={[styles.tapChip, on && styles.tapChipOn]}>
                  <T v="caption" style={{ color: on ? palette.apricot : ink.dim }}>
                    {t}
                  </T>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: isNight }}
            onPress={() => setIsNight((v) => !v)}
            style={styles.nightRow}>
            <View style={[styles.nightTick, { opacity: isNight ? 1 : 0.25 }]} />
            <T v="secondary" style={{ color: isNight ? ink.text : ink.dim }}>
              Night shift
            </T>
          </Pressable>

          <View style={{ flex: 1 }} />
          <FlameButton title="Talk it down" onPress={() => setStage('talk')} />
          <QuietButton
            title={savingTaps ? 'Saving…' : 'Save without talking'}
            onPress={saveWithoutTalking}
            disabled={savingTaps}
            tone="dim"
            style={{ marginTop: space(2), marginBottom: Math.max(insets.bottom, space(4)) }}
          />
        </View>
      </Sky>
    );
  }

  // ---------- STAGE 2 · The conversation ----------
  const voiceLive = !quietMode && voice.available;
  return (
    <Sky>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.top, { paddingTop: insets.top + space(3), paddingHorizontal: space(5) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close debrief" onPress={() => { stopSpeaking(); router.back(); }} hitSlop={12}>
            <T style={{ color: ink.dim, fontSize: 20, lineHeight: 22 }}>✕</T>
          </Pressable>
          <T v="whisper">
            {voiceLive
              ? 'Transcribed on your phone. Your voice never leaves it.'
              : 'Yours alone. Patients stay unnamed.'}
          </T>
          <Pressable accessibilityRole="button" accessibilityLabel="Support resources" onPress={() => router.push('/resources')} hitSlop={12}>
            <T v="caption" style={{ color: ink.dim }}>
              988
            </T>
          </Pressable>
        </View>

        {transcript.length === 0 && !voice.interim ? (
          <View style={styles.emptyWrap}>
            <T v="teleprompter" style={{ textAlign: 'center', color: ink.dim }}>
              How was today?
            </T>
            <T v="whisper" style={{ textAlign: 'center', marginTop: space(3) }}>
              {voiceLive ? 'Tap the flame and just talk.' : 'Type it out — the record writes itself.'}
            </T>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.stream}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="interactive">
            {transcript.map((m, i) =>
              m.role === 'user' ? (
                <T
                  key={i}
                  v="teleprompter"
                  style={{ color: i === lastUserIdx && !voice.interim ? ink.text : ink.faint, marginBottom: space(4) }}>
                  {m.content}
                </T>
              ) : (
                <View key={i} style={styles.partnerLine}>
                  <View style={{ marginTop: 5 }}>
                    <FlameGlyph size={13} />
                  </View>
                  <T v="partnerCaption" style={{ flex: 1 }}>
                    {m.content}
                  </T>
                </View>
              )
            )}
            {voice.interim ? (
              <T v="teleprompter" style={{ marginBottom: space(4) }}>
                {voice.interim}
              </T>
            ) : null}
            {awaiting &&
              (partial ? (
                <View style={styles.partnerLine}>
                  <View style={{ marginTop: 5 }}>
                    <FlameGlyph size={13} />
                  </View>
                  <T v="partnerCaption" style={{ flex: 1 }}>
                    {partial}
                  </T>
                </View>
              ) : (
                <Waveform />
              ))}
          </ScrollView>
        )}

        <LiveChips facts={facts} />

        {(userTurns.length >= 2 || capped) && !awaiting && (
          <QuietButton
            title="That's the shift"
            onPress={wrapUp}
            tone={capped ? 'bone' : 'dim'}
            style={{ marginHorizontal: space(10), minHeight: 44, paddingVertical: space(2.5), marginBottom: space(2) }}
          />
        )}

        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, space(3)) }]}>
          {voiceLive ? (
            <>
              <View style={{ width: 40 }} />
              <View style={{ alignItems: 'center' }}>
                <FlameOrb
                  size={58}
                  onPress={orbPress}
                  label={voice.listening ? 'Listening — tap to finish your turn' : 'Talk'}
                />
                {voice.listening && (
                  <View style={{ marginTop: space(2) }}>
                    <Waveform />
                  </View>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch to typing"
                onPress={() => setQuietMode(true)}
                hitSlop={10}
                style={{ width: 40, alignItems: 'center' }}>
                <T v="secondary" style={{ color: ink.dim }}>
                  Aa
                </T>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Put it down…"
                placeholderTextColor={ink.faint}
                keyboardAppearance="dark"
                multiline
              />
              <View style={{ opacity: !draft.trim() || awaiting ? 0.45 : 1 }}>
                <FlameOrb
                  size={46}
                  onPress={() => {
                    sendTurn(draft);
                    setDraft('');
                  }}
                  label="Send"
                />
              </View>
              {voice.available && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Switch to voice"
                  onPress={() => setQuietMode(false)}
                  hitSlop={10}>
                  <T v="secondary" style={{ color: ink.dim }}>
                    🎙
                  </T>
                </Pressable>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={crisisVisible} transparent animationType="fade" onRequestClose={() => setCrisisVisible(false)}>
        <View style={styles.crisisDim}>
          <Glass style={{ padding: space(6) }}>
            <T v="greeting" style={{ fontSize: 24, lineHeight: 30, textAlign: 'center' }}>
              You matter.
            </T>
            <T v="secondary" style={{ textAlign: 'center', marginTop: space(3) }}>
              {CRISIS_COPY.replace('You matter. ', '')}
            </T>
            <FlameButton title="Call 988" onPress={() => Linking.openURL('tel:988')} style={{ marginTop: space(5) }} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setCrisisVisible(false)}
              style={{ alignItems: 'center', paddingVertical: space(3.5) }}>
              <T v="secondary">Keep talking</T>
            </Pressable>
          </Glass>
        </View>
      </Modal>
    </Sky>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: space(2),
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  tapChip: {
    backgroundColor: glass.fill,
    borderRadius: 18,
    paddingVertical: space(2.5),
    paddingHorizontal: space(3.5),
  },
  tapChipOn: {
    backgroundColor: 'rgba(255,104,70,.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,173,114,.35)',
  },
  loadRow: {
    flexDirection: 'row',
    gap: space(1.5),
  },
  loadSeg: {
    flex: 1,
    height: 36,
    borderRadius: 8,
  },
  nightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(5),
  },
  nightTick: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: palette.violet,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(10),
  },
  stream: {
    paddingHorizontal: space(6),
    paddingTop: space(6),
    paddingBottom: space(4),
  },
  partnerLine: {
    flexDirection: 'row',
    gap: space(2.5),
    marginBottom: space(5),
    paddingRight: space(4),
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    height: 18,
    alignItems: 'center',
  },
  bar: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: palette.apricot,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
    paddingHorizontal: space(6),
    paddingBottom: space(2),
  },
  liveChip: {
    backgroundColor: 'rgba(255,104,70,.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,173,114,.35)',
    borderRadius: 14,
    paddingVertical: space(1.5),
    paddingHorizontal: space(3),
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space(3),
    paddingHorizontal: space(4),
    paddingTop: space(2),
  },
  input: {
    flex: 1,
    backgroundColor: glass.fill,
    borderRadius: 18,
    color: ink.text,
    fontSize: type.body.fontSize,
    lineHeight: 21,
    paddingHorizontal: space(4),
    paddingTop: space(3),
    paddingBottom: space(3),
    maxHeight: 120,
  },
  crisisDim: {
    flex: 1,
    backgroundColor: 'rgba(10,10,9,.78)',
    justifyContent: 'center',
    padding: space(6),
  },
});
