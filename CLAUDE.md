# CLAUDE.md — unwindRN

You are building unwindRN, a consumer iOS app for nurses: a voice-first post-shift
debrief partner + a career logbook. The user is a nurse who just finished a 12-hour
shift. Every decision is calm over clever. This file is law; when in doubt, re-read it.

## v1 scope — build ONLY this
- Voice-first debrief flow (3 stages: Clock-out taps → voice conversation → record
  confirm). Launched from the flame orb, presented as a full-screen modal flow.
- Home ("ember sky"), Logbook (heatfield calendar + list + entry detail),
  Insights (3 modules + locked state), Profile (sheet from Home avatar).
- Conversational onboarding (5 beats, voice with tap fallbacks).
- Sign in with Apple via Supabase Auth. In-app account deletion (full cascade).
- Shift clock-in/out + Live Activity (timeboxed — see Session 5).

**Do NOT build:** Jobs/marketplace, social features, streaks, Wrapped UI (capture the
data; the feature ships at Nurses Week), Android, push campaigns, gamification,
therapy-style mood journaling, anything not listed above. If tempted, stop and note
it in IDEAS.md instead.

## Architecture
- Expo (managed) + TypeScript + expo-router. iOS first; keep Android compiling but untested.
- Supabase: Auth (Sign in with Apple), Postgres with RLS on every table, Edge Functions.
- **Edge Functions are the ONLY place that calls external AI APIs.** Client never holds
  AI keys. Keys live in Supabase secrets: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY.
- Models: claude-sonnet-4-6 for the debrief partner (streaming). claude-haiku-4-5-20251001
  for the per-turn utility call (safety + fact extraction, structured JSON).
- Local-first for taps: shifts save to local queue immediately, sync to Supabase.
  A dead zone in a hospital parking garage must never lose a record.

## The voice pipeline (Session 2 builds this)
1. **STT — on-device.** expo-speech-recognition with `requiresOnDeviceRecognition: true`
   (iOS). Audio NEVER leaves the phone; only transcript text goes to the server. Show
   interim results live (teleprompter). End her turn on ~1.2s silence or flame-button tap.
2. **LLM.** Edge Function `debrief-turn`: receives {session context, taps, new user turn},
   streams the partner's reply (SSE). System prompt lives at
   supabase/functions/debrief-turn/system-prompt.md — never inline it elsewhere.
3. **Utility call (parallel).** Same function fires haiku with a strict JSON schema:
   {crisis: bool, tags_detected: [], hours_mentioned: number|null, win: string|null,
   weight: string|null, lesson: string|null}. Drives live chips + record assembly +
   crisis card. If crisis=true, surface the crisis card immediately, over everything.
4. **TTS.** Edge Function `speak` proxies ElevenLabs (flash tier, streaming) → client
   plays via expo-audio while captioning the text on screen. If TTS fails, degrade
   gracefully to text-only — never block the debrief.
5. **Budgets.** Max 12 partner turns per debrief; truncate context beyond ~8k tokens;
   log token counts. Target voice-to-voice < 1.5s; measure and print it in dev.

## Product non-negotiables (these protect her license and her life)
- **PHI guardrail:** never solicit or store patient names, rooms, MRNs, or identifying
  details. The system prompt deflects; the haiku extractor strips identifying fragments
  from win/weight/lesson before they render. UI whisper on debrief entry.
- **Crisis card:** classifier-triggered, dims the screen, "You matter.", Call/Text 988,
  "Keep talking" keeps the session open. Never gate, never delay it.
- **Not therapy:** the partner never diagnoses, never gives clinical or medication
  advice, never uses clinical labels for her ("burnout," "depression," "PTSD").
  Insights describe patterns; they never diagnose.
- **Deletion:** in-app account deletion removes auth user + all rows, immediately.
- **No guilt mechanics:** no streaks, no red badges, no "you missed a debrief."
  "Save without talking" and "Not tonight" are always one tap and never shamed.

## Data model (migration in supabase/migrations — idempotent)
```sql
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text, specialty text, years_in numeric, shifts_per_week numeric,
  usual_shift_hours numeric default 12,
  est_career_shifts int default 0, est_career_hours int default 0, -- onboarding estimate (~)
  created_at timestamptz default now()
);
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  shift_date date not null, hours numeric not null,
  load smallint check (load between 1 and 5),          -- 1 Light … 5 Brutal
  tags text[] default '{}',                            -- Code, Short-staffed, …
  started_at timestamptz, ended_at timestamptz, is_night boolean default false,
  win text, weight text, lesson text,                  -- weight = the emotional note, NOT load
  source text default 'taps',                          -- taps | voice | both
  created_at timestamptz default now()
);
create table if not exists debrief_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  shift_id uuid references shifts on delete cascade,
  transcript jsonb default '[]', mode text default 'voice',
  started_at timestamptz default now(), ended_at timestamptz
);
-- RLS: enable on all three; policy = user_id = auth.uid() (profiles: id = auth.uid()).
-- Insights are SQL over shifts only. Career totals = est_* + count/sum of logged rows.
```
Canonical tag set v1: Short-staffed, Code, A loss, Good save, Hard family, Float,
Charge, Precepting, Quiet one. Load labels: Light/Steady/Full/Heavy/Brutal.

## Design
Visual law: **DESIGN.md**. Visual target: **/design/reference.html** (the v3 review —
match its phones; ignore its prose). Brand assets: **/design/brand/** (locked identity —
lamp mark, no handle, never recolor the flame independently; min 24px mark).
"Done" for any UI work = DESIGN.md §8 verification, not "it renders."

## Dependency whitelist
expo core, expo-router, @supabase/supabase-js, expo-apple-authentication,
expo-linear-gradient, expo-blur, expo-haptics, expo-font, expo-audio,
expo-speech-recognition, react-native-reanimated, @shopify/react-native-skia,
expo-secure-store, @react-native-async-storage/async-storage, expo-notifications
(local only), zod. Live Activity module per Session 5 only. Anything else: ask first
in a comment and stop.

## Copy register
Warm, floor-literate, zero corporate. She/her for the user in comments. The partner
speaks like a colleague who gets it: short sentences, one question at a time, no
exclamation points, no "I'm sorry you're going through this" filler. All numbers from
her estimate wear the ~. Reminder copy is honest: "one gentle reminder, no nagging."

## Workflow
Build sessions 1–5 are COMPLETE (docs/unwindrn-v3-build-sessions.md is archival).
For new work: read §State of the build below first — do not re-derive or rebuild
what it says exists. Plan briefly, then build; small conventional commits (feat:,
fix:, chore:). UI work isn't done until DESIGN.md §8 passes on-device. Update
IDEAS.md with anything cut, DESIGN-DEBT.md with anything shipped as a fallback.
Never echo secrets. Keep §State of the build current — it exists so future
sessions never pay to rediscover the codebase.

## State of the build — 2026-07-22 (keep current; the map, not the territory)
Local repo `~/Desktop/unwindRN/app` (main) · tsc clean · all committed (no remote yet).

**2026-07-21/22 — first-ever on-device run (simulator, this Mac) + fixes:**
- Dev environment on this Mac works: Xcode 26.6, iOS 26.5 sim runtime, CocoaPods
  1.17 via user gems (`PATH+=~/.gem/ruby/2.6.0/bin`; do NOT use Homebrew — owned by
  another user). Build with `xcodebuild -workspace ios/unwindRN.xcworkspace -scheme
  unwindRN` (expo run:ios misdetects → signing error). `xattr -rc` once fixed
  codesign "detritus". Metro: plain `nohup npx expo start` (NEVER CI=1 — it freezes
  the file map and serves stale bundles).
- FIXED: display-type clipping app-wide (T defaults to body's 23px line box; every
  fontSize override now carries lineHeight; Lockup computes it). Onboarding
  "Light it" dead-end (refreshProfile before guarded replace). Skip wiping saved
  profiles (ignoreDuplicates upsert). Apple-only login (email primary — signIn
  or quiet signUp, one Continue). DEMO MODE REMOVED (client + repo + server
  endpoint retired 410; a __DEV__-only anonymous "Dev bypass" link remains, and
  anonymous sign-ins are still ON in the dashboard for it).
- debrief-turn redeployed v3 WITH system-prompt.md (was missing from the deploy
  bundle — guaranteed 500) + bump_usage rate limiting. **STILL 500s — root cause
  open**; error-detail debug variant prepared but not deployed. ANTHROPIC_API_KEY
  confirmed set (108 chars). This is the top blocker: the partner cannot reply.
- Email auth: Supabase email provider works; **email confirmation ON** (signUp
  returns no session until the link is clicked). Phone auth needs Twilio.
- IN PROGRESS: full auth + onboarding revamp (create-account/login split; email
  OTP, phone, Apple; contextual iOS permission priming; richer data capture) —
  research phase; resources studied: Apphud onboarding examples, IxDF login-screen.

**Brand is now "DEEP WARD" — the visual law lives in code, DESIGN.md §1–§5 is
archival.** Petrol-green night (`#090F0E`) + amber accent (`#FFB65C`/`#FFC97E`);
moon-mint (`#9BC7BD`) = night-shift data ONLY; violet retired. **Bricolage
Grotesque** is the single display face (500/600/700 in assets/fonts). The **caged
lantern** mark (flame never appears without the cage) replaces the lamp. Nav is 4
icon tabs (Home · Journal · Insights · Profile) — no flame orb; the debrief is
launched from Home. Sky is one petrol treatment on every screen (not time-reactive;
bucket API is a no-op shim). Prototype (`Design_optimization_needed.zip` →
`unwindRN Prototype.dc.html`) is the pixel target.

**Backend — Supabase project `unwindRN-v1` (`fucstcfrpxlmqzzpfped`, us-east-1):**
- Schema applied + RLS on everything (`(select auth.uid())` form); security advisor: 0 findings.
  Tables: profiles · shifts · debrief_sessions · daily_lines · month_captions.
- Edge functions LIVE: `debrief-turn` (SSE sonnet + parallel haiku utility; system
  prompt ONLY in its system-prompt.md; 12-turn cap; ~8k-token truncation; now with
  a deterministic PHI `scrubPHI` backstop on win/weight/lesson — **local fix awaiting
  redeploy**), `speak` (ElevenLabs proxy, 503 → client degrades to text silently),
  `daily-line` + `month-caption` (haiku, cached per day/month), `delete-account`
  (service role — **FIXED locally, awaiting redeploy**: the live version deletes
  dropped v1 tables and 500s, so in-app deletion is broken until deployed). Legacy
  `debrief`/`extract` deleted from the repo; still deployed — remove from dashboard.
  Redeploy: `supabase functions deploy delete-account debrief-turn`.
- Security (audit 2026-07-17): RLS on every table; no client-side AI keys; `.env`
  gitignored. Migration `20260717000000` DROPPED `debrief_sessions.transcript`
  (verbatim spoken PHI is never stored — transcripts stay in memory on device) and
  added a canonical-tag check on `shifts.tags`. Open: no per-user rate limiting on
  AI/TTS functions (DESIGN-DEBT).
- Live data: Realtime subscription on the user's `shifts` + offline-queue sync
  emitter (`lib/live.ts` mounted in the tab shell) keep Home/Logbook/Insights fresh
  across devices and after a dead-zone sync.
- Secrets: ANTHROPIC_API_KEY set. **ELEVENLABS_API_KEY not set** (TTS silent until then).
- Client env in `.env` (untracked; template `.env.example`). Seed: `scripts/seed.sql`.

**Client map (src/):**
- theme/tokens.ts — the Deep Ward source of truth (palette/type/space/heat/glow);
  no hex anywhere else. Keeps legacy aliases (bone/flame/apricot/ash/violet) mapped
  onto Deep Ward so old call sites still render correct colors.
- brand/ — caged-lantern mark rendered via Skia from design/brand/lantern_mark_*.svg
  (geometry verbatim; flame never without the cage). Exports Lantern/LanternGlyph/
  Lockup + legacy aliases (Lamp/FlameGlyph → small lantern).
- components/ — sky (single petrol gradient + amber afterglow + grain; glowBoost;
  bucket props are no-op shims), kit (T Bricolage-aware/Lockup/PageTitle/Glass[warm]/
  FlameButton amber-gradient/QuietButton/Chip amber-selected/GlassField), nav-pill
  (4 icon tabs, petrol glass blur, NO orb), heatfield (moon-mint night ticks, amber
  today ring, ignite replay, drag-scrub).
- lib/ — turn (SSE client via expo/fetch), voice (on-device STT + quiet-mode
  detection), tts, queue (local-first AsyncStorage shift queue), queries
  (react-query, user-keyed), auth, supabase, api, constants.
- app/ — sign-in (PulsingLantern) → onboarding (6 beats, writes est_*) → welcome
  (4-slide wrapped) → (tabs): index=Home (lockup, greeting, on-shift⇄next card, week
  strip, 3 stat tiles, milestone bar, daily-line), logbook (Lockup + Logbook/Journal
  views, heatfield + memory card + top entries), insights (hero + month bars +
  milestone ring + this-month deltas + Career-signals pay/CCRN, locked <5),
  profile (TAB: amber-ring avatar, "Keeper of N", "From your record", settings,
  delete-account, 988). Modals: debrief (companion one-question taps → talk voice →
  record), record, resources, shift/[id], milestone (3-slide wrapped, fullScreen).

**Read on demand (not by default):** DESIGN.md (visual law), DESIGN-DEBT.md (the
authoritative gap list — device verification, Live Activity native target, §8 pass),
docs/store-metadata.md (App Store copy + submission checklist), README.md (setup).
Whitelist deviation awaiting a decision: @tanstack/react-query + date-fns (v1 carryover).
