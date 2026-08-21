// delete-account — the only function whose job needs the service role.
// Verifies the caller's JWT, then deletes the auth user ONCE. Every table
// FKs auth.users ON DELETE CASCADE, so that single delete removes profile,
// shifts, debrief sessions, and cached lines atomically — one authority, no
// partial-failure states. (An older version deleted table-by-table first;
// any one table hiccup 500'd the whole wipe that the cascade would have
// finished cleanly.) Full data wipe per the Apple requirement.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { logFailure } from '../_shared/log.ts';

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      logFailure('delete-account', 'db', error);
      return json({ error: 'delete_failed' }, 500);
    }

    return json({ deleted: true });
  } catch (err) {
    logFailure('delete-account', 'unknown', err);
    return json({ error: 'delete_failed' }, 500);
  }
});
