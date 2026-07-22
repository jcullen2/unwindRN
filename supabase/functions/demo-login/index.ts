// demo-login — DEV-ONLY door for simulator demos. Creates a fresh, isolated
// demo user (service role) and returns a one-time magic-link token the client
// exchanges for a session via verifyOtp. Needs no dashboard config: no Apple,
// no anonymous-sign-ins toggle, no SMTP (the link token is returned directly,
// never emailed). Demo users are throwaway (@demo.unwindrn.app) and are swept
// after 24h. RLS isolates them like any user. REMOVE OR DISABLE BEFORE LAUNCH
// (logged in DESIGN-DEBT): this endpoint is deliberately callable pre-auth.
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Sweep demo users older than 24h (best effort; their rows cascade away).
    try {
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      const cutoff = Date.now() - 24 * 3600 * 1000;
      for (const u of data?.users ?? []) {
        if (u.email?.endsWith('@demo.unwindrn.app') && new Date(u.created_at).getTime() < cutoff) {
          await admin.auth.admin.deleteUser(u.id);
        }
      }
    } catch {
      // housekeeping must never block the demo
    }

    const email = `demo-${crypto.randomUUID().slice(0, 12)}@demo.unwindrn.app`;
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createError) throw createError;

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkError) throw linkError;
    const tokenHash = link.properties?.hashed_token;
    if (!tokenHash) throw new Error('no_token');

    return json({ token_hash: tokenHash });
  } catch (err) {
    console.error('demo-login failed', err);
    return json({ error: 'demo_failed' }, 500);
  }
});
