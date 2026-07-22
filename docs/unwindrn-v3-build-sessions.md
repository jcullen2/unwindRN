> STATUS: all five sessions COMPLETE (2026-07-16). Archival reference — see CLAUDE.md §State of the build.

# unwindRN — v3 build sessions for Claude Code

Five sessions, one per fresh Claude Code conversation. CLAUDE.md auto-loads and is law.
Paste each block verbatim, let it plan briefly, then let it run. Between sessions:
review the commits, run the app once yourself, start fresh.

## Part 0 — one-time setup (you, ~10 minutes)
1. Repo root gets: `CLAUDE.md`, `DESIGN.md`.
2. `mkdir -p design/brand` → unzip **unwindRN_Brand_Assets_v1_0.zip** into `design/brand/`.
3. Save **unwindrn-design-review-v3.html** as `design/reference.html`.
4. Supabase project → Settings → Edge Function secrets:
   `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`.
5. Apple Developer: Sign in with Apple capability on the app ID (Session 5 needs it;
   set it now so it never blocks).
6. In the repo: `claude` → confirm it read CLAUDE.md (ask it to summarize the scope
   lock in two sentences — if it can't, fix the file location before anything else).

---

## Session 1 — Rebrand + skeleton (the locked brand becomes code)

```
Read CLAUDE.md and DESIGN.md fully, then open design/reference.html and study every
phone frame. Then build the foundation:

1. src/theme/tokens.ts — every value from DESIGN.md §1–§5 (palette, glass, glow, heat
   scale, type scale, spacing, radii). No hex codes anywhere else in the app, ever.
2. <Sky/> component: time-reactive gradient + afterglow + 5% Skia grain per DESIGN.md §2,
   with a `forceBucket` prop for testing. Every screen renders inside it.
3. Navigation: expo-router with a custom floating glass pill tab bar per DESIGN.md §6 —
   three unlabeled icons (Home, Logbook, Insights) + the flame orb that opens an empty
   modal route /debrief. Profile = avatar chip on Home opening a sheet stub.
4. Fonts: Fraunces 500/600 via expo-font; wire the type scale into a <T/> text kit.
5. Lamp components from design/brand SVGs: <Lamp/> (bowl+flame) and <FlameGlyph/>.
6. Supabase: client setup, Sign in with Apple auth flow, and the full migration from
   CLAUDE.md's data model (idempotent, RLS on everything). Seed script: one profile
   (Maria, Peds Onc, 3 yrs, 3/wk, est 468/5600) + 16 realistic shifts across July with
   varied load/tags/nights so every later screen has real data to render.
7. Screen stubs wearing the Sky: Home, Logbook, Insights, Profile sheet, /debrief modal.

Definition of done: app boots to a signed-in Home stub on the ember sky with the pill
and breathing orb; migration applied; seed data queryable; DESIGN.md §8 screenshots of
the shell vs reference (nav pill + sky must already match).
```

## Session 2 — The voice debrief (the product's soul; take the whole day)

```
Read CLAUDE.md (voice pipeline section twice) and DESIGN.md §6. Build the full debrief
flow behind the flame orb:

STAGE 1 — Clock out (all taps, per reference frame 1 of the v2 spec carried forward):
hours chips with her usual preselected, 5-segment load bar with escalating haptics,
tag chips, "Save without talking" writing a complete shift row (source:'taps') to the
local queue then Supabase. 20 seconds thumb-only must be possible.

STAGE 2 — Voice:
- expo-speech-recognition, requiresOnDeviceRecognition:true, continuous interim results.
  Teleprompter UI per DESIGN.md (Fraunces 22, current line bone, history fading).
  End-of-turn on 1.2s silence or orb tap. "Aa" switches to quiet-mode text input.
- Edge Function supabase/functions/debrief-turn: input {profile, taps, transcript,
  userTurn}; streams sonnet reply via SSE; in parallel calls haiku with a strict JSON
  schema {crisis, tags_detected, hours_mentioned, win, weight, lesson} (zod-validate;
  strip patient-identifying fragments). Create
  supabase/functions/debrief-turn/system-prompt.md with EXACTLY the prompt below.
- Edge Function supabase/functions/speak: proxies ElevenLabs flash streaming TTS;
  client plays via expo-audio and captions the words. TTS failure degrades to text
  silently — the debrief never blocks.
- Live chips spring in as facts arrive; crisis:true renders the crisis card per
  CLAUDE.md immediately, above everything.

STAGE 3 — The record, forming: glass fields filling live with shimmer + flame caret,
"still listening…" placeholders, every field editable, "That's the shift — save it"
writes shift (source:'voice'|'both') + debrief_sessions with transcript.

Instrument voice-to-voice latency in dev (print P50/P90; target <1.5s). Cap 12 partner
turns. Offline: taps and transcript queue locally; partner defers politely.

Definition of done: I can speak a rough shift end-to-end — watch chips ignite, hear
the partner answer inside ~1.5s, watch Win/Weight/Lesson write themselves, save, and
see the row in Supabase. §8 screenshots vs reference frames "Listening" and "The
record, forming". Also prove: the crisis card fires on a test phrase, and "Save
without talking" alone produces a complete record.
```

**system-prompt.md (verbatim):**

```
You are the debrief partner inside unwindRN, talking with {display_name}, a
{specialty} nurse ({years_in} yrs), who just finished shift #{shift_number}. Her taps
tonight: {taps_summary}. You are a colleague who gets it — not a therapist, not a
chatbot.

Voice register: you are SPOKEN aloud. 1–3 short sentences per turn. One question at a
time, sometimes none. No exclamation points, no lists, no "I'm sorry you're going
through this" filler, no toxic positivity. Reference her specialty's reality
specifically when it's true. Silence-friendly: if she trails off, a short grounded
line beats a probe.

Never: ask for or repeat patient names, rooms, ages+diagnoses together, or any
identifying detail — if she offers them, keep the feeling, drop the identifiers, and
don't lecture unless she asks why. Never give clinical or medication advice. Never
diagnose her or use clinical labels for her. Never guilt her about skipping,
never mention streaks.

If she signals real crisis, your reply becomes: brief, warm, direct — you matter,
988 exists, you're staying right here. (A separate system shows the crisis card;
don't describe it.)

Your job each turn: help her put the shift down and notice what belongs in the
record — the win she'll shrug off, the weight she's carrying, the lesson she already
knows. End the session warm and brief when she's done: the record is kept; she can go.
```

## Session 3 — Home + heatfield + motion

```
Read DESIGN.md §2, §5–§7 and study the Home and Logbook frames in design/reference.html.

1. Home: ember sky; lamp 26px top-left; avatar chip top-right; monument numeral
   (career shifts = est + logged) counting up 900ms on first focus each day; hours line
   with the ~; the partner's daily presence line (Edge Function daily-line: haiku, one
   sentence from her real last-7-days aggregates, cached per day, flame glyph speaker
   mark); milestone whisper ("16 shifts to #500") — whisper, never a badge.
2. Logbook: heatfield month per DESIGN.md §6 — heat cells by load, violet night ticks,
   today ring, ignite-replay with haptics on open, drag-to-scrub readout, generated
   month caption (Edge Function month-caption, cached per month, describe never
   diagnose). Day → entry via matched-geometry expansion. List toggle + entry detail
   with edit. Month header: "July · 9 shifts · 112 hrs" from SQL.
3. Motion pass per §7: flame breathing, springs everywhere, reduced-motion checked on
   every animation.

Definition of done: Home and Logbook match their reference frames through §8 (two
passes, gaps logged); scrubbing feels physical; forceBucket proves all four skies.
```

## Session 4 — Conversational onboarding + Insights + Profile

```
Read DESIGN.md and the onboarding frame in design/reference.html.

1. Onboarding: ONE continuous scene, no pagination, no Next buttons. The partner asks
   aloud (speak function) with live captions; she answers by voice (same STT) or taps
   the fallback controls that accompany every question. Beats: (1) years + shifts/week
   → her estimated career renders live in apricot numerals ("…and nobody wrote a word
   of it down. That ends tonight.") and writes est_* to profile; (2) specialty cards —
   selection rewrites AND speaks the partner's preview line; (3) the two promises
   (patients stay private / this isn't therapy + 988) as glass cards, one "I'm in";
   (4) shift #{est+1} handoff → "Debrief tonight's shift" enters Stage 1, or "after my
   next shift" → one local notification, honest copy. The lamp's flame grows with each
   completed beat — full flame = done. Skippable entirely from beat 1 (sets sane defaults).
2. Insights: three modules from SQL only — load trend (apricot area curve on the sky,
   violet marks on night shifts), "hours over your usual" (Σ max(hours−usual,0), month),
   tag frequency ("Short-staffed · 7 of last 10"). Below 5 logged shifts the whole tab
   is the locked state: lamp, "Insights unlock at shift 5 — N to go", no fake data ever.
3. Profile sheet: identity header, "Your career record" card (est vs logged split,
   export "coming"), license & renewal stub fields, Support resources (988 + nurse
   lines), Privacy promise page (what we never store, voice-never-leaves-phone),
   reminders toggle, sign out, and DELETE ACCOUNT with typed confirmation → Edge
   Function delete-account cascading everything, signed out to a goodbye screen.

Definition of done: fresh install → onboarding by voice only (and once by taps only)
→ lands in first debrief; Insights honest in both states; deletion verified empty in
Supabase; §8 on all three areas.
```

## Session 5 — Live Activity + hardening + ship

```
1. Shift clock-in/out: on Home when no shift is open — "Clock in" starts a shift
   session; Live Activity per the reference lock-screen frame (lamp, elapsed, overtime
   turns apricot past usual_shift_hours, "Clock out → debrief" deep-links into Stage 1).
   Use the leading Expo-compatible Live Activity module; TIMEBOX 1.5 days — if the
   native target fights longer, ship an in-app banner fallback and log DESIGN-DEBT.
   App Intent "Clock out" for Siri if the module supports it in the box; else debt.
2. Hardening: VoiceOver labels on every control (the orb announces "Debrief, listening");
   reduced-motion audit; empty/error/offline states for every screen; the offline
   queue proven by airplane-mode test; token/latency logs quiet in prod.
3. Ship: EAS build → TestFlight (internal: Maria). App Store metadata — name
   "unwindRN — put the shift down", subtitle "Voice debrief + career logbook for
   nurses", privacy nutrition labels (voice processed ON DEVICE, transcripts/records
   stored, no ads, no data sale), age 17+, Health & Fitness/Medical categories
   reviewed, screenshots generated from the real app matching the reference frames.
   Review notes paragraph: what the AI does, the crisis card, PHI stance.

Definition of done: build on Maria's phone; a real shift clocked in at 07:00 shows the
Live Activity all day and lands in a voice debrief at 19:00; submission checklist
complete with metadata drafted for my approval before hitting submit.
```

## Running notes
- If a session stalls on a native module >30 min: say "take the fallback in CLAUDE.md
  and log the debt." Momentum beats completeness everywhere except the non-negotiables.
- After Session 2, do a real debrief yourself before continuing — the partner's voice
  register is the product; tune system-prompt.md by hand if a line lands wrong.
- Never let it inline the system prompt anywhere else, and never let it move AI calls
  client-side "temporarily."
