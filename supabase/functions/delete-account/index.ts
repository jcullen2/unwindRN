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

    // Service role for the actual wipe. Delete order respects FKs; deleting
    // the auth user last cascades anything missed.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const tables = ['messages', 'shifts', 'debriefs'] as const;
    for (const table of tables) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id);
      if (error) throw error;
    }
    const { error: profileError } = await admin.from('profiles').delete().eq('id', user.id);
    if (profileError) throw profileError;

    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) throw authError;

    return json({ deleted: true });
  } catch (err) {
    console.error('delete-account failed', err);
    return json({ error: 'delete_failed' }, 500);
  }
});
