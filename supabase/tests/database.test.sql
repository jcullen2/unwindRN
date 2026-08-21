-- unwindRN database proof — pgTAP suite (rebuilt 2026-08-21 from the Aug 20
-- remediation plan). Asserts the FINAL hardened state: all migrations applied,
-- including 20260821000000_security_expansion and ..0001_security_cleanup.
-- Run: `supabase db start && supabase test db` (Docker required; CI runs it).
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(61);

-- Test identities -------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'tap-a@test.local'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'tap-b@test.local');

-- ════ A ▸ Structure (1–12) ═══════════════════════════════════════════════════
select has_table('public'::name, 'profiles'::name);
select has_table('public'::name, 'shifts'::name);
select has_table('public'::name, 'debrief_sessions'::name);
select has_table('public'::name, 'daily_lines'::name);
select has_table('public'::name, 'month_captions'::name);
select hasnt_table('public'::name, 'messages'::name);   -- v1 schema is gone
select hasnt_table('public'::name, 'debriefs'::name);   -- v1 schema is gone
select hasnt_column('public'::name, 'debrief_sessions'::name, 'transcript'::name,
  'verbatim spoken transcripts are structurally impossible to store');
select has_table('public'::name, 'usage_counters'::name);
select hasnt_function('public'::name, 'bump_usage'::name, array['text', 'integer'],
  'legacy client-callable budget RPC is retired');
select has_function('public'::name, 'consume_usage'::name, array['uuid', 'text'],
  'the service-role budget authority exists');
select col_not_null('public'::name, 'shifts'::name, 'user_id'::name);

-- ════ B ▸ RLS enabled everywhere (13–18) ═════════════════════════════════════
select ok(relrowsecurity, 'RLS on profiles')          from pg_class where oid = 'public.profiles'::regclass;
select ok(relrowsecurity, 'RLS on shifts')            from pg_class where oid = 'public.shifts'::regclass;
select ok(relrowsecurity, 'RLS on debrief_sessions')  from pg_class where oid = 'public.debrief_sessions'::regclass;
select ok(relrowsecurity, 'RLS on daily_lines')       from pg_class where oid = 'public.daily_lines'::regclass;
select ok(relrowsecurity, 'RLS on month_captions')    from pg_class where oid = 'public.month_captions'::regclass;
select ok(relrowsecurity, 'RLS on usage_counters')    from pg_class where oid = 'public.usage_counters'::regclass;

-- ════ C ▸ Policy sets are exactly as designed (19–24) ════════════════════════
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'profiles'), 3,
  'profiles: select/insert/update own — no delete (account deletion cascades)');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'shifts'), 4,
  'shifts: full own-row CRUD');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'debrief_sessions'), 4,
  'debrief_sessions: full own-row CRUD');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'daily_lines'), 1,
  'daily_lines: clients read only — writes are service-role');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'month_captions'), 1,
  'month_captions: clients read only — writes are service-role');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'usage_counters'), 0,
  'usage_counters: deny-all for clients, on purpose');

-- ════ D ▸ Data constraints hold at the database (25–32) ══════════════════════
select throws_ok(
  $$insert into public.shifts (user_id, shift_date, hours, tags)
    values ('11111111-1111-1111-1111-111111111111', current_date, 12, array['Not A Real Tag'])$$,
  '23514', null, 'non-canonical tags are refused');
select throws_ok(
  $$insert into public.shifts (user_id, shift_date, hours)
    values ('11111111-1111-1111-1111-111111111111', current_date, 30)$$,
  '23514', null, 'hours above 24 are refused');
select throws_ok(
  $$insert into public.shifts (user_id, shift_date, hours)
    values ('11111111-1111-1111-1111-111111111111', current_date, 0)$$,
  '23514', null, 'zero-hour shifts are refused');
select throws_ok(
  $$insert into public.shifts (user_id, shift_date, hours, source)
    values ('11111111-1111-1111-1111-111111111111', current_date, 12, 'manual')$$,
  '23514', null, 'non-canonical source is refused');
select throws_ok(
  $$insert into public.shifts (user_id, shift_date, hours)
    values ('11111111-1111-1111-1111-111111111111', current_date + 30, 12)$$,
  '23514', null, 'far-future shift dates are refused');
select throws_ok(
  $$insert into public.shifts (user_id, shift_date, hours, win)
    values ('11111111-1111-1111-1111-111111111111', current_date, 12, repeat('x', 2001))$$,
  '23514', null, 'oversized text fields are refused');
select throws_ok(
  $$insert into public.daily_lines (user_id, day, line)
    values ('11111111-1111-1111-1111-111111111111', current_date, repeat('x', 501))$$,
  '23514', null, 'oversized cache lines are refused');
select lives_ok(
  $$insert into public.shifts (id, user_id, shift_date, hours, load, tags, is_night, win, source)
    values ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111',
            current_date, 12, 4, array['Code','Good save'], false, 'kept the drip going', 'voice')$$,
  'a fully valid shift inserts');

-- ════ E ▸ Signed in as A: own-data CRUD works (33–38) ════════════════════════
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$insert into public.shifts (id, user_id, shift_date, hours, source)
    values ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', '11111111-1111-1111-1111-111111111111',
            current_date, 8, 'taps')$$,
  'A inserts her own shift');
select is((select count(*)::int from public.shifts), 2, 'A sees exactly her own two shifts');
select lives_ok(
  $$update public.shifts set lesson = 'chart before you sit' where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'$$,
  'A updates her own shift');
select lives_ok(
  $$insert into public.debrief_sessions (user_id, shift_id)
    values ('11111111-1111-1111-1111-111111111111', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')$$,
  'A links a debrief session to her own shift');
select lives_ok(
  $$insert into public.profiles (id, display_name, specialty)
    values ('11111111-1111-1111-1111-111111111111', 'A', 'Pediatric Oncology')$$,
  'A creates her own profile');
select is((select count(*)::int from public.usage_counters), 0,
  'usage counters are invisible to clients even for their own rows');

reset role;

-- ════ F ▸ Signed in as B: A's world does not exist (39–46) ═══════════════════
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.shifts), 0, 'B sees none of A''s shifts');
select throws_ok(
  $$insert into public.shifts (user_id, shift_date, hours)
    values ('11111111-1111-1111-1111-111111111111', current_date, 12)$$,
  '42501', null, 'B cannot write a shift under A''s id');
select lives_ok(
  $$update public.shifts set win = 'hijacked' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  'B''s update of A''s row runs but matches nothing');
select lives_ok(
  $$delete from public.shifts where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$$,
  'B''s delete of A''s row runs but matches nothing');
select throws_ok(
  $$insert into public.debrief_sessions (user_id, shift_id)
    values ('22222222-2222-2222-2222-222222222222', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')$$,
  '42501', null, 'B cannot link a session to A''s shift on insert');
select lives_ok(
  $$insert into public.debrief_sessions (id, user_id, shift_id)
    values ('d2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2', '22222222-2222-2222-2222-222222222222', null)$$,
  'B starts his own unlinked session');
select throws_ok(
  $$update public.debrief_sessions set shift_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
    where id = 'd2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2'$$,
  '42501', null,
  'B cannot re-point his session at A''s shift on update (expansion regression test)');
select is((select count(*)::int from public.profiles), 0, 'B sees no profile but his own (none yet)');

reset role;

-- ════ G ▸ A's data survived B's attempts (47–48) ═════════════════════════════
select is((select win from public.shifts where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  'kept the drip going', 'A''s win line is untouched');
select is((select count(*)::int from public.shifts where user_id = '11111111-1111-1111-1111-111111111111'),
  2, 'A still has both shifts');

-- ════ H ▸ Signed out: no table surface at all (49–51) ════════════════════════
set local role anon;
select throws_ok($$select count(*) from public.shifts$$, '42501', null,
  'signed-out callers cannot even count shifts');
select throws_ok($$select count(*) from public.profiles$$, '42501', null,
  'signed-out callers cannot touch profiles');
select throws_ok(
  $$select public.consume_usage('11111111-1111-1111-1111-111111111111', 'speak')$$,
  '42501', null, 'signed-out callers cannot execute consume_usage');
reset role;

-- ════ I ▸ consume_usage: service-role-only, caps fixed in SQL (52–58) ════════
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$select public.consume_usage('11111111-1111-1111-1111-111111111111', 'speak')$$,
  '42501', null, 'signed-in clients cannot execute consume_usage either');
reset role;

select ok(has_function_privilege('service_role', 'public.consume_usage(uuid, text)', 'execute'),
  'service_role can execute consume_usage');
select is(public.consume_usage('11111111-1111-1111-1111-111111111111', 'daily-line'), true,
  'first call of the day is under budget');
select is(
  (select bool_and(public.consume_usage('11111111-1111-1111-1111-111111111111', 'daily-line'))
     from generate_series(2, 10)),
  true, 'calls 2 through 10 stay under the daily-line cap of 10');
select is(public.consume_usage('11111111-1111-1111-1111-111111111111', 'daily-line'), false,
  'call 11 is over the cap — refused');
select is(public.consume_usage(null, 'daily-line'), false, 'no identity, no budget');
select is((select calls from public.usage_counters
            where user_id = '11111111-1111-1111-1111-111111111111'
              and fn = 'daily-line' and day = current_date), 11,
  'the counter recorded every attempt');

-- ════ J ▸ AI cache tables: clients read, only the service writes (59–61) ═════
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$insert into public.daily_lines (user_id, day, line)
    values ('11111111-1111-1111-1111-111111111111', current_date, 'client-written line')$$,
  '42501', null, 'clients cannot write the daily-line cache');
reset role;

select lives_ok(
  $$insert into public.daily_lines (user_id, day, line)
    values ('11111111-1111-1111-1111-111111111111', current_date, 'a service-written line')$$,
  'the service path writes cache rows');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*)::int from public.daily_lines), 1, 'A reads her own cached line');
reset role;

select * from finish();
rollback;
