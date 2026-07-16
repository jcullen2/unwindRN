# unwindRN

Put the shift down. A consumer iOS app for nurses: a **voice-first debrief
partner** (fluent in her specialty, spoken register, never therapy) and a
**career logbook** (shifts, hours, wins, the weight, the lessons — the record
writes itself).

**Law:** `CLAUDE.md` (scope, architecture, non-negotiables — includes the
current build-state map) and `DESIGN.md` (visual law). Gaps live in
`DESIGN-DEBT.md`; store copy in `docs/store-metadata.md`.

## Stack
- **App** — Expo SDK 57 (managed), TypeScript strict, expo-router. Ember-sky
  system from `src/theme/tokens.ts`; brand SVGs in `design/brand/` (locked).
- **Backend** — Supabase (`unwindRN-v1` / `fucstcfrpxlmqzzpfped`): Postgres +
  RLS, Sign in with Apple, Deno edge functions — the ONLY place AI APIs are called.
- **Models** — `claude-sonnet-4-6` streams the debrief partner;
  `claude-haiku-4-5-20251001` runs the per-turn utility (safety + facts),
  daily lines, and month captions. TTS: ElevenLabs flash via `speak`.

## Edge functions (all deployed)
`debrief-turn` (SSE reply + parallel utility JSON) · `speak` (TTS proxy,
degrades silently) · `daily-line` · `month-caption` · `delete-account`
(service role). Deploy: `supabase functions deploy <name>`.

## Setup
1. `npm install`
2. `cp .env.example .env` and fill in the Supabase URL + anon key.
3. Secrets (server only, never client):
   `supabase secrets set ANTHROPIC_API_KEY=... ELEVENLABS_API_KEY=... --project-ref fucstcfrpxlmqzzpfped`
4. Supabase dashboard → Authentication → Apple provider (bundle id `com.unwindrn.app`).
5. **Dev build required** (STT/haptics/TTS are native — Expo Go won't do):
   `eas build --profile development --platform ios`, then `npx expo start`.
6. Optional seed data: `scripts/seed.sql` (instructions inside).

## Verify (the loop that matters)
Sign in → onboarding by taps (estimate → specialty → promises → handoff) →
orb → clock-out taps → speak a rough shift → chips ignite, partner answers
(<1.5s target; watch `[debrief] first-token` in Metro) → "That's the shift" →
record saves → heatfield ignites → milestone card at #1. Also prove: crisis
card on a test phrase; "Save without talking" alone writes a complete row;
airplane mode → the queue syncs on foreground.

## Ship
`eas build --platform ios --profile production` → `eas submit`.
Checklist + App Store copy: `docs/store-metadata.md`. Set a real
`EXPO_PUBLIC_PRIVACY_POLICY_URL` before building — EXPO_PUBLIC vars bake in.

unwindRN is not therapy or medical care. In crisis, call or text 988.
