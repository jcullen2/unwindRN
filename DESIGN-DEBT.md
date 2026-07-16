# DESIGN-DEBT.md

Debt logged per CLAUDE.md workflow. Newest first.

## Sessions 3–5 (finish pass)
- **Live Activity shipped as the in-app fallback** (timeboxed per Session 5):
  clock-in/out lives on Home — elapsed timer, overtime turns apricot past
  usual_shift_hours, "Clock out → debrief" hands hours+night into Stage 1.
  The real lock-screen Live Activity (+ Siri App Intent) needs a native
  target/dev build; build it with the leading Expo Live Activity module when
  on a Mac.
- **Day-cell → entry uses a standard push**, not the matched-geometry
  expansion from §7 — needs measured-cell overlay work; queued for a motion
  polish pass.
- **Onboarding is tap-first**: the partner's preview lines speak via TTS when
  the key is set, but she answers by tap, not voice — voice answers reuse the
  Session 2 STT plumbing; wire after on-device STT verification.
- **month-caption function deploy pending** — source committed at
  supabase/functions/month-caption; the MCP bridge dropped mid-deploy. Deploy
  with `supabase functions deploy month-caption` (or ask Claude to retry).
  Client already degrades to "no caption".
- **Insights load-trend shows last 14 shifts** (not a strict month window) and
  reminders are a single next-evening notification rather than a recurring
  schedule — both honest simplifications, revisit with real user feedback.

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

## Session 1 (rebrand + skeleton)
- **§8 verification not run** — no iOS simulator in the build environment and
  `design/reference.html` was never received. Run §8 on-device: screenshots at
  21:00 vs the reference frames for Home, nav pill, debrief, logbook.
- **Whitelist deviation (pre-existing):** @tanstack/react-query and date-fns
  are in use from v1 and are not on the v3 whitelist. Flagged rather than
  ripped out mid-rebrand; decide keep-or-replace.
