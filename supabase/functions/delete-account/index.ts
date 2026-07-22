// delete-account — the only service-role function.
// Verifies the caller's JWT, then removes every row belonging to the user and
// finally the auth user itself. Full data wipe per the Apple requirement.
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    // Verify the caller with their own JWT first — RLS-scoped client.
    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    // Service role for the actual wipe. Every table FKs auth.users ON DELETE
    // CASCADE, so deleting the auth user removes all rows atomically — that is
    // the source of truth for a full wipe. We also delete the known rows first
    // as belt-and-suspenders (and so a deleteUser hiccup can't strand data),
    // using the REAL v3 schema: shifts · debrief_sessions · daily_lines ·
    // month_captions · profiles. (The old messages/debriefs tables were dropped
    // in the v3 rebuild — deleting them here is what silently broke deletion.)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Order respects FKs (debrief_sessions references shifts). Missing rows are
    // a no-op; a truly missing table would error, so we only name real ones.
    const byUser = ['debrief_sessions', 'shifts', 'daily_lines', 'month_captions'] as const;
    for (const table of byUser) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id);
      if (error) throw error;
    }
    const { error: profileError } = await admin.from('profiles').delete().eq('id', user.id);
    if (profileError) throw profileError;

    // Final authority: delete the auth user; cascade sweeps anything missed.
    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) throw authError;

    return json({ deleted: true });
  } catch (err) {
    console.error('delete-account failed', err);
    return json({ error: 'delete_failed' }, 500);
  }
});
