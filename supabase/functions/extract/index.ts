// extract — turns a finished debrief transcript into a draft shift record.
// Authenticated with the caller's JWT. Calls claude-haiku-4-5-20251001 with a
// strict JSON schema. Every field must exclude anything that could identify a
// patient. The client shows the draft in an editable confirmation sheet.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    shift_date: { type: 'string', format: 'date' },
    hours: { type: ['number', 'null'] },
    unit: { type: ['string', 'null'] },
    win: { type: 'string' },
    loss: { type: 'string' },
    lesson: { type: 'string' },
    mood: { type: ['integer', 'null'], enum: [1, 2, 3, 4, 5, null] },
  },
  required: ['shift_date', 'hours', 'unit', 'win', 'loss', 'lesson', 'mood'],
  additionalProperties: false,
} as const;

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
    // The client passes its local date so "today" isn't the server's UTC day.
    const today: string =
      typeof body?.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
        ? body.today
        : new Date().toISOString().slice(0, 10);

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return json({ error: 'messages_required' }, 400);
    }

    const transcript = rawMessages
      .filter((m) => m && typeof m.content === 'string')
      .map((m) => `${m.role === 'assistant' ? 'Partner' : 'Nurse'}: ${m.content}`)
      .join('\n\n');

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const response = await anthropic.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 1024,
      system:
        `You extract a structured shift record from a nurse's post-shift debrief transcript.\n\n` +
        `Today's date is ${today}. If the debrief is about today's shift (the usual case), ` +
        `shift_date is ${today}; only use another date if the nurse clearly said the shift ` +
        `was on a different day.\n\n` +
        `Fields:\n` +
        `- shift_date: YYYY-MM-DD\n` +
        `- hours: shift length in hours as a number, or null if never mentioned\n` +
        `- unit: the unit/department she worked, or null if never mentioned\n` +
        `- win: one thing that went well, in her own spirit, 1-2 sentences\n` +
        `- loss: one thing that was hard or went wrong, 1-2 sentences ("" if none surfaced)\n` +
        `- lesson: one thing learned or worth remembering, 1-2 sentences ("" if none surfaced)\n` +
        `- mood: overall mood 1 (wrecked) to 5 (great), or null if you cannot tell\n\n` +
        `HARD RULE: every field must exclude anything that could identify a patient — no ` +
        `names, initials, room or bed numbers, family specifics, or age-plus-diagnosis ` +
        `combinations. Describe events generically ("a patient coded", "a tough family ` +
        `conversation"), never specifically.`,
      messages: [{ role: 'user', content: transcript }],
      output_config: {
        format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
      },
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return json({ error: 'extract_failed' }, 502);

    return json({ draft: JSON.parse(block.text) });
  } catch (err) {
    console.error('extract failed', err);
    return json({ error: 'extract_failed' }, 500);
  }
});
