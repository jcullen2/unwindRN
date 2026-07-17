// speak — proxies ElevenLabs streaming TTS (flash tier). The client plays the
// audio via expo-audio while captioning the text on screen. If the key is
// missing or ElevenLabs fails, returns 503 — the client degrades to text-only
// silently and the debrief never blocks.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Default voice: "Sarah" (ElevenLabs premade) — calm, warm. Swap via secret.
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const MODEL_ID = 'eleven_flash_v2_5';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    // Per-user daily budget — 200 spoken replies/day is far above real use.
    // Fail-open on RPC hiccups; the client already degrades to text on any error.
    const { data: allowed } = await supabase.rpc('bump_usage', { p_fn: 'speak', p_cap: 200 });
    if (allowed === false) return json({ error: 'rate_limited' }, 429);

    let text = '';
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      text = typeof body?.text === 'string' ? body.text : '';
    } else {
      text = new URL(req.url).searchParams.get('text') ?? '';
    }
    text = text.trim().slice(0, 1200);
    if (!text) return json({ error: 'text_required' }, 400);

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) return json({ error: 'tts_unavailable' }, 503);

    const voiceId = Deno.env.get('ELEVENLABS_VOICE_ID') || DEFAULT_VOICE_ID;
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.7 },
        }),
      }
    );
    if (!upstream.ok || !upstream.body) {
      console.error('elevenlabs failed', upstream.status);
      return json({ error: 'tts_unavailable' }, 503);
    }

    return new Response(upstream.body, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('speak failed', err);
    return json({ error: 'tts_unavailable' }, 503);
  }
});
