# DESIGN-DEBT.md

Debt logged per CLAUDE.md workflow. Newest first.

## On-device shakedown (2026-07-22)
- **PAID:** display-type clipping everywhere (lineHeight audit); "Light it"
  navigation dead-end; Skip wiping profiles; Apple-only login; demo mode
  (removed entirely — dev builds keep a __DEV__ "Dev bypass" via anonymous
  sign-in; disable anonymous sign-ins in the dashboard before launch).
- **PAID (server):** debrief-turn deploy now bundles system-prompt.md + daily
  rate cap; demo-login endpoint retired (410, verify_jwt on).
- **OPEN — TOP BLOCKER:** debrief-turn still 500s before streaming; root cause
  unknown (bump_usage RPC? Anthropic SDK under Deno? model id?). Debug variant
  ready in session scratchpad; deploy it, read the error, fix, revert.
- **OPEN:** win-line TextInput appeared to truncate typed text mid-entry —
  verify maxLength intent.
- **OPEN:** app icon / splash need a full-res re-export pass before submission.

## Pre-launch checklist item (2026-07-17)
- **Anonymous sign-ins are enabled for dev demo mode** (sign-in screen,
  __DEV__-only entry). Per-user RLS fully isolates anonymous users (no shared
  tables in v1), and per-user daily AI caps apply — but an anonymous user does
  consume AI budget. Before public launch either (a) disable "Allow anonymous
  sign-ins" in the Supabase dashboard, or (b) add a reduced daily cap for
  `is_anonymous` users inside the AI edge functions. Option (a) costs nothing:
  the demo entry doesn't exist in release builds.

## QA sweep — real-build hardening (2026-07-17)
Full architecture/security/scalability audit (two parallel review agents). Fixed
in code; deploy state noted. The AI integration was verified REAL and correct —
`claude-sonnet-4-6` (partner) + `claude-haiku-4-5-20251001` (utility) are valid
active models and `output_config.format` is the correct structured-output shape;
daily-line/month-caption/debrief-turn/speak all call real models with honest
fallbacks. No mocks in the AI path.

**Fixed + applied to live DB:**
- **PHI: raw transcript no longer persisted.** `debrief.tsx` stopped writing the
  verbatim spoken transcript to `debrief_sessions.transcript`; the column was
  DROPPED (migration `20260717000000`). Transcripts live only in memory on the
  phone; only the identifier-stripped win/weight/lesson is stored. (Was: full
  spoken turns written to DB every turn, retained forever — a direct violation of
  the "patients stay unnamed" law.)
- **Tag integrity:** `shifts.tags` now has a DB check constraint pinning it to the
  canonical v1 set (migration `20260717000000`).

**Fixed in code — DEPLOY PENDING (MCP deploy was declined mid-session):**
- **`delete-account` was broken for every user** — it deleted the dropped v1
  tables (`messages`/`debriefs`), so the first delete threw and the function 500'd
  before ever calling `deleteUser`. In-app deletion (an Apple requirement) never
  worked. Fixed to the v3 schema + auth-user cascade. **Redeploy `delete-account`.**
- **PHI backstop in `debrief-turn`** — added a deterministic `scrubPHI` pass that
  strips structured identifiers (room/bed/MRN/unit numbers, 4+ digit runs) from
  win/weight/lesson before they're returned, so guardrail no longer depends on the
  model alone. **Redeploy `debrief-turn`.**
- Deploy both: `supabase functions deploy delete-account debrief-turn` (or via the
  Supabase MCP). Until then, live `delete-account` is still the broken version.

**Live data — added:**
- Supabase Realtime subscription on the user's own `shifts` + offline-queue sync
  emitter (`lib/live.ts`, `lib/queue.ts::onShiftsSynced`), mounted in the tab
  shell. Home/Logbook/Insights now update live across devices and when a
  dead-zone-queued shift finally syncs (previously one-shot fetches only).

**Cleanup:**
- Deleted dead edge functions `supabase/functions/debrief` + `extract` (v1 schema,
  never called by the client). They are still DEPLOYED on the project — remove them
  from the Supabase dashboard (no MCP delete tool).

**Still open (documented, not yet built):**
- **No per-user rate limiting / daily budget on the AI + TTS edge functions**
  (`debrief-turn`, `daily-line`, `month-caption`, `speak`). A single authed account
  can run up unbounded Anthropic/ElevenLabs spend. Plan: a `usage_counters` table
  keyed (user_id, day) incremented per call, with a soft daily cap returning 429;
  the 12-turn-per-debrief cap already bounds one session. Build before public launch.
- **`ELEVENLABS_API_KEY` still unset** → TTS returns 503, client degrades to
  captions silently. Set the secret to enable voice-out; nothing else to build.
- **Insights pay-position band is regional market context, not her data** (markers
  wear `~` + a disclaimer; CCRN hours ARE real). Needs a real pay dataset
  (BLS/market API keyed on specialty+city) before the numbers mean anything.
- **Self prompt-injection (low):** profile `display_name`/`specialty` and client
  `taps.tags` are interpolated into edge-function system prompts. User-scoped only
  (can't affect another user), but lets a user steer their own partner's guardrails.
  Pass as message content or delimit before splicing.
- **`speak` takes the caption via GET `?text=`** (log-prone). The text is the
  partner's reply (not PHI); low. Function already supports POST — switch when the
  audio player can POST a streamed source.

## Deep Ward re-skin (2026-07-17)
- **Device §8 verification pending** — the whole Deep Ward re-skin (petrol/amber,
  Bricolage, caged lantern, 4-tab nav, one-question debrief, wrapped welcome +
  milestone) is verified `tsc` clean but NOT yet run on-device. Verify §8 on a
  dev build: Bricolage weights load, lantern renders via Skia at all sizes, amber
  afterglow + grain, nav pill blur, wrapped auto-advance timing, reduced-motion.
- **Debrief ratio + flags are display-only** — the companion's ds2 step collects
  ratio (1:2…1:6) and flags (Floated / No break / Charge) into the growing record
  line, but the `shifts` schema has no columns for them, so they are NOT persisted
  (hours/load/tags/is_night/win=note are). Add columns or fold into tags/lesson if
  they prove worth keeping; today they enrich the on-screen line only.
- **Insights "Career signals" pay markers are placeholder regional context** — the
  pay-position band (You ~$52 / +charge ~$56 / travel eq. ~$71 / p25 / p75) is NOT
  derived from her data and wears the ~ with an explicit whisper. CCRN eligibility
  IS real (logged hours toward 2,000). Wire a real regional pay source (BLS / market
  API keyed on specialty + city) before treating the markers as anything but
  illustration. Gated behind the "your ask" toggle, default on.
- **Profile "From your record" facts are computed client-side** over the loaded
  shifts array (longest consecutive stretch, top win-word, top tag, keeping-since).
  Fine at v1 volumes; move to a SQL/materialized view if the array grows large.
- **Legacy token aliases retained** — `tokens.ts` still exports bone/flame/apricot/
  ash/violet mapped onto Deep Ward so old call sites render correct colors. Prune
  once every screen references the new names directly.

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

## Dev demo door (2026-07-17) — REMOVE BEFORE LAUNCH
- **`demo-login` edge function is live with verify_jwt=false** (deliberately —
  it must be callable pre-auth). It mints throwaway `@demo.unwindrn.app` users
  (RLS-isolated, swept after 24h) so simulator demos need zero dashboard
  config. Before public launch: delete the function from the dashboard (client
  demo entry is already __DEV__-only, so release builds never call it).
