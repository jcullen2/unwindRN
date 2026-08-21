-- Security expansion (2026-08-21) — STAGE 1 of the two-stage hardening.
-- Rebuilt from the 2026-08-20 remediation plan. Deliberately compatible with
-- the currently deployed edge functions: bump_usage keeps working for
-- authenticated callers until the reviewed functions (which use consume_usage
-- via service role) are deployed. PRODUCTION ORDER: apply this → deploy the
-- five reviewed functions → smoke test → apply 20260821000001_security_cleanup.
-- Idempotent.

-- 1 ▸ Integrity constraints ---------------------------------------------------
-- The app validates these; the database now refuses what the app never sends.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shifts_hours_sane') then
    alter table public.shifts
      add constraint shifts_hours_sane check (hours > 0 and hours <= 24);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shifts_date_sane') then
    alter table public.shifts
      add constraint shifts_date_sane
      check (shift_date >= date '1970-01-01' and shift_date <= current_date + 2);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shifts_source_canonical') then
    alter table public.shifts
      add constraint shifts_source_canonical check (source in ('taps', 'voice', 'both'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shifts_text_bounded') then
    alter table public.shifts
      add constraint shifts_text_bounded check (
        coalesce(length(win), 0) <= 2000
        and coalesce(length(weight), 0) <= 2000
        and coalesce(length(lesson), 0) <= 2000
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shifts_tags_bounded') then
    alter table public.shifts
      add constraint shifts_tags_bounded
      check (coalesce(array_length(tags, 1), 0) <= 9);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_lines_bounded') then
    alter table public.daily_lines
      add constraint daily_lines_bounded check (length(line) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'month_captions_bounded') then
    alter table public.month_captions
      add constraint month_captions_bounded check (length(caption) <= 500);
  end if;
end $$;

-- 2 ▸ Debrief ownership on UPDATE --------------------------------------------
-- The INSERT policy already refuses a session pointing at someone else's
-- shift; UPDATE did not — so a session could be re-pointed at a foreign
-- shift_id, whose owner's later delete would cascade into this user's session.
alter policy "debrief_sessions_update_own" on public.debrief_sessions
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (shift_id is null or exists (
      select 1 from public.shifts s
      where s.id = shift_id and s.user_id = (select auth.uid())
    ))
  );

-- 3 ▸ Close the exposed SECURITY DEFINER surface ------------------------------
-- rls_auto_enable (dashboard-era helper, not in migrations) was callable by
-- anon + authenticated. Nothing client-side ever calls it.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- bump_usage was never meant for signed-out callers; Supabase default
-- privileges had granted anon EXECUTE anyway. authenticated keeps it until
-- the reviewed functions land (cleanup drops the function entirely).
revoke all on function public.bump_usage(text, int) from public, anon;

-- 4 ▸ consume_usage — service-role-only, caps fixed in SQL --------------------
-- The single budget authority. No caller-supplied cap: the function name maps
-- to its own ceiling, so a compromised client (or function bug) cannot widen
-- budgets. Executable ONLY by service_role — clients have no path in.
create or replace function public.consume_usage(p_user uuid, p_fn text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cap int;
  v_calls int;
begin
  if p_user is null then
    return false;
  end if;
  v_cap := case p_fn
    when 'debrief-turn'  then 80   -- ≈ six full debriefs a day
    when 'speak'         then 200
    when 'daily-line'    then 10
    when 'month-caption' then 15
    else 50
  end;
  insert into public.usage_counters as u (user_id, day, fn, calls)
  values (p_user, current_date, p_fn, 1)
  on conflict (user_id, day, fn)
  do update set calls = u.calls + 1
  returning calls into v_calls;
  return v_calls <= v_cap;
end;
$$;

revoke all on function public.consume_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_usage(uuid, text) to service_role;

-- 5 ▸ Reproducible grants ----------------------------------------------------
-- The signed-out role needs no table access at all: every client query runs
-- as `authenticated` (anonymous sign-ins included — they carry the
-- authenticated role), and edge functions use service_role. Future objects
-- created through migrations stop auto-granting to signed-out callers too.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;
