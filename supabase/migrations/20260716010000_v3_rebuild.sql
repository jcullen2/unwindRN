-- v3 rebuild — the voice-first data model from CLAUDE.md.
-- The v1 tables never held user data (pre-launch, empty database), so they
-- are dropped outright rather than migrated. Idempotent.

drop view if exists public.shift_totals;
drop table if exists public.messages;
drop table if exists public.shifts;
drop table if exists public.debriefs;
drop table if exists public.profiles;
drop function if exists public.bump_message_count();

-- profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  specialty text,
  years_in numeric,
  shifts_per_week numeric,
  usual_shift_hours numeric default 12,
  est_career_shifts int default 0,  -- onboarding estimate (~)
  est_career_hours int default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- shifts -------------------------------------------------------------------
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  shift_date date not null,
  hours numeric not null,
  load smallint check (load between 1 and 5),  -- 1 Light … 5 Brutal
  tags text[] default '{}',                    -- canonical set in CLAUDE.md
  started_at timestamptz,
  ended_at timestamptz,
  is_night boolean default false,
  win text,
  weight text,   -- the emotional note, NOT load
  lesson text,
  source text default 'taps',                  -- taps | voice | both
  created_at timestamptz default now()
);

create index if not exists shifts_user_date_idx
  on public.shifts (user_id, shift_date desc, created_at desc);

alter table public.shifts enable row level security;

create policy "shifts_select_own" on public.shifts
  for select using (user_id = (select auth.uid()));
create policy "shifts_insert_own" on public.shifts
  for insert with check (user_id = (select auth.uid()));
create policy "shifts_update_own" on public.shifts
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "shifts_delete_own" on public.shifts
  for delete using (user_id = (select auth.uid()));

-- debrief_sessions -----------------------------------------------------------
create table if not exists public.debrief_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  shift_id uuid references public.shifts on delete cascade,
  transcript jsonb default '[]',
  mode text default 'voice',
  started_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists debrief_sessions_user_idx
  on public.debrief_sessions (user_id, started_at desc);
create index if not exists debrief_sessions_shift_idx
  on public.debrief_sessions (shift_id);

alter table public.debrief_sessions enable row level security;

create policy "debrief_sessions_select_own" on public.debrief_sessions
  for select using (user_id = (select auth.uid()));
create policy "debrief_sessions_insert_own" on public.debrief_sessions
  for insert with check (
    user_id = (select auth.uid())
    and (shift_id is null or exists (
      select 1 from public.shifts s
      where s.id = shift_id and s.user_id = (select auth.uid())
    ))
  );
create policy "debrief_sessions_update_own" on public.debrief_sessions
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "debrief_sessions_delete_own" on public.debrief_sessions
  for delete using (user_id = (select auth.uid()));
