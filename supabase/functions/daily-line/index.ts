// daily-line — the partner's one-sentence presence line on Home, generated
// by haiku from her real last-7-days aggregates and cached per local day.
// Describes patterns; never diagnoses.
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
    const today: string =
      typeof body?.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
        ? body.today
        : new Date().toISOString().slice(0, 10);

    const { data: cached } = await supabase
      .from('daily_lines')
      .select('line')
      .eq('day', today)
      .maybeSingle();
    if (cached?.line) return json({ line: cached.line, cached: true });

    const since = new Date(new Date(today).getTime() - 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [{ data: profile }, { data: shifts }] = await Promise.all([
      supabase.from('profiles').select('display_name, specialty').eq('id', user.id).single(),
      supabase
        .from('shifts')
        .select('shift_date, hours, load, tags, is_night')
        .gte('shift_date', since)
        .lte('shift_date', today),
    ]);

    const rows = shifts ?? [];
    const summary =
      rows.length === 0
        ? 'no shifts logged in the last 7 days'
        : `${rows.length} shifts, ${rows.reduce((s, r) => s + Number(r.hours ?? 0), 0)} hours, ` +
          `loads [${rows.map((r) => r.load ?? '-').join(',')}], ` +
          `${rows.filter((r) => r.is_night).length} nights, ` +
          `tags: ${[...new Set(rows.flatMap((r) => r.tags ?? []))].join(', ') || 'none'}`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 120,
      system:
        'You are the debrief partner inside unwindRN, leaving one short presence line on ' +
        `the home screen for ${profile?.display_name ?? 'a nurse'} (${profile?.specialty ?? 'nursing'}). ` +
        'ONE sentence, spoken register, warm and floor-literate. Describe what her week actually ' +
        'held — never diagnose, never use clinical labels, never guilt, no exclamation points, ' +
        'no advice, no questions. If the week is empty: a grounded line that the lamp is lit ' +
        'whenever she is ready — never a nudge.',
      messages: [{ role: 'user', content: `Her last 7 days: ${summary}` }],
    });
    const block = response.content.find((b) => b.type === 'text');
    const line =
      block && block.type === 'text'
        ? block.text.trim().replace(/\s+/g, ' ')
        : 'The lamp is lit whenever you are.';

    await supabase.from('daily_lines').insert({ user_id: user.id, day: today, line });
    return json({ line, cached: false });
  } catch (err) {
    console.error('daily-line failed', err);
    return json({ line: null, error: 'line_failed' }, 200); // Home shows fallback copy
  }
});
