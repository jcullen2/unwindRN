-- Security hardening (2026-07-17), per the security audit.
--
-- 1. PHI: the client no longer writes raw debrief transcripts (they stay in
--    memory on the phone; only the identifier-stripped win/weight/lesson is
--    persisted). Drop the column so storing a verbatim spoken transcript —
--    which could carry a patient name/room/MRN — is structurally impossible.
--
-- 2. Tag integrity: constrain shifts.tags to the canonical v1 set so a bad
--    client write can't corrupt insights/aggregations with non-canonical tags.
--
-- Idempotent.

alter table public.debrief_sessions drop column if exists transcript;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shifts_tags_canonical'
  ) then
    alter table public.shifts
      add constraint shifts_tags_canonical
      check (
        tags <@ array[
          'Short-staffed','Code','A loss','Good save','Hard family',
          'Float','Charge','Precepting','Quiet one'
        ]::text[]
      );
  end if;
end $$;
