// debrief-turn — the voice pipeline's LLM leg (CLAUDE.md §voice pipeline).
// Authenticated with the caller's JWT. Receives {taps, transcript, userTurn},
// streams the partner's reply (SSE `delta` events) from claude-sonnet-4-6 and,
// in parallel, fires claude-haiku-4-5-20251001 with a strict JSON schema
// (SSE `utility` event): {crisis, tags_detected, hours_mentioned, win, weight,
// lesson}. The system prompt lives ONLY in ./system-prompt.md, compiled into
// ./system-prompt.ts by scripts/gen-system-prompt.sh — eszip deploys bundle
// only the import graph, so a runtime readTextFile of the .md 500s in prod.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { SYSTEM_PROMPT_TEMPLATE } from './system-prompt.ts';

const CONVERSATION_MODEL = 'claude-sonnet-4-6';
const UTILITY_MODEL = 'claude-haiku-4-5-20251001';
const MAX_PARTNER_TURNS = 12;
const MAX_CONTEXT_CHARS = 32_000; // ~8k tokens
// Per-user daily budget (bump_usage RPC). 80 turns ≈ six full debriefs — far
// above real use, a hard ceiling on abuse. Fail-open on RPC hiccups: a nurse
// post-shift is never blocked by our rate-limit plumbing failing.
const DAILY_TURN_CAP = 80;

const CANONICAL_TAGS = [
  'Short-staffed', 'Code', 'A loss', 'Good save', 'Hard family',
  'Float', 'Charge', 'Precepting', 'Quiet one',
] as const;

const utilitySchema = z.object({
  crisis: z.boolean(),
  tags_detected: z.array(z.enum(CANONICAL_TAGS)).catch([]),
  hours_mentioned: z.number().nullable().catch(null),
  win: z.string().nullable().catch(null),
  weight: z.string().nullable().catch(null),
  lesson: z.string().nullable().catch(null),
});
type Utility = z.infer<typeof utilitySchema>;

const EMPTY_UTILITY: Utility = {
  crisis: false, tags_detected: [], hours_mentioned: null,
  win: null, weight: null, lesson: null,
};

/**
 * Deterministic PHI backstop (CLAUDE.md law). The haiku prompt is instructed to
 * strip identifiers, but the model is not trusted as the only line of defense:
 * this strips structured identifiers (room/bed/MRN/unit numbers, long digit
 * runs) from the extracted fields before they can be persisted. Names are left
 * to the prompt — a name regex can't run without unacceptable false positives —
 * but structured identifiers are exactly what a regex catches reliably.
 */
function scrubPHI(text: string | null): string | null {
  if (!text) return text;
  let out = text
    // room 12 / rm 4B / bed 3 / MRN 00482 / med record 12345 / unit 7
    .replace(/\b(?:room|rm|bed|mrn|medical\s+record(?:\s+number)?|unit)\s*#?\s*[\w-]+/gi, '')
    // bare 4+ digit runs (MRNs, account numbers)
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
  return out.length ? out : null;
}

function scrubUtility(u: Utility): Utility {
  return { ...u, win: scrubPHI(u.win), weight: scrubPHI(u.weight), lesson: scrubPHI(u.lesson) };
}

const UTILITY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    crisis: { type: 'boolean' },
    tags_detected: { type: 'array', items: { type: 'string', enum: [...CANONICAL_TAGS] } },
    hours_mentioned: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    win: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    weight: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    lesson: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
  required: ['crisis', 'tags_detected', 'hours_mentioned', 'win', 'weight', 'lesson'],
  additionalProperties: false,
} as const;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function sse(controller: ReadableStreamDefaultController<Uint8Array>, event: string, data: unknown) {
  controller.enqueue(
    new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  );
}

async function runUtility(anthropic: Anthropic, userTurn: string, priorPartnerLine: string | null): Promise<Utility> {
  try {
    const context = priorPartnerLine ? `Partner asked: "${priorPartnerLine}"\n\n` : '';
    const response = await anthropic.messages.create({
      model: UTILITY_MODEL,
      max_tokens: 512,
      system:
        'You extract facts from one turn a nurse just spoke in her post-shift debrief.\n' +
        '- crisis: true ONLY if the turn suggests self-harm, suicidal ideation, or immediate ' +
        'danger to the nurse herself. Venting, patient deaths, and dark floor humor are NOT crisis.\n' +
        `- tags_detected: which of these apply to what she said: ${CANONICAL_TAGS.join(', ')}.\n` +
        '- hours_mentioned: shift length in hours if she stated one, else null.\n' +
        '- win / weight / lesson: a short phrase in her own spirit if this turn contains one ' +
        '(win = what went right; weight = what she is carrying; lesson = what she learned), else null.\n' +
        'HARD RULE: strip anything that could identify a patient — no names, initials, rooms, ' +
        'bed numbers, family specifics, or age+diagnosis combinations. Describe generically.',
      messages: [{ role: 'user', content: context + userTurn }],
      output_config: { format: { type: 'json_schema', schema: UTILITY_JSON_SCHEMA } },
    });
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return EMPTY_UTILITY;
    return scrubUtility(utilitySchema.parse(JSON.parse(block.text)));
  } catch (err) {
    console.error('utility call failed', err);
    return EMPTY_UTILITY;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { data: allowed } = await supabase.rpc('bump_usage', { p_fn: 'debrief-turn', p_cap: DAILY_TURN_CAP });
    if (allowed === false) return json({ error: 'rate_limited' }, 429);

    const body = await req.json().catch(() => null);
    const userTurn: string = typeof body?.userTurn === 'string' ? body.userTurn.slice(0, 4000) : '';
    if (!userTurn.trim()) return json({ error: 'user_turn_required' }, 400);

    const transcript: ChatMessage[] = Array.isArray(body?.transcript)
      ? body.transcript.filter(
          (m: ChatMessage) =>
            m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
        )
      : [];

    const taps = body?.taps ?? null;
    const tapsSummary = taps
      ? [
          taps.hours != null ? `${taps.hours}h` : null,
          taps.load != null
            ? `load ${['Light', 'Steady', 'Full', 'Heavy', 'Brutal'][taps.load - 1] ?? taps.load}`
            : null,
          Array.isArray(taps.tags) && taps.tags.length > 0 ? `tags: ${taps.tags.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join(', ') || 'none'
      : 'none — she skipped the taps';

    const [{ data: profile }, { count: shiftCount }] = await Promise.all([
      supabase.from('profiles').select('display_name, specialty, years_in').eq('id', user.id).single(),
      supabase.from('shifts').select('*', { count: 'exact', head: true }),
    ]);
    if (!profile) return json({ error: 'profile_required' }, 400);

    const system = SYSTEM_PROMPT_TEMPLATE
      .replaceAll('{display_name}', profile.display_name ?? 'there')
      .replaceAll('{specialty}', profile.specialty ?? 'nursing')
      .replaceAll('{years_in}', String(profile.years_in ?? 0))
      .replaceAll('{shift_number}', String((shiftCount ?? 0) + 1))
      .replaceAll('{taps_summary}', tapsSummary);

    // Budgets: truncate context to ~8k tokens, keeping the newest turns.
    let chars = 0;
    const trimmed: ChatMessage[] = [];
    for (let i = transcript.length - 1; i >= 0; i--) {
      const c = transcript[i].content.slice(0, 4000);
      if (chars + c.length > MAX_CONTEXT_CHARS) break;
      chars += c.length;
      trimmed.unshift({ role: transcript[i].role, content: c });
    }
    while (trimmed.length > 0 && trimmed[0].role !== 'user') trimmed.shift();

    const partnerTurns = trimmed.filter((m) => m.role === 'assistant').length;
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const priorPartnerLine =
      [...trimmed].reverse().find((m) => m.role === 'assistant')?.content ?? null;

    const utilityPromise = runUtility(anthropic, userTurn, priorPartnerLine);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Utility result flows on the same stream as soon as it lands.
          const utilityDone = utilityPromise.then((u) => sse(controller, 'utility', u));

          if (partnerTurns >= MAX_PARTNER_TURNS) {
            sse(controller, 'delta', {
              text: "That's a full debrief — the record has what it needs. Save it and go rest.",
            });
            await utilityDone;
            sse(controller, 'done', { capped: true });
            controller.close();
            return;
          }

          const messages: ChatMessage[] = [...trimmed, { role: 'user', content: userTurn }];
          const llmStream = anthropic.messages.stream({
            model: CONVERSATION_MODEL,
            max_tokens: 512,
            system,
            messages,
          });

          for await (const event of llmStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta' &&
              event.delta.text
            ) {
              sse(controller, 'delta', { text: event.delta.text });
            }
          }
          const final = await llmStream.finalMessage();
          console.log(
            JSON.stringify({
              at: 'debrief-turn',
              input_tokens: final.usage.input_tokens,
              output_tokens: final.usage.output_tokens,
              partner_turns: partnerTurns + 1,
            })
          );

          await utilityDone;
          sse(controller, 'done', { capped: false });
          controller.close();
        } catch (err) {
          console.error('debrief-turn stream failed', err);
          try {
            sse(controller, 'error', { error: 'turn_failed' });
            controller.close();
          } catch {
            // stream already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('debrief-turn failed', err);
    return json({ error: 'turn_failed' }, 500);
  }
});
