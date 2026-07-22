# App Store metadata — draft for approval (Session 5)

## App record
- **Name:** unwindRN — put the shift down
- **Subtitle:** Voice debrief + career logbook for nurses
- **Bundle ID:** com.unwindrn.app · **Version:** 1.0.0 · **Build:** 1
- **Primary category:** Health & Fitness (recommended over Medical: the app makes no
  clinical claims and Medical invites a stricter review lens). **Secondary:** Lifestyle.
- **Age rating:** 17+ (infrequent/mild medical themes; crisis-resource references).

## Description (draft)

Put the shift down.

unwindRN is a post-shift debrief partner and career logbook for nurses. Clock out in
twenty seconds of taps, or talk the shift down with a partner who is fluent in your
specialty — and watch the record write itself: shifts, hours, wins, the weight, the
lessons.

- The Debrief: speak or type. Your voice is transcribed on your phone and never leaves
  it — only the words you approve are kept.
- The Logbook: a heatfield of your months. Every shift you've carried, kept in one
  place that's yours.
- Insights: your real patterns — load, hours over your usual, what keeps showing up.
  Described, never diagnosed.
- No streaks. No guilt. "Save without talking" is always one tap.

unwindRN is not therapy or medical care. If you're in crisis, call or text 988
(Suicide & Crisis Lifeline) — free, 24/7, confidential.

## Keywords
nurse,nursing,shift,debrief,logbook,charge,ICU,ER,night shift,career,RN,decompress

## App Privacy answers (what we actually collect)
- **Contact info:** name (optional, user-provided) — linked to account.
- **User content:** debrief transcripts (text only), shift records — linked, not
  used for tracking, not shared with third parties.
- **Voice/audio:** NOT collected — speech is recognized on-device
  (`requiresOnDeviceRecognition`); only text leaves the phone.
- **Tracking:** none. No ads, no data sale, no third-party analytics SDKs.
- Sign in with Apple is the only login. In-app account deletion wipes everything.

## Review notes (paragraph for App Review)
unwindRN is a journaling/logbook app for nurses. An AI "debrief partner" (Anthropic
Claude, called only from our server) responds conversationally to the user's account
of her workday; it is explicitly not therapy or medical care, gives no clinical
advice, and this is stated in onboarding, in Settings, and in this listing. Speech
recognition runs entirely on-device; audio never leaves the phone. If a user's
message suggests she herself is in crisis, a classifier surfaces a full-screen card
with the 988 Suicide & Crisis Lifeline (call/text) — resources are also always
reachable from Settings and the debrief screen. Account deletion (Settings →
Profile → Delete account) removes all rows and the auth user immediately. Test
account: reviewer may sign in with any Apple ID; no server-side allowlist.

## Screenshot plan (shoot at 21:00 device time, ember sky)
1. Home — monument numeral (caption: "Your whole career, counted.")
2. Debrief listening — teleprompter + live chips ("Talk it down. The record writes itself.")
3. The record, formed ("Win. The weight. The lesson. Yours.")
4. Logbook heatfield ("Every month you carried, at a glance.")
5. Insights ("Your patterns, described — never judged.")
6. Crisis card intentionally NOT screenshotted for the store.

## Submission checklist
- [ ] ANTHROPIC_API_KEY + ELEVENLABS_API_KEY set (debrief + TTS live in prod)
- [ ] Real privacy policy URL in .env before `eas build` (EXPO_PUBLIC vars bake in)
- [ ] Sign in with Apple verified on a physical device
- [ ] Account deletion verified end-to-end (rows + auth user gone)
- [ ] Crisis card fires on a test phrase; 988 links dial correctly
- [ ] No placeholder text anywhere; cold-start crash pass
- [ ] `eas build --platform ios --profile production` → `eas submit`
