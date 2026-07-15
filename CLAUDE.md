# unwindRN — CLAUDE.md

## What this is
unwindRN is a consumer iOS app for nurses. Two screens: **the Debrief** (an AI partner,
fluent in the nurse's specialty, that helps her process the shift) and **the Logbook**
(a career place of truth — shifts, hours, wins, losses, lessons — auto-filled from
debriefs). The nurse is the customer. Never the hospital.

## The mission
Ship v1 to the App Store **this week**. Definition of done: a nurse can sign in with
Apple, debrief a real shift in text, confirm the extracted shift record, see her
logbook totals grow, delete her account, and reach crisis resources — all on TestFlight
by Thursday night, submitted for App Review by Friday night.

## v1 scope — LOCKED

**Build:**
- Sign in with Apple (Supabase Auth), minimal profile (name, specialty, years in)
- 3-screen onboarding (copy below — use verbatim)
- Debrief: text chat with streaming-or-typing-indicator, "End debrief" flow
- Extraction: end of debrief → structured shift record → user confirms/edits → saved
- Logbook: totals header (shifts, hours), reverse-chron shift list, one-tap manual add
- Milestone detection at shifts #1, 10, 25, 50, 100, 250, 500 (simple in-app card;
  shareable image export is a stretch goal, not a blocker)
- Settings: profile edit, crisis resources, privacy policy link, sign out,
  **in-app account deletion** (Apple requirement — full data wipe)
- Crisis resource surfacing (see Product non-negotiables)

**Do NOT build (v1.1+, do not start, do not scaffold):**
- Voice input · Android · push notifications · community/social · monetization or
  paywalls · light mode · analytics SDKs · streaks/gamification beyond milestones
- Any field, table, or prompt that stores patient-identifying information

## Architecture
- **App:** Expo (managed workflow, latest stable SDK), TypeScript `strict`, Expo Router,
  dark theme only.
- **Backend:** Supabase — Postgres with RLS on every table, Auth (Sign in with Apple),
  Edge Functions (Deno) as the ONLY place that talks to the Anthropic API.
- **Models:** `claude-sonnet-4-6` for the debrief conversation;
  `claude-haiku-4-5-20251001` for the safety classifier and extraction.
- **Builds/ship:** EAS Build → TestFlight → App Store.

## Security non-negotiables
- The Anthropic API key lives ONLY in Supabase secrets (`supabase secrets set`).
  It never appears in client code, env files committed to git, or logs.
- Every table has RLS: `user_id = auth.uid()`. Edge functions receive the user's JWT
  and use it (anon key + auth header), not the service role, except `delete-account`.
- `.env*` is gitignored. Never print secrets in command output.

## Product non-negotiables (the "do good" layer — also the moat)
1. **PHI guardrail.** The debrief agent never solicits patient-identifying details and
   never repeats any the user volunteers. Extraction strips them. No patient-identity
   fields exist anywhere in the schema. Onboarding states this promise plainly.
2. **Crisis resources.** The debrief pipeline runs a parallel safety classifier on each
   user message; when flagged, the client surfaces the crisis card (988 call/text,
   Crisis Text Line). A static "Support resources" page is always reachable from
   Settings and the debrief screen's overflow menu.
3. **Not therapy.** The app never claims to be therapy, medical care, or diagnosis —
   in-app copy, App Store metadata, and agent behavior all hold this line.
4. **Account deletion** wipes profiles, debriefs, messages, shifts, and the auth user.

## Data model
- `profiles` — id (= auth.users.id), display_name, specialty, years_in, created_at
- `debriefs` — id, user_id, started_at, ended_at, message_count
- `messages` — id, debrief_id, user_id, role ('user'|'assistant'), content, created_at
- `shifts` — id, user_id, shift_date, hours numeric null, unit text null, win text,
  loss text, lesson text, mood int null (1–5), source ('debrief'|'manual'),
  debrief_id null, created_at
- Totals (shift count, hours sum) computed by query/view — never stored counters.

## Edge functions
- `debrief` — receives message history + profile context; injects the system prompt
  (see `supabase/functions/debrief/prompt.ts`); calls sonnet; in parallel runs the
  haiku safety classifier on the latest user message; returns `{ reply, crisis: bool }`.
- `extract` — receives the transcript; calls haiku with the extraction schema; returns
  the draft shift record for user confirmation. Instruction: exclude anything that
  could identify a patient from every field.
- `delete-account` — service role; deletes all user rows, then the auth user.

## Design tokens — "Last light" (dark only)
- bg `#14152B` · surface `#20224A` · elevated `#2A2D5E` · line `#3A3D6B`
- text `#F4F2EA` · secondary `#C9C7DD` · muted `#8A8CA8`
- accent amber `#E9A83F` (milestones, primary actions) · danger `#E06C5A`
- Radii 12/16 · spacing on a 4pt scale · generous line-height; this app is opened
  exhausted at 8pm and 7:40am — calm over clever.
- Type: system font (SF) for UI. Optional: Fraunces for large logbook numerals only.

## Onboarding copy (verbatim)
1. **Put the shift down.** unwindRN is your post-shift debrief partner and career
   logbook. Talk it out. Keep the record.
2. **Your patients stay private.** Talk about your day, not your patients' identities.
   We never ask for names, rooms, or details that could identify a patient. That
   protects them — and your license.
3. **Not therapy. Still yours.** unwindRN isn't medical care or therapy. If you're in
   crisis, call or text 988. For everything else — we're here after every shift.

## Voice & copy rules
Second person, calm, concrete. Never toxic positivity, never "self-care" lectures,
never clinical judgment. Buttons say what they do ("End debrief", "Save shift").

## Dependencies — whitelist
expo, expo-router, react, react-native, @supabase/supabase-js,
expo-apple-authentication, expo-secure-store, @tanstack/react-query,
react-native-safe-area-context, react-native-screens, expo-font, date-fns.
`react-native-view-shot` only if the share-card stretch goal is reached.
**Anything else: ask first.**

## Workflow expectations
- For any multi-file change: propose a short plan before writing code.
- After each feature: run `tsc --noEmit`, boot the iOS simulator, verify, then commit
  (conventional commits: `feat:`, `fix:`, `chore:`).
- Small diffs over big rewrites. Flag any deviation from this file instead of
  silently deciding.
- Security-adjacent files (edge functions, migrations, RLS policies) get extra care —
  summarize what changed and why after touching them.
