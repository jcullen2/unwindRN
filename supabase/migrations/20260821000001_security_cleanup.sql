-- Security cleanup (2026-08-21) — STAGE 2 of the two-stage hardening.
-- PRODUCTION ORDER: apply ONLY after the five reviewed edge functions are
-- deployed and smoke-tested (they use consume_usage via service role and
-- write AI cache rows via service role). Applying this first would break the
-- OLD functions, which still call bump_usage and insert cache rows with the
-- caller's JWT. Local/CI stacks apply both stages together — that is the
-- final state and exactly what the pgTAP suite asserts. Idempotent.

-- 1 ▸ Retire bump_usage entirely ---------------------------------------------
-- consume_usage (service-role-only, caps fixed in SQL) is the single budget
-- authority now.
drop function if exists public.bump_usage(text, int);

-- 2 ▸ AI cache tables: reads only for clients --------------------------------
-- daily_lines / month_captions rows are written by the reviewed functions via
-- service role with a verified user id. Client INSERT policies retire.
drop policy if exists "daily_lines_insert_own" on public.daily_lines;
drop policy if exists "month_captions_insert_own" on public.month_captions;
