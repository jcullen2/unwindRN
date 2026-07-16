/**
 * The debrief modal — quiet mode (typed). Teleprompter register per DESIGN.md
 * §6: her words in Fraunces, history fading, the partner as a captioned line
 * under the flame speaker mark. No bubbles, no chat log. The voice pipeline
 * (Session 2) slots into this same screen.
 */
import { useRouter } from 'expo-router';
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
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameGlyph } from '@/brand';
import { FlameButton, Glass, QuietButton, T } from '@/components/kit';
import { FlameOrb } from '@/components/nav-pill';
import { Sky } from '@/components/sky';
import { ChatMessage, localToday, requestDebriefReply, requestExtraction } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CRISIS_COPY } from '@/lib/constants';
import { Json, supabase } from '@/lib/supabase';
import { glass, ink, palette, space, type } from '@/theme/tokens';

const REPLY_ERROR = "Couldn't reach your debrief partner. Try again.";

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

/** Apricot waveform bars — the partner is thinking (§6). */
function ThinkingBars() {
  return (
    <View style={styles.bars}>
      <ThinkingBar delay={0} />
      <ThinkingBar delay={140} />
      <ThinkingBar delay={280} />
    </View>
  );
}

export default function DebriefScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [awaiting, setAwaiting] = useState(false);
  const [wrapping, setWrapping] = useState(false);
  const [crisisVisible, setCrisisVisible] = useState(false);

  const sendingRef = useRef(false);
  const transcriptRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const userId = session?.user.id;

  // Resume tonight's open session if one exists.
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('debrief_sessions')
      .select('id, transcript')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setSessionId(data.id);
        const t = Array.isArray(data.transcript) ? (data.transcript as unknown as ChatMessage[]) : [];
        setTranscript(t.filter((m) => m && typeof m.content === 'string'));
      });
  }, [userId]);

  const persistTranscript = useCallback(async (sid: string, t: ChatMessage[]) => {
    await supabase
      .from('debrief_sessions')
      .update({ transcript: t as unknown as Json })
      .eq('id', sid);
  }, []);

  const send = async () => {
    const text = draft.trim();
    if (!text || !userId || sendingRef.current || awaiting || wrapping) return;
    sendingRef.current = true;
    setDraft('');
    try {
      let sid = sessionId;
      if (!sid) {
        const { data, error } = await supabase
          .from('debrief_sessions')
          .insert({ user_id: userId, mode: 'text' })
          .select('id')
          .single();
        if (error) throw error;
        sid = data.id;
        setSessionId(sid);
      }
      const withUser = [...transcriptRef.current, { role: 'user' as const, content: text }];
      setTranscript(withUser);
      setAwaiting(true);
      persistTranscript(sid!, withUser).catch(() => {});

      const { reply, crisis } = await requestDebriefReply(withUser);
      if (crisis) setCrisisVisible(true);
      const withReply = [...withUser, { role: 'assistant' as const, content: reply }];
      setTranscript(withReply);
      persistTranscript(sid!, withReply).catch(() => {});
    } catch {
      setDraft(text);
      Alert.alert(REPLY_ERROR);
    } finally {
      setAwaiting(false);
      sendingRef.current = false;
    }
  };

  const wrapUp = async () => {
    const t = transcriptRef.current;
    if (!sessionId || t.length === 0 || wrapping || awaiting) return;
    setWrapping(true);
    try {
      const recordDraft = await requestExtraction(t);
      router.push({
        pathname: '/record',
        params: { mode: 'confirm', sessionId, draft: JSON.stringify(recordDraft) },
      });
    } catch {
      router.push({
        pathname: '/record',
        params: {
          mode: 'confirm',
          sessionId,
          draft: JSON.stringify({ shift_date: localToday(), hours: null, load: null, win: '', weight: '', lesson: '' }),
        },
      });
    } finally {
      setWrapping(false);
    }
  };

  const userTurns = transcript.filter((m) => m.role === 'user');
  const lastUserIdx = transcript.map((m) => m.role).lastIndexOf('user');

  return (
    <Sky>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.top, { paddingTop: insets.top + space(3) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close debrief"
            onPress={() => router.back()}
            hitSlop={12}>
            <T style={{ color: ink.dim, fontSize: 20, lineHeight: 22 }}>✕</T>
          </Pressable>
          <T v="whisper">Yours alone. Patients stay unnamed.</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Support resources"
            onPress={() => router.push('/resources')}
            hitSlop={12}>
            <T v="caption" style={{ color: ink.dim }}>
              988
            </T>
          </Pressable>
        </View>

        {transcript.length === 0 ? (
          <View style={styles.emptyWrap}>
            <T v="teleprompter" style={{ textAlign: 'center', color: ink.dim }}>
              How was today?
            </T>
            <T v="whisper" style={{ textAlign: 'center', marginTop: space(3) }}>
              Type it out — the record writes itself. Voice arrives soon.
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
                  style={{
                    color: i === lastUserIdx ? ink.text : ink.faint,
                    marginBottom: space(4),
                  }}>
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
            {awaiting && <ThinkingBars />}
          </ScrollView>
        )}

        {userTurns.length >= 2 && !awaiting && (
          <QuietButton
            title={wrapping ? 'Writing the record…' : "That's the shift"}
            onPress={wrapUp}
            disabled={wrapping}
            style={{ marginHorizontal: space(10), minHeight: 44, paddingVertical: space(2.5), marginBottom: space(2) }}
            tone="dim"
          />
        )}

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, space(3)) }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Put it down…"
            placeholderTextColor={ink.faint}
            keyboardAppearance="dark"
            multiline
            editable={!wrapping}
          />
          <View style={{ opacity: !draft.trim() || awaiting || wrapping ? 0.45 : 1 }}>
            <FlameOrb size={46} onPress={send} label="Send" />
          </View>
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
            <FlameButton
              title="Call 988"
              onPress={() => Linking.openURL('tel:988')}
              style={{ marginTop: space(5) }}
            />
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
    paddingHorizontal: space(5),
    paddingBottom: space(2),
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
    marginLeft: space(6),
  },
  bar: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: palette.apricot,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
