# unwindRN Privacy Policy

<!-- Published at https://unwindrn.com/privacy. Attorney review recommended
     before the public (external TestFlight) beta — tracked in the plan. -->

*Effective date: July 22, 2026*

unwindRN ("the app," "we," "us") is a post-shift debrief and career logbook for
nurses, operated by unwindRN LLC (Michigan, USA). This policy explains what we
collect, why, and what we will never do. It is written to be read — no legal
scavenger hunt.

## The short version

- **Your voice never leaves your phone.** Speech is transcribed on-device by
  iOS. We never receive or store audio.
- **Debrief conversations are not stored.** The words you speak in a debrief
  live in your phone's memory during the session and are gone when it ends.
  Only the shift record you approve — win, weight, lesson, hours, tags — is
  saved.
- **We don't want patient information, and we actively strip it.** The app's
  design, prompts, and an automated scrubber all work to keep patient
  identifiers out of your record.
- **No ads, no tracking, no selling data.** Ever.
- **Delete means delete.** In-app account deletion removes your account and
  every record, immediately and permanently.

## What we collect

**Account.** Your email address (or, if you use Sign in with Apple, the
identifier Apple shares). Used to sign you in and nothing else.

**Profile you choose to give us.** First name, specialty, years at the
bedside, shift pattern, usual shift length, and optionally your hospital,
city, and unit role. These personalize your debrief partner and your career
statistics. All optional; skipping onboarding is always allowed.

**Shift records.** What you save when you clock out: date, hours, load, tags
(e.g., "Short-staffed"), and the win / weight / lesson lines you approve.
This is your logbook — it exists so you have a record of your career.

**What we deliberately do NOT collect:** audio recordings, debrief
transcripts, patient information, location data, contacts, photos,
advertising identifiers, or analytics profiles. The app contains no ad SDKs
and no third-party trackers.

## How the AI works with your words

When you talk in a debrief, the on-device transcript text (not audio) is sent
over an encrypted connection to our server, which forwards it to Anthropic
(the AI provider) to generate your debrief partner's reply and to extract the
shift-record fields. Transcript text is processed in memory to produce the
reply and is not stored on our servers. Anthropic processes this data as our
service provider; it is not used to train their models. An automated scrubber
removes structured identifiers (room numbers, bed numbers, record numbers)
from any extracted field before it can be saved.

If voice replies are enabled, the partner's reply text (never yours) is sent
to ElevenLabs, a speech-synthesis provider, to generate the spoken audio.

## Where your data lives

Your account, profile, and shift records are stored with Supabase (hosted on
AWS in the United States), encrypted in transit. Access is enforced
per-account at the database level: your records are readable by your account
only.

## What we will never do

- Sell or rent your data.
- Show you ads or share data with advertisers.
- Ask for or knowingly store patient-identifying information.
- Contact your employer.
- Use your debrief content for anything other than producing your own record.

## Your controls

- **Export** — coming during the beta; your records are yours to take.
- **Deletion** — Profile → Delete account removes your auth account, profile,
  and every shift record immediately. There is no retention window and no
  backup we quietly keep.
- **Skipping** — every question in onboarding and every debrief is optional.
  "Save without another word" stores only what you tapped.

## What this app is not

unwindRN is not therapy, medical care, or a medical device, and it is not a
system of record for patient care. If you are in crisis, call or text 988
(Suicide & Crisis Lifeline, US) — the app surfaces this resource and never
gates it.

## Age

unwindRN is for working professionals and is rated 17+. It is not directed at
children under 13, and we do not knowingly collect their data.

## Changes

If this policy changes materially, we will note it in the app before the
change takes effect. The current version always lives at
https://unwindrn.com/privacy.

## Contact

Questions or requests: support@unwindrn.com
