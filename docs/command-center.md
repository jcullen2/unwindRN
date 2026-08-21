# unwindRN Command Center — the system of record

This file is the single source of truth for where unwindRN stands and what happens
next. Every working session — on the Mac, in the cloud, anywhere — starts by reading
it and ends by updating it. No dates, only gates: each gate has a definition of done
and unblocks the next. CLAUDE.md stays the law for *how* we build; this file is
*what* we're doing and *why*.

> **Merge note (Gate 0):** the Mac's local `command-center/` files
> (SYSTEM_OF_RECORD.md, MASTER_BACKLOG.md, DECISIONS.md, RISKS.md) and the
> uncommitted `docs/` records (TECHNICAL_STATE, BRANCH_DISPOSITION,
> PRODUCTION_REMEDIATION, PRODUCT, BRAND_DIRECTION*) fold INTO this file and this
> repo when the review branch lands. One truth, in git, forever after.

Status date: 2026-08-21 · Owners: **John** (CEO — money, Apple, approvals, brand
taste, nurses, on-camera) · **Claude** (everything buildable — code, deploys behind
approval gates, QA, copy, design drafts, store package, marketing drafts).

---

## 1. Where we are — verified 2026-08-21

**The mission.** A voice-first post-shift debrief partner + career logbook for
nurses. Not a chatbot, not therapy, never the hospital's tool — always hers. B2C
first. Launch iOS + overhauled website + App Store as soon as the gates clear.

### Working and real
- **App** — full iOS build in Expo/RN: Home / Logbook / Insights / Profile, voice
  debrief pipeline (on-device STT → streaming Sonnet partner → parallel Haiku
  utility with crisis card + extraction → ElevenLabs TTS proxy), onboarding with
  the live career grid, wrapped/milestone flows, offline-first shift queue,
  clock-in/out. Simulator-verified end to end. **Never run on a physical iPhone.**
- **Backend** — Supabase `unwindRN-v1` (us-east-1, PG17) ACTIVE_HEALTHY. 5 tables,
  RLS everywhere, 8 migrations applied (repo ↔ live parity by name confirmed).
  6 live edge functions: delete-account v4 · health v5 · debrief-turn v6 (verified
  end-to-end 7/22) · speak v2 · daily-line v2 · month-caption v2. Transcript column
  dropped — verbatim speech is never stored. ANTHROPIC_API_KEY set.
- **Auth** — email OTP live end to end (Resend SMTP, hello@unwindrn.com, 6-digit).
  Sign in with Apple: code path ready, portal + capability configured, never
  device-verified. Anonymous dev bypass ON (dev-only entry).
- **Web** — unwindrn.com live (Netlify, HTTPS, DNS done), waitlist capturing,
  privacy + terms pages up, real app captures, canvas career grid.
- **Apple** — `com.unwindrn.app` registered with SIWA capability; ASC app record
  created (SKU unwindrn-001); EAS project inited. **No build has ever been made.**
- **Company** — LLC exists. Apple Developer account entity type **unverified**
  (individual vs organization — this matters, see §4).

### The Aug 20 hardening set — LOST, then REBUILT (resolved 2026-08-21)
**Resolution:** the set below was never written to any disk — it lived and died
inside the Aug 20 agent's sandbox. The Mac mini's full-home search found no
trace; both machines' clones were clean. It was **rebuilt from the report's
inventory** (spec preserved at docs/reports/2026-08-20-progress-report.md) in
commits `f3bebbd` + `bc15394`, proven by 44 vitest tests + a 61-assertion pgTAP
suite in CI. **Do not search for the original again.** One casualty has no
inventory to rebuild from: the "On the Record" brand draft's seven visual
surfaces — see Gate 2. Original loss description, kept for the record:
- `npm run check` quality gate: ESLint clean, strict tsc, **17 vitest tests**
  (queue durability, PHI scrubbing, safe logging), legal-page parity, iOS
  production export (~5.4 MB bundle) + a GitHub Actions workflow.
- Offline queue rebuilt: client UUIDs + upserts (kills duplicate-row race),
  per-account partitioning, quarantine of corrupt storage, visible
  waiting-to-sync state with manual retry, honest save-failure surfacing.
- **Unified OTP door** — kills the account-enumeration leak (a 7/24 submission
  blocker). Local-scope logout; atomic account deletion via auth-user + cascades.
- Expanded deterministic PHI scrubber (names, room/bed/MRN, contacts, DOB, SSN,
  long numerics) with a review-and-re-save flow; edge functions log only safe
  error kinds — never bodies, transcripts, or stacks.
- **Two staged Supabase migrations + 58 pgTAP assertions** (never executed — no
  Docker on the Mac) and a production remediation plan with rollback.
- Corrected legal source + deterministic HTML generation; corrected site factual
  copy (unpublished). Command-center + product-law + brand docs.

One laptop incident loses all of it. Nothing merges, tests, or deploys until it's
pushed. **This is Gate 0.**

### Live security findings — re-verified against production today
- `bump_usage` and `rls_auto_enable` are SECURITY DEFINER and callable by `anon` +
  `authenticated` (4 advisor WARNs). The staged migration replaces/revokes them.
- Anonymous-access policies flagged on all 5 tables (5 WARNs) — consequence of
  anonymous sign-ins being ON for the dev bypass. Disable at launch (§4).
- `usage_counters`: RLS on, no policies (INFO — intentional deny-all;
  service-role-only writes).
- Leaked-password protection off (moot for passwordless; enable anyway — free).
- From the 8/20 report, not MCP-verifiable from here: Site URL still localhost,
  empty redirect allowlist, captcha off, duplicate Anthropic secret names,
  **no ELEVENLABS_API_KEY** (TTS silently text-only), **Free-plan auto-pause
  risk** (would take the whole app down mid-beta).
- Known-accepted: 16 transitive npm-audit findings (force-fix would break Expo —
  revisit at next SDK upgrade); low-severity self prompt-injection via profile
  fields; `speak` GET query param (partner text, not PHI).

### Brand fork
**Deep Ward** (petrol/amber, Bricolage, caged lantern) is implemented and live.
**The Kept Light** was rejected — final. **On the Record** (nurse-owned ledger,
shift index, evidence labels) is a draft on the Mac: unapproved, zero code.
The brand decision gates the website overhaul and store assets — see Gate 2.

---

## 2. The operating system
1. **The repo is the system of record.** This file + CLAUDE.md (§State) +
   DESIGN-DEBT.md + IDEAS.md. No parallel truth anywhere else.
2. **Session protocol.** Read this file first; update §5–§7 before ending. Small
   conventional commits. UI isn't done until DESIGN.md §8 passes on-device.
3. **Hot actions need a go.** Prod migrations, function deploys, auth config, DNS,
   site publishes, store submission: proposed → John approves → executed →
   evidence logged in §7.
3a. **One branch.** `main` is the only long-lived branch — everything alive
   converges there. Historical snapshots live under the `archive/*` prefix and
   are never merged or built on. Working branches (`claude/*`, `review/*`) are
   ephemeral: merged via PR, then deleted. If the branch list ever holds more
   than main + archives + one active working branch, something is wrong.
4. **No new build work until Gate 0 merges.** Nothing gets re-implemented that the
   Mac set already contains. Don't overcode: smallest change that clears the gate.
5. **Lanes run in parallel when independent** (brand review ∥ backend proof ∥
   content bank), but nothing ships around a gate.

---

## 3. The path — gates, not dates

### Gate 0 — Reunify the work  `✔ CLOSED 2026-08-21`
Resolved differently than planned: the Mac's push surfaced an EMPTY branch,
proving the Aug 20 set was lost — so the set was rebuilt in the cloud instead
(see §1 and the 2026-08-21 evidence entries).
- [x] Branches distilled to main + archives (mini deleted the three stale ones).
- [x] Hardening set rebuilt with tests (commits `f3bebbd` + `bc15394` + `7bd13eb`).
- [x] **PR #5 merged to main with both CI jobs green** (app checks + the
      61-assertion database proof).
- [ ] Desktop, whenever convenient: delete the now-empty
      `review/aug20-hardening` branch (its content equals old main; nothing
      is lost by deleting it).

### Gate 1 — Prove and harden the backend  `✔ TECHNICAL BODY DONE 2026-08-21 (John's clicks remain)`
Executed on John's "start gate 1", in safety order, all against production:
- [x] pgTAP suite green in CI (61 assertions; caught the missing-grants gap).
- [x] Logical backup BEFORE mutation — full export of every table + 13 auth
      identities, delivered to John as a file (his durable copy).
- [x] Pre-flight: zero existing rows violate any new constraint.
- [x] Expansion migration applied + verified in SQL: 7/7 constraints live,
      consume_usage service-role-only, anon table grants = 0, debrief
      ownership-on-update enforced.
- [x] All 5 reviewed functions deployed (nested `_shared` layout proven):
      **debrief-turn v7 · delete-account v5 · speak v3 · daily-line v3 ·
      month-caption v3**. Bonus finding: live v6 predated the 7/24 injection
      fixes (asData + server-side tag validation) — v7 finally ships them.
- [x] End-to-end smoke on a throwaway anonymous account via a temporary
      pg_net rig (container egress is proxy-blocked; requests ran from inside
      Supabase, rig dropped after): daily-line 200 with a real haiku line +
      service-role cache write; speak 503 (correct — no ElevenLabs key, D3);
      month-caption 200; **debrief-turn full SSE turn** — deltas + utility
      {crisis:false, tags [Code, Good save], hours 12, win/weight extracted,
      "room 12" absent from every persisted field} + done; usage counters
      genuinely ticking (not fail-open).
- [x] **delete-account re-verified end to end** (the Apple requirement):
      {"deleted":true}, zero rows left in auth.users/profiles/shifts/
      counters/cache.
- [x] Cleanup migration applied: bump_usage dropped, client cache-write
      policies retired.
- [x] Advisor re-scan: **all 4 exposed-SECURITY-DEFINER WARNs GONE.**
      Remaining, accepted: 5 anon-policy WARNs (dev bypass stays ON until the
      launch config flip), leaked-password toggle (John's click below),
      usage_counters INFO (deliberate deny-all).
- [ ] **John (dashboard clicks):** Auth → URL Configuration: Site URL →
      https://unwindrn.com, add `unwindrn://**` to redirect allowlist ·
      Auth → Providers/Security: enable leaked-password protection ·
      Settings → check for duplicate ANTHROPIC secret names and delete extras.
- [ ] **John:** upgrade Supabase to Pro before beta (kills auto-pause; adds
      real automated backups).
- **Done when:** the two John-click items above are done. Everything else is.

### Gate 2 — Decide the brand  `✔ CLOSED 2026-08-21`
**John decided: Deep Ward is the ship brand** ("we keep deepward"). On the
Record's surviving written ideas (evidence labels, sequential shift index)
are filed in IDEAS.md as graft candidates onto Deep Ward — considered per
feature, never as a re-skin. The website overhaul (Gate 6) and store assets
now build on Deep Ward with no blocking design decision ahead of them.

### Gate 3 — Device truth  `← READY TO RUN (needs the Mac + John's iPhone)`
- [x] **QA script written: docs/device-qa.md** — 17 items with expected
      results, including the car test, the dead-zone save, scrub-and-reapprove,
      the crisis card, and the first-ever real-device Sign in with Apple. The
      build paste for the mini's Claude is at the top of that file.
- [ ] **John:** plug the iPhone into the mini, paste section A to its Claude,
      then walk section B with the phone (about an hour).
- [ ] Fill the results table, push it; cloud Claude triages FAILs into fixes.
- **Done when:** every line PASS on-device, results committed.

### Gate 4 — Private beta
- [ ] TestFlight internal: John + Maria. Then external: 10–25 nurses (Maria's
      private circle + waitlist top — **not** through her hospital).
- [ ] Minimal first-party measurement (approval needed — see §6 D4): one events
      table (app_open, shift_saved, debrief_started/completed), no third-party
      SDKs ever — the privacy label is a promise. Without this we launch blind.
- [ ] Weekly synthesis of feedback + metrics into §7.
- **Done when:** ≥10 nurses, ≥2 weeks of use, W2 logging retention measured,
  top-5 fix list shipped, real latency + cost-per-debrief numbers logged.

### Gate 5 — Submission package
- [ ] **John:** screenshot Apple Developer → Membership (entity type). If
      Individual → decision D2 (§6).
- [ ] Reviewer access: fixed-OTP auth hook for a designated reviewer email
      (recommended) or accept the "use Continue with Apple" note risk.
- [ ] Icon/splash full-res re-export; store screenshots (shot at 21:00); metadata
      final (draft exists at docs/store-metadata.md); privacy labels reconciled
      against deployed behavior; age rating.
- [ ] Legal live: corrected privacy/terms published with real LLC name, state,
      contact (John confirms details).
- [ ] Launch config flip: disable anonymous sign-ins · confirm usage caps ·
      Resend rate limit raised · Pro plan confirmed.
- [ ] `eas build --platform ios --profile production` → `eas submit` → review
      notes in.
- **Done when:** submitted. One rejection cycle is normal, not failure — answer
  within hours and resubmit.

### Gate 6 — Website overhaul + launch  `← OVERHAUL BUILT, DEPLOY QUEUED`
- [x] Overhaul built on Deep Ward (2026-08-21), keeping everything that worked
      (real captures, career-grid canvas, waitlist): NEW trust band ("Built to
      be on your side" — on-device voice / no employer version / delete means
      delete, each stated plainly), NEW founder band ("Built at a kitchen
      table in Detroit" — fiancée unnamed until John+she decide), precise
      debrief copy, a marked LAUNCH FLIP point for the App Store badge.
      Rendered and eyeballed headless; screenshots sent to John.
- [ ] **DEPLOY** — from the desktop (this cloud session's egress can't reach
      Netlify): paste to the mini's Claude: *"Pull latest main. Deploy web/ to
      Netlify per the CLAUDE.md runbook — zip the web/ contents plus a
      netlify.toml that keeps the repo's redirect rules but sets publish='.',
      request the deploy command via the Netlify MCP for a fresh proxy token,
      POST the zip. Then verify unwindrn.com shows the 'Built to be on your
      side' and founder sections, and that a bogus URL serves the 404 page."*
- [ ] Content bank BEFORE launch: 20–30 short-form pieces (scripts + cuts),
      r/nursing post drafts, nurse-creator outreach list. John/Maria decide the
      on-camera face early — the couple-founder story is the differentiated one.
- [ ] Launch day: waitlist email via Resend, site flips waitlist → App Store
      badge, socials go.
- **Done when:** site live on brand with store link; ≥20 content pieces banked;
  waitlist notified.

### Parked on purpose (post-launch lane)
Wrapped ships at Nurses Week (data already accruing) · record export (pairs with
license renewal) · monetization experiments (never paywall the logbook) · real
pay data (BLS) before Career Signals drops the ~ · Live Activity native target ·
voice-answered onboarding · unwind* horizontal (ED/911/FD) — parked until
unwindRN proves retention · **pitch deck — parked until beta data exists; raise
on evidence, not slides.**

---

## 4. John's lane — money, accounts, meatspace
- [ ] Push the Mac branch (Gate 0 — the single most important hour).
- [ ] Apple Membership entity screenshot (Gate 5 hinges on it; if Individual,
      converting to org takes a D-U-N-S number and real elapsed time).
- [ ] Supabase Pro upgrade (before beta).
- [ ] ElevenLabs account + key IF voice-on at beta (see D3).
- [ ] Resend rate limit raise before beta invites.
- [ ] Confirm LLC details for legal docs: exact legal name, state, contact email.
- [ ] Credentials custody: Apple ID, Supabase, GitHub, Netlify, Resend, domain
      registrar — 2FA on, recovery codes stored somewhere safe. Bus factor of one.
- [ ] Later, at monetization: business bank account wired to ASC paid agreements;
      startup-lawyer hour on liability posture. EU trader status only if/when we
      leave the US storefront (launch US-only).

## 5. Now / Next
**Now — all three lanes are John-side actions:**
1. **Gate 3 run:** iPhone into the mini → paste docs/device-qa.md §A → walk
   §B (~an hour). This is the critical path to beta.
2. **Gate 6 deploy:** one paste to the mini's Claude (in the Gate 6 section)
   puts the overhauled site live.
3. **Desk items:** Gate 1 dashboard clicks + Supabase Pro · Apple Membership
   screenshot (D2) · decisions D1/D3/D4.
**Next (cloud):** triage Gate 3 FAILs into fixes · content bank drafts
(scripts for 20–30 short-form pieces) · store metadata/screenshot prep.

## 6. Decisions
| # | Decision | Status | Call |
|---|----------|--------|------|
| D1 | Beta before store submission | **Recommended, awaiting John** | Beta-first: 10–25 nurses, then submit |
| D2 | Apple entity path if account is Individual | Open — blocked on Membership screenshot | Reposition as journaling/lifestyle (already the metadata stance) vs convert to org |
| D3 | Voice-out at beta (ElevenLabs key + cost) | **Recommended ON, awaiting John** | It's the soul of the product; caps bound the spend |
| D4 | Minimal first-party events table (no 3rd-party SDKs) | **Recommended, awaiting John** | Without it, no retention read at the go/no-go |
| D5 | Ship-now brand | **DECIDED — Deep Ward** (John, 2026-08-21) | OTR's written ideas filed in IDEAS.md as grafts |
| — | The Kept Light | **Rejected (final)** — 2026-08-20 | Never propagate |
| — | B2C first, no hospital sales at launch | **Decided** — John | Trust architecture over check size |
| — | Legacy carve: react-query + date-fns stay | **Decided** — whitelist formally | Load-bearing since v1; ripping out is overcoding |

## 7. Evidence log (newest first)
- **2026-08-21 (security sweep + dependency fixes)** — Post-deploy health:
  production function logs show exactly the five smoke calls, zero errors, no
  stray traffic. Full-repo secret sweep clean (no .env tracked, no keys, no
  JWTs). Performance advisor clean (one INFO: an as-yet-unused index, kept
  for scale). Non-breaking `npm audit fix`: 20 → 15 findings, every remaining
  one a build-tool DoS advisory (brace-expansion / image-size / js-yaml /
  nanoid in the Metro–Expo chain) — runs on the build machine, never in the
  shipped app; accepted until the next SDK upgrade (PR #10, CI green).
  Device-QA script gained the phone-side gotchas (Trust, Developer Mode,
  untrusted-developer, first-build time — PR #9). Awaiting John: the four
  dashboard clicks + Pro upgrade (guide delivered in chat); on "clicks done"
  the advisor re-scan verifies the leaked-password toggle from here.
- **2026-08-21 (Gates 3+6 prepared)** — docs/device-qa.md written (17-item
  physical-iPhone script + the mini's build paste). Site overhaul built on
  Deep Ward: trust band + founder band + precise debrief copy + launch-flip
  marker; HTML validated, rendered headless, sections screenshot-verified,
  full check gate green. Deploy queued for the desktop (cloud egress can't
  reach Netlify).
- **2026-08-21 (Gate 1 executed + Gate 2 decided)** — On John's "start gate 1"
  + "we keep deepward": backup exported (all tables + 13 auth users, file
  delivered to John) → pre-flight clean (0 constraint violations in 13
  shifts/8 profiles) → expansion migration applied + SQL-verified → 5
  functions deployed as **debrief-turn v7 · delete-account v5 · speak v3 ·
  daily-line v3 · month-caption v3** (nested _shared layout; v7 also finally
  ships the 7/24 injection fixes that live v6 never got) → end-to-end smoke
  via temporary pg_net rig on a throwaway anon account (daily-line real line
  200; speak 503-correct; debrief-turn full SSE with clean extraction, no
  "room 12" persisted; counters genuinely ticking) → **deletion re-verified:
  {"deleted":true}, zero rows anywhere** → pg_net rig dropped → cleanup
  migration applied (bump_usage gone, cache-write policies retired) →
  advisor re-scan: 4 SECURITY DEFINER WARNs eliminated; remaining = 5
  anon-policy WARNs (dev bypass, launch flip), leaked-password toggle
  (John click), usage_counters INFO (deliberate). D5 DECIDED: Deep Ward.
- **2026-08-21 (Gate 0 closed)** — PR #5 merged to main (`ca12d43`) with both
  CI jobs green: app checks (lint 0-warnings, strict tsc, 44 vitest) and the
  database proof (61 pgTAP assertions on the fully migrated local stack). CI
  round 1 caught a real defect — a fresh stack grants `authenticated` nothing
  (hosted works only via Supabase's out-of-band defaults) — fixed by stating
  the grant surface explicitly in the expansion migration (`7bd13eb`). Repo
  now: main + 2 archives + the session's working branch (synced to main) +
  the empty `review/aug20-hardening` (desktop deletes when convenient).
- **2026-08-21 (rebuild)** — Established the Aug 20 set was LOST (empty
  review/aug20-hardening; mini's clean clone + full-home search negative; the
  set only ever existed in the Aug 20 agent's sandbox). Rebuilt it in the
  cloud from the report's inventory: offline queue (client-UUID upserts =
  idempotent retries, per-account partitions, quarantine, honest failures,
  Home waiting-to-sync + Retry), unified OTP door (enumeration oracle gone),
  PHI scrubber client+edge twins with parity tests + re-approve flow,
  content-free edge logging, service-role consume_usage (caps in SQL),
  atomic delete-account, dead Realtime removed (publication verified empty),
  **44 vitest tests**, lint+strict-tsc clean, `npm run check`, staged
  expansion+cleanup migrations (NOT applied — Gate 1), **61-assertion pgTAP
  suite**, CI workflow (app + db jobs; local Docker pulls are proxy-blocked,
  CI carries the db proof), legal markdown→HTML generation with drift check +
  corrected absolute claims, site export/Android copy fixed. Casualty with no
  inventory: On the Record's seven visual surfaces (Gate 2 adjusted).
- **2026-08-21 (later)** — Branch distillation to main (PR #3 merged). Inspected
  all remotes: `cursor/marketing-site-cycle-2-6fc1` (4 commits off 9fd7dce)
  confirmed do-not-merge with own eyes — deletes web/screens/*.jpg, rewrites
  legal HTML into a second master, hero claims no app exists; salvaged its three
  design-independent goods (web/404.html, netlify.toml redirects+404 routing,
  robots.txt /screens/ disallow). Archives secured as branches via API —
  `archive/marketing-site-cycle` (40a0510) + `archive/app-from-scratch`
  (9e6920e, disjoint pre-rebuild snapshot) — because cloud-session git can push
  only its own claude/* branch (403 on tags and deletions). Deletion of the
  three stale originals (`cursor/marketing-site-cycle-2-6fc1`,
  `claude/app-from-scratch-jgngvv`, `claude/new-session-hbi505` — last one
  fully merged via PR #1) is queued for the desktop. Mac hardening set STILL
  not pushed (no review/aug20-hardening on origin).
- **2026-08-21** — Cloud session verified live prod: project ACTIVE_HEALTHY; 6
  functions (delete-account v4, debrief-turn v6, ...); 8 migrations, repo parity by
  name; security advisors: 4 WARNs on exposed SECURITY DEFINER fns, 5 anon-policy
  WARNs, leaked-password off, usage_counters INFO. Confirms the 8/20 report.
  Command center established (this file).
- **2026-08-20** — Mac session: local hardening set prepared (17 tests, queue
  rebuild, unified OTP, scrubber, 2 staged migrations, 58 pgTAP assertions),
  uncommitted at 9fd7dce. Kept Light rejected. No production mutation.
- **2026-08-08** — Deadpan copy pass shipped app-wide; site redesigned with live
  career grid; demo persona updated. (See CLAUDE.md §State.)

## 8. The go/no-go (end of year, defined now, judged later)
The dashboard, not a feeling: organic installs · W4 tap-log retention (THE metric)
· debrief completion rate · unsolicited love (screenshots, DMs, reviews) ·
cost-per-weekly-active. Thresholds get set when beta data exists — committing to
the instrument now, not to invented numbers.
