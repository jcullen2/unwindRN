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

### Gate 0 — Reunify the work  `← CLOSING`
Resolved differently than planned: the Mac's push surfaced an EMPTY branch,
proving the Aug 20 set was lost — so the set was rebuilt in the cloud instead
(see §1 and the 2026-08-21 evidence entry). Remaining to close this gate:
- [x] Branches distilled to main + archives (mini deleted the three stale ones).
- [x] Hardening set rebuilt with tests (commits `f3bebbd` + `bc15394`).
- [ ] **Claude:** PR to main with CI green (app + db jobs), then merge.
- [ ] Desktop, whenever convenient: delete the now-empty
      `review/aug20-hardening` branch.
- **Done when:** main holds the rebuilt set with checks green in CI.

### Gate 1 — Prove and harden the backend
- [ ] Execute the 58-assertion pgTAP suite in GitHub Actions (Docker lives there).
- [ ] Logical backup of prod DB before any mutation.
- [ ] Apply expansion migration → deploy the 5 reviewed functions → smoke-test →
      cleanup migration. Each step behind a John go.
- [ ] Re-verify delete-account end to end with a throwaway user (Apple requires it).
- [ ] Auth config pass (dashboard — click-by-click guide provided): Site URL →
      https://unwindrn.com, redirect allowlist, leaked-password ON, rate limits.
- [ ] Secrets: dedupe Anthropic keys; no keys in client (re-confirm).
- [ ] **John:** upgrade Supabase to Pro before beta (kills auto-pause; adds backups).
- **Done when:** pgTAP green, advisors clean or accepted, functions redeployed and
  smoke-tested, deletion proven, backup exists.

### Gate 2 — Decide the brand (one sitting, runs parallel to Gate 1)
⚠️ 2026-08-21: On the Record's seven draft surfaces were LOST with the Aug 20
sandbox — only its written concept survives (record-led, shift index, evidence
labels, smaller Nightingale role). The decision is now:
- [ ] **John:** either (a) recommit to Deep Ward as the ship brand — fastest,
      it's built and already passed your taste once — grafting On the Record's
      best written ideas onto it, or (b) ask Claude to draft a fresh
      record-led direction as real visuals first. Recommendation: (a).
- **Done when:** one line in §6 Decision log; kept ideas → IDEAS.md.

### Gate 3 — Device truth
- [ ] First EAS build on John's physical iPhone.
- [ ] Full device QA script (Claude writes, John runs, ~an hour): OTP on a real
      inbox · SIWA · mic/speech permission flow · **STT in a car with road noise**
      (that's where debriefs happen) · voice-to-voice latency print (<1.5s) ·
      airplane-mode queue → sync · crisis card on test phrase · 988 links dial ·
      deletion · cold start · DESIGN.md §8.
- [ ] Fix cycle per findings; re-run until clean.
- **Done when:** every line checked on-device, evidence noted here.

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

### Gate 6 — Website overhaul + launch (starts after Gate 2)
- [ ] Rebuild unwindrn.com on the chosen brand: keep what works (real captures,
      career-grid canvas, waitlist), corrected factual copy, trust-forward FAQ
      ("your voice never leaves your phone; your hospital never sees this"),
      About page with the real founder story.
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
**Now:** Gate 0 (John's push → Claude's review-and-merge). Nothing else builds.
**Next:** Gate 1 backend proof ∥ Gate 2 brand sitting ∥ Claude drafts the device-QA
script and the brand side-by-side so both are waiting when Gate 0 merges.

## 6. Decisions
| # | Decision | Status | Call |
|---|----------|--------|------|
| D1 | Beta before store submission | **Recommended, awaiting John** | Beta-first: 10–25 nurses, then submit |
| D2 | Apple entity path if account is Individual | Open — blocked on Membership screenshot | Reposition as journaling/lifestyle (already the metadata stance) vs convert to org |
| D3 | Voice-out at beta (ElevenLabs key + cost) | **Recommended ON, awaiting John** | It's the soul of the product; caps bound the spend |
| D4 | Minimal first-party events table (no 3rd-party SDKs) | **Recommended, awaiting John** | Without it, no retention read at the go/no-go |
| D5 | Ship-now brand: Deep Ward vs On the Record | Open — Gate 2 sitting | Bias Deep Ward; graft OTR's best ideas |
| — | The Kept Light | **Rejected (final)** — 2026-08-20 | Never propagate |
| — | B2C first, no hospital sales at launch | **Decided** — John | Trust architecture over check size |
| — | Legacy carve: react-query + date-fns stay | **Decided** — whitelist formally | Load-bearing since v1; ripping out is overcoding |

## 7. Evidence log (newest first)
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
