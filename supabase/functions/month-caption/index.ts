// month-caption — one generated caption per logbook month, cached. The flame
// glyph is its speaker mark on the client. Describes; never diagnoses.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-haiku-4-5-20251001';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

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

    const body = await req.json().catch(() => null);
    const month: string =
      typeof body?.month === 'string' && /^\d{4}-\d{2}$/.test(body.month) ? body.month : '';
    if (!month) return json({ error: 'month_required' }, 400);

    const { data: cached } = await supabase
      .from('month_captions')
      .select('caption')
      .eq('month', month)
      .maybeSingle();
    if (cached?.caption) return json({ caption: cached.caption, cached: true });

    const first = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const { data: shifts } = await supabase
      .from('shifts')
      .select('shift_date, hours, load, tags, is_night, win')
      .gte('shift_date', first)
      .lte('shift_date', last);

    const rows = shifts ?? [];
    if (rows.length < 3) return json({ caption: null }); // too little to say anything true

    const summary =
      `${rows.length} shifts, ${Math.round(rows.reduce((s, r) => s + Number(r.hours ?? 0), 0))} hours, ` +
      `loads [${rows.map((r) => r.load ?? '-').join(',')}], ` +
      `${rows.filter((r) => r.is_night).length} nights, ` +
      `tags: ${[...new Set(rows.flatMap((r) => r.tags ?? []))].join(', ') || 'none'}. ` +
      `Wins she noted: ${rows.map((r) => r.win).filter(Boolean).slice(0, 5).join(' | ') || 'none written'}`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 150,
      system:
        'You are the debrief partner inside unwindRN, writing the one-line caption under a ' +
        'month in a nurse\'s career logbook. ONE sentence, at most two short ones. Warm, ' +
        'floor-literate, specific to what the month actually held. Describe — never diagnose, ' +
        'never clinical labels, never guilt or streak talk, no exclamation points, no advice. ' +
        'Never include anything that could identify a patient.',
      messages: [{ role: 'user', content: `The month: ${summary}` }],
    });
    const block = response.content.find((b) => b.type === 'text');
    const caption =
      block && block.type === 'text' ? block.text.trim().replace(/\s+/g, ' ') : null;
    if (caption) {
      await supabase.from('month_captions').insert({ user_id: user.id, month, caption });
    }
    return json({ caption, cached: false });
  } catch (err) {
    console.error('month-caption failed', err);
    return json({ caption: null }, 200);
  }
});
