# Progress report — 2026-08-20 (Mac session)

> Provenance: delivered to John as a .docx on 2026-08-20 by the Mac working
> session; text extracted verbatim 2026-08-21. **The change set this report
> describes was never committed and died with its sandbox** — the mini's
> full-disk search on 2026-08-21 found no trace. It was REBUILT from this
> inventory in commits f3bebbd + bc15394. This file is the spec of record
> for that rebuild; do not search for the original again.

unwindRN production-readiness work
Verified progress, prepared changes, blockers, and the next proof gates
To: Founder
From: Product, engineering, design, QA, security, and technical operations workstream
Date: August 20, 2026
Status: Local change set prepared; production and public website design unchanged

BOTTOM LINE  The repository is now materially safer and testable locally. No production service, public deployment, DNS, billing plan, release channel, or remote GitHub branch was changed. The remaining critical path is proof: execute the database suite, renew live Supabase evidence, then seek approval for staged production remediation.
Executive summary
Today established a canonical repository and a passing application-quality baseline, repaired several correctness and privacy defects, prepared a staged Supabase hardening package, reconciled product and legal sources of truth, and documented branch disposition. The core app now handles queued records and local-save failure more honestly, while patient-identifier scrubbing and privacy-safe logging have automated coverage.
The work remains a local, uncommitted review set on main at commit 9fd7dce. Production evidence is not yet fresh enough to authorize changes, and the 58-assertion database suite has not executed because this machine has no Docker or Podman. The first proposed brand direction, The Kept Light, was rejected and never propagated. A less sentimental, record-led replacement direction has been drafted but is not approved.
Status at a glance
Area
State
Evidence
Canonical repository
Proven locally
main at 9fd7dce; archive and marketing branch disposition recorded
Application quality gate
Passing
Lint, strict TypeScript, 17 tests, legal parity, and iOS production export
Database security
Prepared
Two staged migrations and 58 pgTAP assertions; suite not yet executed
Live Supabase
Historical baseline only
Latest authenticated evidence is 2026-08-20; renewed read-only access was blocked
Brand
Decision reopened
The Kept Light rejected; no visual propagation; replacement direction remains unapproved
Production/public systems
Unchanged
No deploy, DNS, billing, release, secret, or public-site replacement

1. Repository and source of truth
•  Confirmed the canonical clone, origin remote, default branch main, and inspected base commit 9fd7dce3756cb216e630df15c5d94cb9bf093326.
•  Verified the historical archive branch as an exact preserved snapshot with no merge base to current main; it remains history only.
•  Dispositioned the four-commit marketing/legal branch as do not merge because it removed real screenshots, conflated product states, and created a second legal master.
•  Added repository-local product law, branch disposition, technical state, production remediation, and brand-decision records.
•  Marked stale design and debt documents as historical so they cannot silently override current evidence.
2. Automated quality baseline
A single npm run check command now exercises the required application gate:
•  Expo/ESLint with React Compiler rules: passing with no warnings.
•  Strict TypeScript check: passing.
•  Vitest: 17 passing assertions across queue durability, patient-identifier scrubbing, and privacy-safe logging.
•  Generated legal-page parity check: passing.
•  Expo iOS production export: passing; current JavaScript bundle is approximately 5.4 MB.
•  GitHub Actions workflow added for application checks and a local Supabase database job.
DEPENDENCY NOTE  npm audit still reports 16 transitive Expo/Metro build-tool findings: 8 moderate and 8 high. The available force fix would downgrade Expo incompatibly, so it was not applied.
3. Core reliability and account isolation
•  Rebuilt the offline shift queue around stable client UUIDs and database upserts, preventing duplicate rows when the server commits but the response is lost.
•  Partitioned queue storage by authenticated account and added safe migration from the legacy global queue.
•  Quarantines malformed private local storage instead of silently overwriting it; account deletion removes both active and quarantined queue data.
•  Home now shows records saved on the phone, waiting to sync, with a manual retry action.
•  Tap-only and full-record save paths now surface true local-storage failure instead of hanging or implying success.
•  Removed the unused Supabase Realtime subscription; the app now relies on queue completion and normal query refetches rather than an empty live publication.
•  Changed logout to local scope and made account deletion atomic by deleting the auth user once and relying on database cascades.
4. Authentication, privacy, and patient information
•  Replaced split create-account/log-in email doors with a unified OTP path so the UI no longer discloses whether an email owns a private record.
•  Kept Apple ID-token sign-in and the development-only anonymous bypass; production anonymous auth remains a live configuration blocker.
•  Added deterministic scrubbing for common explicit patient names, room/bed/MRN forms, contact details, DOB, SSN, and long numeric identifiers.
•  When scrubbing changes a saveable phrase, the nurse must review the edited fields and tap Save again; the original wording is not persisted.
•  Edge Function errors now log only a safe error kind and numeric status, never provider bodies, messages, stacks, transcripts, or reflection text.
•  Raw debrief transcripts remain in memory only and are absent from the current database type surface; audio requires on-device speech recognition.
LIMIT  The scrubber is a backstop, not proof that every possible name or re-identifying narrative will be removed. Expanded adversarial evaluations and deployed-log evidence remain mandatory.
5. Supabase remediation prepared - not applied
The local remediation was split into two database phases so existing Edge Functions remain compatible throughout deployment:
Expansion migration: add integrity constraints, strengthen debrief ownership checks, make grants reproducible, revoke exposed rls_auto_enable execution, and introduce a service-role-only fixed-cap consume_usage function with an empty search path.
Deploy reviewed Edge Functions: daily-line, debrief-turn, month-caption, speak, and delete-account use the fixed meter, scoped cache writes, bounded inputs, and redacted logging.
Cleanup migration: remove legacy bump_usage and direct client writes to AI-generated cache tables after function smoke tests pass.
A 58-assertion pgTAP suite covers table policy sets, CRUD isolation, ownership reassignment, cross-user shift/debrief inference, anonymous behavior, privileged-function grants, and data constraints.
The production proposal includes exact change ordering, risk analysis, validation criteria, and compensating rollback. It explicitly requires a logical backup and fresh redacted live evidence before any schema mutation.
6. Legal, website, and public claims
•  Made Markdown privacy and terms documents authoritative and generated their public HTML deterministically.
•  Corrected absolute transcript-disappearance, backup, deletion, and provider-retention language in the local legal source.
•  Corrected local website copy about transcript processing, unavailable export, and the absence of an announced Android release.
•  The website's visual design intentionally remains the same. Only factual copy changed locally; nothing was published.
•  Counsel review, App Store privacy-label reconciliation, and deployed behavior proof remain required before publication.
7. Brand and product design
•  Produced a seven-surface representative direction named The Kept Light without changing the implemented app or public site.
•  Founder rejected The Kept Light. The rejection is recorded as final for that direction, and no element was propagated.
•  Drafted a replacement direction, On the Record, centered on the nurse-owned shift ledger, sequential shift index, explicit evidence labels, and a smaller secondary Nightingale heritage role.
•  On the Record is not approved, has not been applied to product code, and still needs representative visual review before any propagation.
8. Production and external systems
No external production mutation occurred today. Specifically, there was no:
•  Supabase migration, function deployment, auth/configuration change, secret change, or data deletion.
•  DNS, Netlify/public website, billing, or plan change.
•  GitHub push, pull request, branch deletion, or remote merge.
•  App Store, TestFlight, external beta, user invitation, or launch activity.
9. Current blockers and residual risks
•  The in-app browser's admin-enforced security policy blocked renewed read-only access to the live Supabase dashboard; the earlier 2026-08-20 authenticated baseline remains the latest live evidence.
•  Docker and Podman are unavailable, so the pgTAP suite cannot run locally. GitHub Actions can provide the required runtime after permission to push a review branch.
•  Live migration and deployed Edge Function source parity remain unverified.
•  Production still has known historical blockers: anonymous authentication, localhost Site URL, empty redirect allow list, disabled captcha/password protections, security-advisor warnings, redundant Anthropic secret names, no ElevenLabs secret, and Free-plan auto-pause risk.
•  Physical-device OTP, Apple sign-in, session expiry, account switching, voice, cancellation, offline lifecycle, and full deletion are not proven end to end.
•  Waitlist delivery, App Store state, TestFlight ownership, backup/restore, and public deployment ownership still require access or exports.
10. Optimized path forward
Gate
Next proof
External need
1
Complete automated database proof
Docker-capable CI or permission to push a review branch
2
Renew live Supabase read-only baseline
Working dashboard access or equivalent redacted export
3
Reconcile test results with staged remediation
No production mutation
4
Present validated production approval package
Founder approval for each live gate
5
Approve a replacement brand direction
Founder design decision after representative applications
6
Propagate brand and complete device QA
Physical iPhone, Apple/TestFlight, and deployment access
FOCUS  Do not broaden into schedule assistance, new AI features, launch activity, or a public redesign until the database proof and renewed live baseline are complete. Brand review can continue in isolation because it does not require production mutation.
Decisions and access needed
•  Permission to push a review branch so GitHub Actions can execute the database suite and preserve the local change set remotely.
•  A working read-only Supabase dashboard path or equivalent redacted export for fresh configuration and deployed-source evidence.
•  Later: physical iPhone and Apple/TestFlight access for release-gate testing.
•  Brand: review a replacement representative direction only after the visual applications are ready; The Kept Light remains rejected.
Primary working records
Command Center: command-center/SYSTEM_OF_RECORD.md, MASTER_BACKLOG.md, DECISIONS.md, and RISKS.md
Repository state: unwindRN/docs/TECHNICAL_STATE.md
Branch disposition: unwindRN/docs/BRANCH_DISPOSITION.md
Production remediation: unwindRN/docs/PRODUCTION_REMEDIATION.md
Product law: unwindRN/docs/PRODUCT.md
Rejected brand history: unwindRN/docs/BRAND_DIRECTION.md
Replacement brand draft: unwindRN/docs/BRAND_DIRECTION_ON_THE_RECORD.md
