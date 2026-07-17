/**
 * The debrief — the companion, one question at a time (Deep Ward).
 *   Stage 1 · Taps: the partner asks five short things; a growing amber record
 *     line assembles as she answers. "That's the shift — keep it" saves; "or
 *     talk it down instead" opens voice; "Save without another word" is always
 *     one tap and never shamed.
 *   Stage 2 · Talk: on-device STT teleprompter, streaming partner, live chips
 *     from the per-turn utility call, TTS captions. Degrades to quiet-mode text.
 *     The record forms → /record. Crisis card surfaces over everything.
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
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanternGlyph } from '@/brand';
import { PulsingLantern } from '@/app/sign-in';
import { Chip, FlameButton, Glass, T } from '@/components/kit';
import { Sky } from '@/components/sky';
import { localToday, RecordDraft } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CRISIS_COPY, LOAD_LABELS, TAGS } from '@/lib/constants';
import { useCareerTotals, useInvalidateShiftData } from '@/lib/queries';
import { saveShift } from '@/lib/queue';
import { Json, supabase } from '@/lib/supabase';
import { speak, stopSpeaking } from '@/lib/tts';
import { ChatMessage, streamDebriefTurn, Taps, Utility } from '@/lib/turn';
import { useVoiceTurn } from '@/lib/voice';
import { glass, heat, ink, palette, space, type } from '@/theme/tokens';

const TURN_ERROR = "Couldn't reach your debrief partner. Try again.";
const HOUR_CHIPS = [8, 10, 12, 14, 16];
const RATIOS = ['1:2', '1:3', '1:4', '1:5', '1:6'];
const FLAGS = ['Floated', 'No break', 'Charge'];
const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000];
// The partner's five asks — one question at a time, floor-literate.
const ASKS: [string, string][] = [
  ['How long tonight?', 'Your usual is highlighted.'],
  ['How heavy did it carry?', 'Tap where it landed.'],
  ['How many were yours?', 'Ratio, plus anything that made it harder.'],
  ['What did tonight have?', 'Name it plainly. Skip what doesn’t fit.'],
  ['One line worth keeping?', 'It becomes the win in your record.'],
];

type Facts = {
  win: string | null;
  weight: string | null;
  lesson: string | null;
  hours: number | null;
  tags: string[];
};

/** Waveform — five amber bars breathing (§Motion `waveb`). */
function WaveBar({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0.3);
  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration: 500, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [v, delay, reduced]);
  const st = useAnimatedStyle(() => ({ height: 6 + v.value * 14 }));
  return <Animated.View style={[styles.wbar, st]} />;
}
function Waveform() {
  return (
    <View style={styles.waves}>
      {[0, 150, 300, 450, 600].map((d) => (
        <WaveBar key={d} delay={d} />
      ))}
    </View>
  );
}

/** Live chips — detected facts ignite beneath the teleprompter. */
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
        <Animated.View key={c} entering={ZoomIn.springify().damping(18).stiffness(180)}>
          <Chip label={c} selected />
        </Animated.View>
      ))}
    </View>
  );
}

export default function DebriefScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const totals = useCareerTotals();
  const invalidate = useInvalidateShiftData();
  const scrollRef = useRef<ScrollView>(null);
  const userId = session?.user.id;
  const usual = Number(profile?.usual_shift_hours ?? 12);
  const nextShiftNum = (totals.shifts + 1).toLocaleString();

  const [stage, setStage] = useState<'taps' | 'talk'>('taps');

  // Stage 1 — the companion's five asks. A live clock-out hands hours + night in.
  const params = useLocalSearchParams<{ hours?: string; night?: string }>();
  const handedHours = params.hours ? Number(params.hours) : null;
  const [ds, setDs] = useState(0);
  const [hours, setHours] = useState<number | null>(
    handedHours && Number.isFinite(handedHours) && handedHours > 0 && handedHours <= 24 ? handedHours : null
  );
  const [load, setLoad] = useState<number | null>(null);
  const [ratio, setRatio] = useState<string | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isNight] = useState(params.night === '1');
  const [savingTaps, setSavingTaps] = useState(false);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (loadTimer.current) clearTimeout(loadTimer.current); }, []);

  // The growing record line.
  const parts: string[] = [];
  if (hours != null) parts.push(`${hours}h`);
  if (load != null) parts.push(LOAD_LABELS[load - 1].toLowerCase());
  if (ratio) parts.push(ratio);
  flags.forEach((f) => parts.push(f.toLowerCase()));
  tags.forEach((t) => parts.push(t.toLowerCase()));
  const recordLine = parts.join(' · ');

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Stage 2 — conversation
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [partial, setPartial] = useState('');
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

  const taps: Taps = { hours: hours ?? usual, load, tags, is_night: isNight };

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
      // best-effort; the turn continues regardless
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
        setDraft(turn);
        Alert.alert(TURN_ERROR);
      } finally {
        setAwaiting(false);
        sendingRef.current = false;
      }
    },
    [userId, sessionId, quietMode, taps, mergeUtility, persistTranscript]
  );

  const voice = useVoiceTurn(sendTurn);

  const micPress = useCallback(() => {
    if (awaiting) return;
    if (quietMode || !voice.available) {
      sendTurn(draft);
      setDraft('');
      return;
    }
    if (voice.listening) voice.stop();
    else voice.start();
  }, [awaiting, quietMode, voice, draft, sendTurn]);

  const keepIt = async () => {
    if (!userId || savingTaps) return;
    setSavingTaps(true);
    const { synced } = await saveShift({
      user_id: userId,
      shift_date: localToday(),
      hours: hours ?? usual,
      load,
      tags,
      is_night: isNight,
      win: note.trim() || null,
      source: 'taps',
    });
    if (synced) await invalidate();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newTotal = totals.shifts + 1;
    if (synced && MILESTONES.includes(newTotal)) {
      router.replace({ pathname: '/milestone', params: { count: String(newTotal) } });
    } else {
      router.back();
    }
  };

  const wrapUp = () => {
    if (!sessionId) return;
    const f = factsRef.current;
    const record: RecordDraft = {
      shift_date: localToday(),
      hours: f.hours ?? hours ?? usual,
      load,
      win: f.win ?? note ?? '',
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

  const lastUserIdx = transcript.map((m) => m.role).lastIndexOf('user');

  const TopBar = ({ tone = 'taps' }: { tone?: 'taps' | 'talk' }) => (
    <View style={styles.top}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => {
          stopSpeaking();
          router.back();
        }}
        hitSlop={12}>
        <T style={{ color: ink.dim, fontSize: 20, lineHeight: 22 }}>✕</T>
      </Pressable>
      {tone === 'taps' ? (
        <View style={styles.shiftPill}>
          <T style={{ fontSize: 10.5, letterSpacing: 0.8, color: palette.amber }}>SHIFT #{nextShiftNum}</T>
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Support resources" onPress={() => router.push('/resources')} hitSlop={12}>
          <T v="caption" style={{ color: ink.dim }}>
            988
          </T>
        </Pressable>
      )}
      <View style={{ width: 20 }} />
    </View>
  );

  // ---------- STAGE 1 · The companion, one ask at a time ----------
  if (stage === 'taps') {
    const showStepNext = (ds === 2 && !!ratio) || ds === 3;
    return (
      <Sky>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1, paddingTop: insets.top + space(3), paddingHorizontal: space(6.5) }}>
            <TopBar />

            {recordLine.length > 0 && (
              <Glass warm style={styles.recordLine}>
                <LanternGlyph size={10} />
                <T style={{ fontSize: 12.5, color: palette.amber, lineHeight: 18, flex: 1 }}>{recordLine}</T>
              </Glass>
            )}

            <View style={styles.askBody}>
              <Animated.View key={ds} entering={FadeIn.duration(320)}>
                <T v="ask">{ASKS[ds][0]}</T>
                <T v="secondary" style={{ marginTop: space(1.5), color: ink.faint }}>
                  {ASKS[ds][1]}
                </T>
              </Animated.View>

              {/* ds0 — hours */}
              {ds === 0 && (
                <View style={styles.wrap}>
                  {HOUR_CHIPS.map((h) => (
                    <Chip
                      key={h}
                      label={`${h}h${h === usual ? ' · usual' : ''}`}
                      selected={hours === h}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setHours(h);
                        setDs(1);
                      }}
                    />
                  ))}
                </View>
              )}

              {/* ds1 — load segments */}
              {ds === 1 && (
                <>
                  <View style={styles.loadRow}>
                    {[1, 2, 3, 4, 5].map((l) => {
                      const on = load != null && l <= load;
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
                            if (loadTimer.current) clearTimeout(loadTimer.current);
                            loadTimer.current = setTimeout(() => setDs(2), 520);
                          }}
                          style={[styles.loadSeg, { backgroundColor: on ? heat[(load ?? 1) - 1] : glass.fill }]}
                        />
                      );
                    })}
                  </View>
                  <View style={styles.loadLabels}>
                    <T v="whisper">light</T>
                    <T v="caption" style={{ color: palette.amber }}>
                      {load ? LOAD_LABELS[load - 1] : ' '}
                    </T>
                    <T v="whisper">heavy</T>
                  </View>
                </>
              )}

              {/* ds2 — ratio + flags */}
              {ds === 2 && (
                <>
                  <View style={styles.wrap}>
                    {RATIOS.map((r) => (
                      <Chip key={r} label={r} selected={ratio === r} onPress={() => setRatio(r)} />
                    ))}
                  </View>
                  <View style={[styles.wrap, { marginTop: space(3) }]}>
                    {FLAGS.map((f) => (
                      <Chip key={f} label={f} selected={flags.includes(f)} onPress={() => toggle(flags, setFlags, f)} />
                    ))}
                  </View>
                </>
              )}

              {/* ds3 — tags */}
              {ds === 3 && (
                <View style={styles.wrap}>
                  {TAGS.map((t) => (
                    <Chip key={t} label={t} selected={tags.includes(t)} onPress={() => toggle(tags, setTags, t)} />
                  ))}
                </View>
              )}

              {/* ds4 — one line + keep it */}
              {ds === 4 && (
                <>
                  <View style={styles.noteField}>
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="Even three words."
                      placeholderTextColor={ink.faint}
                      keyboardAppearance="dark"
                      style={styles.noteInput}
                    />
                  </View>
                  <FlameButton title="That's the shift — keep it" onPress={keepIt} loading={savingTaps} style={{ marginTop: space(5.5) }} />
                  <Pressable accessibilityRole="button" onPress={() => setStage('talk')} style={{ paddingVertical: space(3), alignItems: 'center' }}>
                    <T v="secondary" style={{ color: palette.moon }}>
                      or talk it down instead
                    </T>
                  </Pressable>
                </>
              )}

              {showStepNext && (
                <Pressable accessibilityRole="button" onPress={() => setDs((d) => Math.min(4, d + 1))} style={styles.nextBtn}>
                  <T v="body" style={{ fontWeight: '600' }}>
                    Next
                  </T>
                </Pressable>
              )}
            </View>

            {ds !== 4 && (
              <Pressable
                accessibilityRole="button"
                onPress={keepIt}
                disabled={savingTaps}
                style={{ alignItems: 'center', paddingBottom: Math.max(insets.bottom, space(5)), paddingTop: space(2) }}>
                <T v="caption" style={{ color: ink.faint }}>
                  {savingTaps ? 'Saving…' : 'Save without another word'}
                </T>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Sky>
    );
  }

  // ---------- STAGE 2 · Talk it down ----------
  const voiceLive = !quietMode && voice.available;
  const idle = transcript.length === 0 && !voice.interim && !awaiting;
  return (
    <Sky>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: insets.top + space(3), paddingHorizontal: space(6) }}>
          <TopBar tone="talk" />
        </View>

        {idle ? (
          <View style={styles.idleWrap}>
            <PulsingLantern size={44} />
            <T v="ask" style={{ textAlign: 'center', color: ink.dim, marginTop: space(6) }}>
              How was today?
            </T>
            {voiceLive && (
              <View style={{ marginTop: space(5) }}>
                <Waveform />
              </View>
            )}
            <T v="whisper" style={{ textAlign: 'center', marginTop: space(5) }}>
              {voiceLive
                ? 'Transcribed on your phone. Your voice never leaves it.'
                : 'Type it out — the record writes itself.'}
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
                    <LanternGlyph size={13} />
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
                    <LanternGlyph size={13} />
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

        {(transcript.filter((m) => m.role === 'user').length >= 1 || capped) && !awaiting && (
          <View style={{ paddingHorizontal: space(6), marginBottom: space(2), gap: space(2.5) }}>
            <FlameButton title="That's the shift — keep it" onPress={wrapUp} />
          </View>
        )}

        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, space(4)) }]}>
          {voiceLive ? (
            <>
              <View style={{ width: 44 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={voice.listening ? 'Listening — tap to finish your turn' : 'Talk'}
                onPress={micPress}>
                <PulsingLantern size={52} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch to typing"
                onPress={() => setQuietMode(true)}
                hitSlop={10}
                style={{ width: 44, alignItems: 'center' }}>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                onPress={() => {
                  sendTurn(draft);
                  setDraft('');
                }}
                disabled={!draft.trim() || awaiting}
                style={[styles.sendBtn, { opacity: !draft.trim() || awaiting ? 0.4 : 1 }]}>
                <T style={{ color: palette.night, fontWeight: '700', fontSize: 18 }}>↑</T>
              </Pressable>
              {voice.available && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to voice"
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

        <Pressable accessibilityRole="button" onPress={() => setStage('taps')} style={{ alignItems: 'center', paddingBottom: Math.max(insets.bottom, space(3)) }}>
          <T v="caption" style={{ color: ink.faint }}>
            back to taps
          </T>
        </Pressable>
      </KeyboardAvoidingView>

      <Modal visible={crisisVisible} transparent animationType="fade" onRequestClose={() => setCrisisVisible(false)}>
        <View style={styles.crisisDim}>
          <Glass style={{ padding: space(6) }}>
            <T v="ask" style={{ textAlign: 'center' }}>
              You matter.
            </T>
            <T v="secondary" style={{ textAlign: 'center', marginTop: space(3) }}>
              {CRISIS_COPY.replace('You matter. ', '')}
            </T>
            <FlameButton title="Call 988" onPress={() => Linking.openURL('tel:988')} style={{ marginTop: space(5) }} />
            <Pressable accessibilityRole="button" onPress={() => setCrisisVisible(false)} style={{ alignItems: 'center', paddingVertical: space(3.5) }}>
              <T v="secondary">Keep talking</T>
            </Pressable>
          </Glass>
        </View>
      </Modal>
    </Sky>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space(1) },
  shiftPill: {
    backgroundColor: 'rgba(255,182,92,.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,182,92,.3)',
    borderRadius: 12,
    paddingVertical: space(1),
    paddingHorizontal: space(2.75),
  },
  recordLine: { marginTop: space(4), padding: space(3), flexDirection: 'row', alignItems: 'center', gap: space(2.25) },
  askBody: { flex: 1, justifyContent: 'center', paddingBottom: space(14) },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(6) },
  loadRow: { flexDirection: 'row', gap: space(1.5), marginTop: space(6) },
  loadSeg: { flex: 1, height: 40, borderRadius: 12 },
  loadLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space(2) },
  noteField: {
    marginTop: space(6),
    backgroundColor: glass.fill,
    borderRadius: 16,
    paddingHorizontal: space(4),
    paddingVertical: space(3.5),
  },
  noteInput: { color: palette.ink, fontSize: 15, lineHeight: 22, padding: 0, minHeight: 24 },
  nextBtn: {
    marginTop: space(5.5),
    borderRadius: 18,
    paddingVertical: space(3.25),
    alignItems: 'center',
    backgroundColor: glass.hi,
  },
  idleWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(10) },
  stream: { paddingHorizontal: space(6), paddingTop: space(4), paddingBottom: space(4) },
  partnerLine: { flexDirection: 'row', gap: space(2.5), marginBottom: space(5), paddingRight: space(4) },
  waves: { flexDirection: 'row', gap: 3, height: 22, alignItems: 'center', justifyContent: 'center' },
  wbar: { width: 3, borderRadius: 2, backgroundColor: palette.amber },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), paddingHorizontal: space(6), paddingBottom: space(2) },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
    paddingHorizontal: space(5),
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
    paddingVertical: space(3),
    maxHeight: 120,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crisisDim: { flex: 1, backgroundColor: 'rgba(9,15,14,.82)', justifyContent: 'center', padding: space(6) },
});
