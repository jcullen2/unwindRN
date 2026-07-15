-- Performance advisor fixes (behavior unchanged):
-- 1. Wrap auth.uid() as (select auth.uid()) in every RLS policy so Postgres
--    evaluates it once per query instead of once per row (auth_rls_initplan).
-- 2. Cover the shifts.debrief_id foreign key with an index.

-- profiles --------------------------------------------------------------------
alter policy "profiles_select_own" on public.profiles
  using (id = (select auth.uid()));
alter policy "profiles_insert_own" on public.profiles
  with check (id = (select auth.uid()));
alter policy "profiles_update_own" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- debriefs --------------------------------------------------------------------
alter policy "debriefs_select_own" on public.debriefs
  using (user_id = (select auth.uid()));
alter policy "debriefs_insert_own" on public.debriefs
  with check (user_id = (select auth.uid()));
alter policy "debriefs_update_own" on public.debriefs
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "debriefs_delete_own" on public.debriefs
  using (user_id = (select auth.uid()));

-- messages --------------------------------------------------------------------
alter policy "messages_select_own" on public.messages
  using (user_id = (select auth.uid()));
alter policy "messages_insert_own" on public.messages
  with check (user_id = (select auth.uid()));
alter policy "messages_delete_own" on public.messages
  using (user_id = (select auth.uid()));

-- shifts ----------------------------------------------------------------------
alter policy "shifts_select_own" on public.shifts
  using (user_id = (select auth.uid()));
alter policy "shifts_insert_own" on public.shifts
  with check (user_id = (select auth.uid()));
alter policy "shifts_update_own" on public.shifts
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "shifts_delete_own" on public.shifts
  using (user_id = (select auth.uid()));

-- cover the shifts.debrief_id FK
create index shifts_debrief_idx on public.shifts (debrief_id);
