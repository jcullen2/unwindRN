// debrief — the conversation pipeline.
// Authenticated with the caller's JWT (anon key + Authorization header, RLS
// intact). Calls claude-sonnet-4-6 for the reply and, in parallel, runs a
// claude-haiku-4-5-20251001 safety classifier on the latest user message.
// Returns { reply, crisis }.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { buildSystemPrompt } from './prompt.ts';

const CONVERSATION_MODEL = 'claude-sonnet-4-6';
const SAFETY_MODEL = 'claude-haiku-4-5-20251001';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function classifyCrisis(anthropic: Anthropic, message: string): Promise<boolean> {
  try {
    const response = await anthropic.messages.create({
      model: SAFETY_MODEL,
      max_tokens: 256,
      system:
        'You are a safety classifier for a nurse debrief app. Given one message a nurse ' +
        'sent after a shift, decide if it suggests self-harm, suicidal ideation, or ' +
        'immediate danger to the user herself. Venting about a hard shift, patient ' +
        'deaths, or dark humor common in nursing is NOT a crisis by itself.',
      messages: [{ role: 'user', content: message }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { crisis: { type: 'boolean' } },
            required: ['crisis'],
            additionalProperties: false,
          },
        },
      },
    });
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return false;
    return JSON.parse(block.text).crisis === true;
  } catch (err) {
    // Never fail the debrief because the classifier hiccuped.
    console.error('safety classifier failed', err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    const rawMessages: unknown = body?.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return json({ error: 'messages_required' }, 400);
    }
    const messages: ChatMessage[] = rawMessages
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.length > 0
      )
      .slice(-40) // bound the context we forward
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    // First message must be from the user.
    while (messages.length > 0 && messages[0].role !== 'user') messages.shift();
    if (messages.length === 0) return json({ error: 'messages_required' }, 400);

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

    // Profile + shift count (RLS scopes both to the caller).
    const [{ data: profile }, { count: shiftCount }] = await Promise.all([
      supabase.from('profiles').select('display_name, specialty, years_in').eq('id', user.id).single(),
      supabase.from('shifts').select('*', { count: 'exact', head: true }),
    ]);
    if (!profile) return json({ error: 'profile_required' }, 400);

    const system = buildSystemPrompt({
      display_name: profile.display_name,
      specialty: profile.specialty,
      years_in: profile.years_in,
      shift_number: (shiftCount ?? 0) + 1,
    });

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const [reply, crisis] = await Promise.all([
      anthropic.messages
        .create({
          model: CONVERSATION_MODEL,
          max_tokens: 1024,
          system,
          messages,
        })
        .then((r) => {
          const block = r.content.find((b) => b.type === 'text');
          return block && block.type === 'text' ? block.text : '';
        }),
      lastUserMessage ? classifyCrisis(anthropic, lastUserMessage.content) : Promise.resolve(false),
    ]);

    if (!reply) return json({ error: 'empty_reply' }, 502);

    return json({ reply, crisis });
  } catch (err) {
    console.error('debrief failed', err);
    return json({ error: 'debrief_failed' }, 500);
  }
});
