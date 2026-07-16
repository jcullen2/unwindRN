# DESIGN-DEBT.md

Debt logged per CLAUDE.md workflow. Newest first.

## Session 2 (voice debrief)
- **On-device verification pending** — expo-speech-recognition is a native
  module: it needs a dev build (not Expo Go) and a real device/simulator to
  exercise. The flow detects availability and falls back to quiet-mode text
  automatically, so nothing blocks. Verify on device: mic permission copy,
  1.2s end-of-turn feel, interim teleprompter, and the P50/P90 latency print
  (`[debrief] first-token …` in Metro logs; target <1.5s voice-to-voice).
- **ELEVENLABS_API_KEY not set** — `speak` returns 503 until it's added via
  `supabase secrets set`; client degrades to captions-only silently. Also
  optional: ELEVENLABS_VOICE_ID (defaults to the "Sarah" premade voice —
  audition and choose a final voice).
- **TTS word-level caption sync not implemented** — the full reply captions on
  screen while audio plays; per-word highlighting would need timestamps from
  ElevenLabs (websocket API). Fine for v1.
- **Old `debrief`/`extract` edge functions are now unused** by the client
  (debrief-turn replaced both); left deployed and harmless. Delete from the
  dashboard when convenient.
- **Session mode is voice|text at creation** — a session that starts typed and
  switches to voice keeps mode 'text'. Cosmetic.

## Session 1 (rebrand + skeleton)
- **§8 verification not run** — no iOS simulator in the build environment and
  `design/reference.html` was not received (the brand zip arrived; the reference
  HTML upload didn't come through). Run §8 on-device: screenshots at 21:00 vs the
  reference frames for Home, nav pill, debrief, logbook.
- **Debrief is quiet-mode only** — the flame orb opens a teleprompter-style text
  debrief (no bubbles, per §9) wired to the existing `debrief`/`extract` edge
  functions. Voice pipeline (STT/TTS/live chips/SSE streaming, `debrief-turn` +
  `speak` functions) is Session 2 as planned.
- **Heatfield calendar not built** — Logbook is a glass list with month headers
  and load heat swatches. The heatfield month + ignite replay + scrub is Session 3.
- **Home presence line is static copy** — the `daily-line` edge function (haiku,
  cached per day) is Session 3.
- **Onboarding is the v1 three-pager restyled** onto the Sky — the conversational
  5-beat onboarding (voice + est_* capture) is Session 4. Until then
  est_career_* stays 0, so the monument numeral shows logged shifts only.
- **Whitelist deviation (pre-existing):** @tanstack/react-query and date-fns
  are in use from v1 and are not on the v3 whitelist. Flagged rather than ripped
  out mid-rebrand; decide keep-or-replace before Session 2.
- **extract edge function still speaks the v1 wire shape** (loss/mood); mapped
  client-side to weight/load. Session 2 replaces it with the per-turn utility
  schema {crisis, tags_detected, hours_mentioned, win, weight, lesson}.
