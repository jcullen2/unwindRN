/**
 * Client for the debrief-turn edge function: streams the partner's reply
 * (SSE `delta` events) and delivers the per-turn utility facts as soon as
 * they land. Uses expo/fetch for streaming response bodies.
 */
import { fetch as streamingFetch } from 'expo/fetch';

import { supabase } from '@/lib/supabase';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type Taps = {
  hours: number | null;
  load: number | null;
  tags: string[];
  is_night: boolean;
};

export type Utility = {
  crisis: boolean;
  tags_detected: string[];
  hours_mentioned: number | null;
  win: string | null;
  weight: string | null;
  lesson: string | null;
};

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

export async function streamDebriefTurn(opts: {
  taps: Taps | null;
  transcript: ChatMessage[];
  userTurn: string;
  onDelta: (text: string) => void;
  onUtility: (u: Utility) => void;
  signal?: AbortSignal;
}): Promise<{ reply: string; capped: boolean }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('no_session');

  const res = await streamingFetch(`${FUNCTIONS_URL}/debrief-turn`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taps: opts.taps,
      transcript: opts.transcript,
      userTurn: opts.userTurn,
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error('turn_failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';
  let capped = false;
  let errored = false;

  const handle = (block: string) => {
    let event = 'message';
    let dataLine = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      else if (line.startsWith('data: ')) dataLine += line.slice(6);
    }
    if (!dataLine) return;
    try {
      const payload = JSON.parse(dataLine);
      if (event === 'delta' && typeof payload.text === 'string') {
        reply += payload.text;
        opts.onDelta(payload.text);
      } else if (event === 'utility') {
        opts.onUtility(payload as Utility);
      } else if (event === 'done') {
        capped = payload.capped === true;
      } else if (event === 'error') {
        errored = true;
      }
    } catch {
      // malformed frame — skip
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      handle(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  if (buffer.trim()) handle(buffer);

  if (errored || reply.length === 0) throw new Error('turn_failed');
  return { reply, capped };
}
