-- Per-user daily rate limits for the AI/TTS edge functions (2026-07-17).
-- One row per (user, day, function); bump_usage() atomically increments and
-- reports whether the caller is still under the cap. Called via RPC with the
-- user's own JWT — auth.uid() inside the function can't be spoofed. RLS is
-- enabled with NO policies, so clients can never read or write the counters
-- directly; the SECURITY DEFINER function (owned by the table owner) is the
-- only path in. Rows cascade away with the auth user. Idempotent.

create table if not exists public.usage_counters (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  fn text not null,
  calls int not null default 0,
  primary key (user_id, day, fn)
);

alter table public.usage_counters enable row level security;
-- no policies on purpose: deny-all for clients.

create or replace function public.bump_usage(p_fn text, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_calls int;
begin
  if v_uid is null then
    return false; -- no identity, no budget
  end if;
  insert into public.usage_counters as u (user_id, day, fn, calls)
  values (v_uid, current_date, p_fn, 1)
  on conflict (user_id, day, fn)
  do update set calls = u.calls + 1
  returning calls into v_calls;
  return v_calls <= p_cap;
end;
$$;

revoke all on function public.bump_usage(text, int) from public;
grant execute on function public.bump_usage(text, int) to authenticated;
