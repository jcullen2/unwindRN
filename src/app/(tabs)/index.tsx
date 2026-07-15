import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrisisCard, MessageBubble, TypingIndicator } from '@/components/chat';
import { Screen } from '@/components/ui';
import { ChatMessage, localToday, requestDebriefReply, requestExtraction } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Message, supabase } from '@/lib/supabase';
import { colors, radius, space, type } from '@/theme';

const REPLY_ERROR = "Couldn't reach your debrief partner. Try again.";

/** Opened exhausted at 8pm and 7:40am — greet accordingly. */
function greeting(name?: string): string {
  const h = new Date().getHours();
  const who = name ? `, ${name}` : '';
  if (h >= 5 && h < 12) return `Morning${who}.`;
  if (h >= 12 && h < 17) return `Hey${who}.`;
  if (h >= 17 && h < 22) return `Evening${who}.`;
  return `Still up${who}?`;
}

export default function DebriefScreen() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const [debriefId, setDebriefId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [ending, setEnding] = useState(false);
  const [crisisVisible, setCrisisVisible] = useState(false);

  const userId = session?.user.id;

  const loadActiveDebrief = useCallback(async () => {
    if (!userId) return;
    const { data: active } = await supabase
      .from('debriefs')
      .select('id')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!active) {
      setDebriefId(null);
      setMessages([]);
      return;
    }
    setDebriefId(active.id);
    const { data: rows } = await supabase
      .from('messages')
      .select('*')
      .eq('debrief_id', active.id)
      .order('created_at', { ascending: true });
    setMessages(rows ?? []);
  }, [userId]);

  useEffect(() => {
    loadActiveDebrief();
  }, [loadActiveDebrief]);

  // When a debrief was ended elsewhere (shift saved), reset on refocus.
  useFocusEffect(
    useCallback(() => {
      if (!debriefId) return;
      supabase
        .from('debriefs')
        .select('ended_at')
        .eq('id', debriefId)
        .maybeSingle()
        .then(({ data }) => {
          if (!data || data.ended_at) {
            setDebriefId(null);
            setMessages([]);
          }
        });
    }, [debriefId])
  );

  const toHistory = (rows: Message[]): ChatMessage[] =>
    rows.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const persistMessage = async (
    dId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<Message> => {
    const { data, error } = await supabase
      .from('messages')
      .insert({ debrief_id: dId, user_id: userId!, role, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const fetchReply = async (dId: string, history: ChatMessage[]) => {
    setAwaitingReply(true);
    try {
      const { reply, crisis } = await requestDebriefReply(history);
      const saved = await persistMessage(dId, 'assistant', reply);
      setMessages((prev) => [...prev, saved]);
      if (crisis) setCrisisVisible(true);
    } catch {
      Alert.alert(REPLY_ERROR, undefined, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Try again', onPress: () => fetchReply(dId, history) },
      ]);
    } finally {
      setAwaitingReply(false);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !userId || awaitingReply || ending) return;
    setDraft('');
    try {
      let dId = debriefId;
      if (!dId) {
        const { data, error } = await supabase
          .from('debriefs')
          .insert({ user_id: userId })
          .select('id')
          .single();
        if (error) throw error;
        dId = data.id;
        setDebriefId(dId);
      }
      const saved = await persistMessage(dId!, 'user', text);
      const nextMessages = [...messages, saved];
      setMessages(nextMessages);
      await fetchReply(dId!, toHistory(nextMessages));
    } catch {
      setDraft(text);
      Alert.alert(REPLY_ERROR);
    }
  };

  const endDebrief = useCallback(async () => {
    if (!debriefId || messages.length === 0 || ending) return;
    setEnding(true);
    try {
      const extracted = await requestExtraction(toHistory(messages));
      router.push({
        pathname: '/shift-form',
        params: { mode: 'confirm', debriefId, draft: JSON.stringify(extracted) },
      });
    } catch {
      Alert.alert(
        "Couldn't prepare your shift record",
        'You can fill it in yourself — your debrief is safe.',
        [
          {
            text: 'OK',
            onPress: () =>
              router.push({
                pathname: '/shift-form',
                params: {
                  mode: 'manual',
                  debriefId,
                  draft: JSON.stringify({ shift_date: localToday() }),
                },
              }),
          },
        ]
      );
    } finally {
      setEnding(false);
    }
  }, [debriefId, messages, ending, router]);

  const openMenu = useCallback(() => {
    const showResources = () => router.push('/resources');
    if (Platform.OS === 'ios') {
      const canEnd = !!debriefId && messages.length > 0;
      const options = canEnd
        ? ['Support resources', 'End debrief', 'Cancel']
        : ['Support resources', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (index) => {
          if (index === 0) showResources();
          if (canEnd && index === 1) endDebrief();
        }
      );
    } else {
      showResources();
    }
  }, [debriefId, messages.length, endDebrief, router]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Debrief menu"
          onPress={openMenu}
          hitSlop={12}
          style={{ paddingHorizontal: space(4) }}>
          <Text style={{ color: colors.secondary, fontSize: 22, lineHeight: 24 }}>⋯</Text>
        </Pressable>
      ),
    });
  }, [navigation, openMenu]);

  const hasConversation = messages.length > 0;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}>
        {hasConversation ? (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble role={item.role} content={item.content} />}
            contentContainerStyle={{ padding: space(4), paddingBottom: space(2) }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={awaitingReply ? <TypingIndicator /> : null}
            keyboardDismissMode="interactive"
          />
        ) : (
          <View style={styles.empty}>
            <Text style={[type.title, { textAlign: 'center' }]}>
              {greeting(profile?.display_name)}
            </Text>
            <Text style={[type.secondary, { textAlign: 'center', marginTop: space(3) }]}>
              Put the shift down. How was today?
            </Text>
            <Text style={[type.caption, { textAlign: 'center', marginTop: space(8) }]}>
              Whatever you write stays yours — just keep patients unnamed.
            </Text>
          </View>
        )}

        {hasConversation && !awaitingReply && (
          <Pressable
            accessibilityRole="button"
            onPress={endDebrief}
            disabled={ending}
            style={styles.endPill}>
            <Text style={{ ...type.caption, color: colors.amber }}>
              {ending ? 'Wrapping up…' : 'End debrief'}
            </Text>
          </Pressable>
        )}

        <View style={[styles.composer, { paddingBottom: insets.bottom > 0 ? space(1) : space(3) }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Talk it out…"
            placeholderTextColor={colors.muted}
            keyboardAppearance="dark"
            multiline
            editable={!ending}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={send}
            disabled={!draft.trim() || awaitingReply || ending}
            style={({ pressed }) => [
              styles.sendButton,
              { opacity: !draft.trim() || awaitingReply || ending ? 0.4 : pressed ? 0.8 : 1 },
            ]}>
            <Text style={{ color: colors.bg, fontSize: 18, fontWeight: '700' }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <CrisisCard visible={crisisVisible} onDismiss={() => setCrisisVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(10),
  },
  endPill: {
    alignSelf: 'center',
    paddingVertical: space(2),
    paddingHorizontal: space(4),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: space(2),
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space(2),
    paddingHorizontal: space(3),
    paddingTop: space(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    paddingHorizontal: space(3.5),
    paddingTop: space(2.5),
    paddingBottom: space(2.5),
    maxHeight: 120,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
