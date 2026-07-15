-- unwindRN initial schema
-- Every table carries RLS with user_id = auth.uid(). Totals are computed by
-- view, never stored. No patient-identity fields exist anywhere in this schema.

-- profiles -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  specialty text not null,
  years_in integer not null default 0 check (years_in >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- debriefs -------------------------------------------------------------------
create table public.debriefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  message_count integer not null default 0
);

create index debriefs_user_started_idx on public.debriefs (user_id, started_at desc);

alter table public.debriefs enable row level security;

create policy "debriefs_select_own" on public.debriefs
  for select using (user_id = auth.uid());
create policy "debriefs_insert_own" on public.debriefs
  for insert with check (user_id = auth.uid());
create policy "debriefs_update_own" on public.debriefs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "debriefs_delete_own" on public.debriefs
  for delete using (user_id = auth.uid());

-- messages -------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  debrief_id uuid not null references public.debriefs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_debrief_created_idx on public.messages (debrief_id, created_at);
create index messages_user_idx on public.messages (user_id);

alter table public.messages enable row level security;

create policy "messages_select_own" on public.messages
  for select using (user_id = auth.uid());
create policy "messages_insert_own" on public.messages
  for insert with check (user_id = auth.uid());
create policy "messages_delete_own" on public.messages
  for delete using (user_id = auth.uid());

-- keep debriefs.message_count in sync (runs as the inserting user; RLS lets
-- them update only their own debrief row)
create function public.bump_message_count()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.debriefs
    set message_count = message_count + 1
    where id = new.debrief_id;
  return new;
end;
$$;

create trigger messages_bump_count
  after insert on public.messages
  for each row execute function public.bump_message_count();

-- shifts ---------------------------------------------------------------------
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shift_date date not null,
  hours numeric check (hours is null or (hours > 0 and hours <= 24)),
  unit text,
  win text not null default '',
  loss text not null default '',
  lesson text not null default '',
  mood integer check (mood is null or mood between 1 and 5),
  source text not null check (source in ('debrief', 'manual')),
  debrief_id uuid references public.debriefs (id) on delete set null,
  created_at timestamptz not null default now()
);

create index shifts_user_date_idx on public.shifts (user_id, shift_date desc, created_at desc);

alter table public.shifts enable row level security;

create policy "shifts_select_own" on public.shifts
  for select using (user_id = auth.uid());
create policy "shifts_insert_own" on public.shifts
  for insert with check (user_id = auth.uid());
create policy "shifts_update_own" on public.shifts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shifts_delete_own" on public.shifts
  for delete using (user_id = auth.uid());

-- totals: computed, never stored. security_invoker keeps RLS intact through
-- the view.
create view public.shift_totals
with (security_invoker = true) as
select
  user_id,
  count(*)::integer as total_shifts,
  coalesce(sum(hours), 0)::numeric as total_hours
from public.shifts
group by user_id;
