# unwindRN — DESIGN.md

> ## ⚠️ SUPERSEDED BY "DEEP WARD" (2026-07-17) — read this first
> The visual system below (v3 "ember sky" — Nightingale lamp, Fraunces serif,
> flame-orb, time-reactive indigo/violet sky) is **retired**. The live brand is
> **Deep Ward**, and its law lives in code, not prose:
> - **Tokens:** `src/theme/tokens.ts` is the single source of truth (petrol-green
>   night `#090F0E`, bone-mint ink `#EAF1EC`, moss `#93A69C`, **amber** accent
>   `#FFB65C`/`#FFC97E`, **moon-mint** `#9BC7BD` for night-shift data ONLY).
>   Violet is fully retired; night data is moon-mint. No hex outside this file.
> - **Type:** **Bricolage Grotesque** is the single display face (500/600/700).
>   Fraunces is retired. System sans for body.
> - **Mark:** the caged **lantern** (`src/brand/index.tsx`, geometry verbatim
>   from `design/brand/lantern_mark_*.svg`). The flame NEVER appears without the
>   lantern body/cage. The flame-orb nav button is gone; nav is 4 icon tabs.
> - **Sky:** one petrol gradient + amber afterglow + 5% grain on every screen
>   (no longer time-reactive; the bucket API is a no-op shim).
> - **Visual target:** the Deep Ward prototype
>   (`Design_optimization_needed.zip` → `unwindRN Prototype.dc.html`) is
>   canonical. The sections below (§1 tokens, §2 sky, palette, serif) describe
>   the retired look and are kept only for archival diffing.
> Everything past this banner that conflicts with the above is history.

---

Law for anything visual (Deep Ward mechanics — glass depth, motion springs,
§8 verification — still apply; only the palette/type/mark are replaced above).
"Done" = §8, not "it renders."

## The brand (locked — see /design/brand/README.txt)
Nightingale lamp, handleless. Never add a handle; never recolor the flame separately
from RN accents; min mark 24px; lockup min 140px; use supplied SVGs, never rebuild.
The retired coil may not appear anywhere. The product's verb: **she lights the lamp,
talks the shift down, and watches the record write itself.**

## 1 · Tokens
```ts
night:'#10100F'  bone:'#F3F0E8'  flame:'#FF6846'  apricot:'#FFAD72'
ash:'#AAA69D'    violet:'#7670FF'
ink:      { text: bone, secondary: ash, dim:'rgba(243,240,232,.45)', faint:'rgba(243,240,232,.28)' }
glass:    { fill:'rgba(243,240,232,.055)', hi:'rgba(243,240,232,.09)', bar:'rgba(20,17,14,.55)' }
glow:     { flame:'rgba(255,104,70,.22)', apricot:'rgba(255,173,114,.20)' }
```

## 2 · Atmosphere — the sky (never flat, time-reactive)
Every screen background is a vertical gradient + a low afterglow radial + 5% grain.
Buckets by local hour:
- **Ember (17:00–22:00, default):** #221A14 → #161210 (38%) → #0D0C0B; afterglow
  radial-gradient(ellipse 130% 42% at 50% 112%, apricotGlow, rgba(255,104,70,.07) 46%, transparent 72%).
- **Deep night (22:00–05:00):** #1A1620 → #121016 → #0C0B0E; afterglow shifts violet-warm
  (rgba(255,140,90,.18) blended with rgba(118,112,255,.08)).
- **Dawn (05:00–10:00):** #241C15 → #171310 → #0E0D0B; afterglow apricot at .26.
- **Day (10:00–17:00):** ember stops at 80% saturation, afterglow at .12.
Implementation: expo-linear-gradient + a Skia radial; grain = Skia fractal noise,
opacity .05, overlay blend. Milestone/Wrapped screens may raise the afterglow to .30.

## 3 · Depth — glass, not borders
- **L0** sky. **L1 glass** panel: glass.fill, radius 16, inset top-light 1px glass.hi,
  no border. **L2 bar glass**: glass.bar + blur(18) (expo-blur) for the nav pill,
  sheets, Live Activity — the Liquid Glass nod so it feels native on iOS 26.
- Hairlines: maximum one per screen, ink at 7%. Opaque cards are banned.
- The warm exception: today/milestone rows use linear-gradient(135deg, rgba(255,173,114,.10),
  rgba(255,104,70,.14)) over glass.

## 4 · Flame scarcity (the accent law)
Per screen: **one flame action** (orb, primary button, live send) **+ at most one
warm accent** (a numeral, live chips, today's ring — apricot preferred for data warmth).
Flame may glow (glow.flame) only where something is live or earned: the listening orb,
the primary CTA, a milestone. **Violet is data-only:** night-shift ticks, after-midnight
stats, deep-night sky tint. Violet never becomes a button.
Heat scale (calendar & load): ash 3% → apricot .16 → apricot .34 → flame .55 → flame
solid + glow. Text flips to night (#10100F) on the top two steps.

## 5 · Type (device points)
Fraunces 500/600 (expo-font) ONLY for: greetings, monument numerals, month names,
milestone numerals. SF (system) for everything else.
Home monument numeral 96–110, tabular-nums, tracking −2%, subtle apricot text-glow ·
greeting 30/1.2 · teleprompter (her live speech) **Fraunces 500, 22/1.5** — current
sentence bone, older lines ink.faint · partner caption 16/1.6 SF · body 16/1.5 ·
secondary 14 · caption 12 · whisper 11.5 faint · overline 11 caps ls .16em ·
totals 46 · milestone 104 with halo (0 0 44px rgba(255,173,114,.35)) · buttons 16/600.
Line-height ≥1.45 for anything a tired person reads.

## 6 · Components
- **Nav = floating glass pill.** Bottom-centered, blur(18), radius 30, three unlabeled
  icons (Home, Logbook, Insights; 20px, 1.7 stroke, dim → bone when active) + the
  **flame orb** (46px flame circle, night-colored flame glyph, glow.flame) which opens
  the debrief flow as a modal. No labels, no fifth slot. Profile = 30px avatar chip,
  top-right of Home → sheet.
- **Teleprompter (voice):** her words stream upward, no bubbles, no chat log; last
  sentence bone, history fades. Detected facts ignite beneath as **live chips**
  (apricot text on rgba(255,104,70,.13), 1px warm inner stroke, spring in + haptic).
  Waveform: 3px apricot bars. Controls row: ✕ / **flame orb 58px (mic, breathes while
  listening)** / "Aa" quiet-mode. Whisper below: "Transcribed on your phone. Your
  voice never leaves it."
- **Record assembly:** glass fields (Shift / Win / The weight / Lesson) that fill live
  with a shimmer sweep and a flame caret on the field currently writing; unfilled
  fields sit at 55% opacity with "still listening…". Primary CTA "That's the shift —
  save it". Everything editable on tap.
- **Clock-out taps:** hour chips (usual preselected), load bar of 5 segments with
  haptic weight increasing left→right (selection uses heat scale), tag chips
  (selected = glass + 1px warm inner + apricot text). "Save without talking" always visible.
- **Heatfield calendar:** cells ARE the data (heat scale by load), violet 4px tick
  top-right = night shift, today ringed apricot + soft glow. On open: worked days
  ignite in date order, 90ms stagger, light haptic each. Drag = scrub (readout follows
  finger). One generated month caption with the small flame glyph as speaker mark.
- **Partner voice mark:** the flame glyph at 13–16px opens any line the partner
  "says" on screen (Home presence line, month caption, record intro).
- **Lamp usage:** full lamp (bowl+flame) = Home header 26px, Live Activity, onboarding
  hero; flame-only glyph = orb, speaker marks. Never as loose decoration.
- **Crisis card:** unchanged pattern — dim rgba(10,10,9,.78), glass card, "You matter.",
  flame "Call 988", quiet "Keep talking". Renders above everything, instantly.

## 7 · Motion (Reanimated 4 + Skia; reduced-motion honored everywhere)
Springs only (damping 18, stiffness 180 default); fades are failure. Flame breathes
on a 6s idle loop (scale 1↔1.04 + glow ±15%). Home numeral counts up 900ms on first
focus/day. Calendar replay as above. Day-cell → entry: matched-geometry expansion
(measure the cell, animate an overlay), never a hard cut. Chips/keyboard/sheets spring.
Listening orb: 1.2s pulse ring while STT active.

## 8 · Verification protocol — how "done" is decided
After ANY visual change: (1) simulator screenshots of every touched screen at 21:00
device time; (2) side-by-side with the matching phone in /design/reference.html;
(3) name the three biggest gaps in writing (specific: "numeral 64 not 104," "opaque
card," "flame appears 3×"); (4) fix; repeat once. Two passes max, then ship and log
the rest in DESIGN-DEBT.md. A screen that renders but fails step 2 is not done.

## 9 · The generic tells (automatic fail)
Chat bubbles or a message-list debrief. Opaque flat cards. Labeled tab bars. Borders
as default. Flame used three times on one screen. Dots-next-to-dates calendars.
Coil anywhere. Emoji mood scales. Any screen that could belong to a meditation app.
