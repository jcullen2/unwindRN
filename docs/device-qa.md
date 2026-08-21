# Device QA — Gate 3 script

The app has lived its whole life in a simulator. This script is the first
physical-iPhone run: the Mac mini's Claude builds, John walks the phone
checklist. Mark every item PASS / FAIL with a note, commit this file, and the
cloud session picks up the fix list. Gate 3 closes when every item passes.

---

## A · Build onto the iPhone (Mac mini does this)

Plug the iPhone into the mini with a cable, unlock it, tap "Trust" if asked.
Then paste into the mini's Claude Code (in `~/Desktop/unwindRN/app`):

> Pull the latest main and run `npm install`. Then get the app running on my
> physical iPhone over USB: `npx expo run:ios --device`, signing with my
> Apple ID team in Xcode (register the device if it asks). Remember this
> repo's landmines: start Metro with plain `nohup npx expo start` (never
> CI=1), build against the default DerivedData, and CocoaPods needs
> `PATH+=~/.gem/ruby/2.6.0/bin`. Don't push or deploy anything.

Keep Metro's terminal visible during the whole checklist — items 7 and 13
read from it.

## B · The checklist (John, phone in hand)

Each item: **Do** → **Expect**. Anything else = FAIL + a one-line note.

### Sign-in and onboarding
1. **Cold start.** Open the app fresh. → Sign-in screen: ONE "Continue with
   email" button, the Apple button, and (dev build only) the quiet Dev
   bypass link. No create-account/log-in split anywhere.
2. **Email code, real inbox.** Use your real email. → Code arrives from
   hello@unwindrn.com within a minute; typing a WRONG code keeps your digits
   in the field with an inline message; resend shows a cooldown counter.
3. **Sign in with Apple.** Sign out, come back, use the Apple button. →
   Face ID sheet → straight into the app. (First time this has ever run on
   a real device — the single most important tap in this list.)
4. **Onboarding.** Fresh account (dev bypass is fine): answer the beats. →
   The career grid draws and the count-up lands; "Light it" proceeds.

### The debrief — where the product lives
5. **Mic priming.** Start a debrief, tap talk. → OUR card explains "your
   voice stays on this phone" BEFORE any iOS dialog. Deny → quiet mode +
   a Settings pointer, no nagging. Re-try and grant → listening starts.
6. **THE CAR TEST.** Sit in the car, engine running, radio low. Debrief a
   fake shift out loud. → The teleprompter keeps up over road noise; your
   turn ends about 1.2s after you stop; the partner's reply reads like a
   colleague, 1–3 sentences.
7. **Latency.** While talking, the Mac's Metro console prints
   `[debrief] first-token …ms · P50 … · P90 …`. → P50 under ~1500ms.
   (Mini's Claude: record the numbers here.)
8. **Live chips + scrubbing in flight.** Say: "Twelve hours, we coded the
   kid in room 12 twice and he made it." → Chips ignite with the extracted
   text; NOTHING shown or saved contains "room 12".
9. **Scrub-and-reapprove.** In the record screen, type
   `patient Ramirez coded twice` into Win and hit Save. → The text becomes
   "the patient coded twice", an amber notice asks you to check it and save
   again; second Save goes through.

### The record's durability
10. **Dead-zone save.** Airplane mode ON → log a shift by taps. → It saves
    without complaint; Home shows "1 shift saved on this phone, waiting to
    sync." with Retry. Airplane OFF → reopen or tap Retry → the row clears,
    the shift is in the Logbook, and it appears EXACTLY ONCE.
11. **No phantom duplicates.** Log two similar shifts back to back the
    normal way. → Two entries, not three; totals move by exactly two.

### Safety and endings
12. **Crisis card.** In a debrief, type: "I don't want to be here anymore."
    → The card dims everything: "You matter.", Call 988 opens the dialer,
    "Keep talking" returns to the session. Nothing gates it.
13. **Voice out.** Partner replies are captions-only right now (no
    ElevenLabs key — decision D3). → No error, no spinner, no complaint;
    just text. Metro shows no red.
14. **Reminder toggle.** Profile → Reminder ON. → iOS permission asks once;
    deny flips it back off quietly.
15. **Deletion, end to end.** On a throwaway (dev bypass) account with one
    logged shift: Profile → Delete account → type DELETE. → Lands back at
    sign-in; a fresh dev-bypass account shows a completely empty app.

### Look and stability
16. **DESIGN.md §8 pass.** Bricolage renders everywhere (no system-font
    flashes), the caged lantern draws at every size, amber afterglow +
    grain on the sky, nav pill blurs, wrapped slides auto-advance, and
    with iOS Reduce Motion ON the app stays calm.
17. **Cold-start crash pass.** Force-quit and reopen three times, once in
    airplane mode. → Clean start every time.

## C · Results

| # | PASS/FAIL | Note |
|---|-----------|------|
| 1–17 | _fill in during the run_ | |

When the table is filled: commit this file ("docs: device QA run 1 results")
and push, then tell the cloud session — it triages FAILs into fixes.
