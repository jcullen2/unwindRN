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
One session = one numbered prompt from unwindrn-v3-build-sessions.md. Start each in a
fresh context. Plan briefly, then build; commit in small conventional-commit steps
(feat:, fix:, chore:). Finish every session with its Definition of Done, including the
DESIGN.md §8 screenshot comparison. Update IDEAS.md with anything cut. Never echo
secrets. If a native module fights for more than the timebox, ship the fallback and
write the debt down in DESIGN-DEBT.md.
