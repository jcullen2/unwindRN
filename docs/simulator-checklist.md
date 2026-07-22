# Running unwindRN on the iOS Simulator — design/UI verification pass

## One-time setup (your Mac)
1. **Xcode** installed from the App Store (open it once so it installs its tools),
   plus command-line tools: `xcode-select --install`.
2. Clone + install:
   ```sh
   git clone https://github.com/jcullen2/unwindrn.git && cd unwindrn
   git checkout claude/app-from-scratch-jgngvv
   npm install
   ```
3. Environment — create `.env` in the repo root:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://fucstcfrpxlmqzzpfped.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key — Supabase dashboard → Settings → API>
   EXPO_PUBLIC_PRIVACY_POLICY_URL=
   ```

## Run it
```sh
npx expo run:ios
```
First build compiles the native project (~10–15 min); it auto-opens the default
simulator. Pick a device with `npx expo run:ios --device` (choose an iPhone 15/16
class simulator — the design targets a modern notch/island phone).
Subsequent runs are seconds (`npx expo start`, press `i`).

## What behaves differently on a simulator (expected, not bugs)
- **Sign in with Apple** works only if the simulator is signed into an Apple ID
  (Settings → sign in). If it errors, that's the simulator, not the app.
- **On-device speech recognition is usually unavailable on simulators** — the
  debrief will silently offer the quiet-mode text composer instead of the mic.
  That IS the designed degradation. Voice must be verified on a physical phone.
- **TTS (the partner's voice)** stays silent until `ELEVENLABS_API_KEY` is set in
  Supabase secrets; captions still render. Haptics don't exist on simulators.

## The design pass (DESIGN.md §8 spirit — ~15 min)
Sign in → onboarding (pick ICU, 8 yrs, Nights, 12h) → welcome story → tabs.

- [ ] **Sky**: every screen is the petrol gradient with a faint amber glow along
      the bottom and visible grain — never flat black.
- [ ] **Type**: display text is Bricolage Grotesque (distinctive rounded 'g'),
      not the system font. If it's system font, the fonts failed to load.
- [ ] **Lantern**: the caged lantern renders crisply at every size (sign-in,
      lockups, partner glyphs). The flame never appears without the cage.
- [ ] **Onboarding**: 6 beats, dots advance, estimate card computes live
      (8 yrs × Nights → ≈1,152 shifts), "Light it" → 4-slide welcome story
      with auto-advancing progress bars.
- [ ] **Home**: greeting matches time of day; clock in → card flips to
      elapsed-timer state; "Clock out ›" hands hours into the debrief.
- [ ] **Debrief (the core flow)**: one question at a time — hours → load →
      ratio+flags → tags → one line. The amber record line grows at the top
      ("12h · steady-heavy · 1:5 · short-staffed"). "That's the shift — keep
      it" saves and returns; "Save without another word" always visible.
- [ ] **Talk stage**: "or talk it down instead" → pulsing lantern; type a turn
      (quiet mode) and confirm the partner's reply STREAMS in word by word and
      fact-chips ignite below. This proves the live AI pipeline end to end.
- [ ] **Logbook**: heatfield ignites cell-by-cell on open; drag-scrub reads out
      days; saved shift appears; night shifts wear the moon-mint tick (never
      violet, never a button).
- [ ] **Insights**: locked below 5 shifts with the lantern; after 5 saves it
      opens with year hero + month bars + milestone ring; footer reads
      "Numbers first. Described, never judged."
- [ ] **Profile**: amber-ring avatar, "Keeper of N shifts", "From your record"
      facts derive from what you actually saved; Delete account asks for typed
      DELETE and works (it's live-fixed).
- [ ] **Motion restraint**: entrances are single gentle rises; chips scale
      subtly on press; nothing loops or bounces except the lantern's slow
      pulse. Enable Settings → Accessibility → Reduce Motion and confirm the
      app goes still.
- [ ] **Milestone**: save shifts until a milestone (5) → 3-slide wrapped story.

Anything that fails: screenshot it and note the checklist line — hand the pair
back to Claude and it fixes against this list.
