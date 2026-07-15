# unwindRN

Put the shift down. unwindRN is a consumer iOS app for nurses: **the Debrief**
(an AI partner, fluent in your specialty, that helps you process the shift) and
**the Logbook** (a career place of truth — shifts, hours, wins, losses, lessons —
auto-filled from debriefs).

Read `CLAUDE.md` first — it is the source of truth for scope, architecture,
security rules, tokens, and copy.

## Stack

- **App** — Expo SDK 57 (managed), TypeScript strict, Expo Router, dark-only
  "Last light" theme (`src/theme`).
- **Backend** — Supabase: Postgres with RLS on every table, Sign in with Apple,
  Edge Functions (Deno) as the only place that talks to the Anthropic API.
- **Models** — `claude-sonnet-4-6` for the debrief conversation;
  `claude-haiku-4-5-20251001` for the safety classifier and extraction.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Supabase project URL and anon
   key (Project Settings → API). `.env` is gitignored — never commit it.
3. Set the server-side secrets (the Anthropic key lives ONLY here):

   ```sh
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <project-ref>
   ```

4. In the Supabase dashboard: Authentication → Providers → Apple, configure
   Sign in with Apple with the app's bundle id (`com.unwindrn.app`).
5. `npx expo start` and press `i` for the iOS simulator. Note: Sign in with
   Apple needs a real device or a simulator signed into an Apple ID.

## Backend layout

- `supabase/migrations/` — schema: `profiles`, `debriefs`, `messages`,
  `shifts`, all with RLS (`user_id = auth.uid()`), plus the `shift_totals`
  view (totals are computed, never stored).
- `supabase/functions/debrief` — conversation pipeline; returns
  `{ reply, crisis }` (parallel safety classifier on the latest user message).
- `supabase/functions/extract` — transcript → draft shift record (strict JSON,
  hard PHI-exclusion instruction).
- `supabase/functions/delete-account` — service role; wipes all user rows,
  then the auth user.

Deploy functions with `supabase functions deploy debrief extract delete-account`.

## Ship

```sh
eas build --platform ios --profile production
eas submit --platform ios
```

`assets/images/icon.png` / `splash-icon.png` are generated placeholders
(indigo field, amber coil) — replace with final art before submission.

unwindRN is not therapy or medical care. If you're in crisis, call or text 988.
