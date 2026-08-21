/**
 * Per-user daily budgets via the service-role-only `consume_usage` RPC
 * (expansion migration). Caps are fixed in SQL — the single authority — so no
 * client-supplied number can widen them.
 *
 * Fail-open by design: a nurse post-shift is never blocked because our
 * rate-limit plumbing hiccuped (or because the reviewed functions were
 * deployed ahead of the migration that creates the RPC). Only an explicit
 * `false` from the database blocks the call.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

let admin: SupabaseClient | null = null;
function adminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return admin;
}

/** True = under budget (or plumbing failed open). False = over the daily cap. */
export async function consumeUsage(userId: string, fn: string): Promise<boolean> {
  try {
    const { data, error } = await adminClient().rpc('consume_usage', {
      p_user: userId,
      p_fn: fn,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** Service-role client for scoped writes (AI cache rows) — always with an explicit user_id. */
export function serviceClient(): SupabaseClient {
  return adminClient();
}
