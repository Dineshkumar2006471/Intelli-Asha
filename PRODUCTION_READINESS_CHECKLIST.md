# IntelliASHA — Production Readiness Checklist
### Final 5-Day Countdown to Submission (Aug 8, 3:30 PM IST)

> Work top to bottom. Each tier blocks the next — don't polish README
> formatting while Tier 0 items are still broken. Check items off as
> you verify them with real evidence, not "it looks fine."

---

## TIER 0 — MUST BE TRUE BEFORE ANYTHING ELSE (today)

- [ ] `npm run build` completes with zero errors
- [ ] New `dist/` bundle hash differs from the stale `index-ChsVtpHF.js`
- [ ] `firebase deploy` run manually once, confirmed live URL serves the NEW bundle
      (`curl -s https://kavach-hackathon-500511.web.app | grep assets`)
- [ ] GitHub Actions workflow has an actual deploy step (not just build+test)
- [ ] A push to `main` results in a new live deployment, verified end-to-end once
- [ ] All exposed/leaked API keys rotated; old ones revoked in GCP Console
- [ ] `.env`, `serviceAccountKey.json` confirmed in `.gitignore`
- [ ] `git log -p | grep -i "AIza"` returns nothing in current history going forward
      (old history scrubbing is secondary — rotation is what actually matters)
- [ ] Dead/unused API keys (e.g. old `GEMINI_API_KEY`) deleted from GCP Console
- [ ] `a2aGateway.ts` either deleted (if unused) or properly documented as
      an intentional part of the architecture with PROJECT.md updated to match

---

## TIER 1 — CORE FUNCTIONALITY (Day 1–2)

### Security & Access Control
- [ ] Firestore rules deny-by-default, explicit allow per authenticated role
- [ ] Anonymous auth sessions upgraded via `linkWithCredential()` on phone
      verification — test: log a visit anonymously, verify phone, confirm
      the SAME visit is still visible under the new session
- [ ] ASHA worker role cannot read Supervisor/DHO-only Firestore paths
      (test manually by attempting a blocked read as a field-worker account)
- [ ] Maps API key restricted by referrer, restricted to specific APIs
- [ ] No service account JSON or server secret present in frontend bundle
      (`grep -rn "private_key" dist/` should return nothing)

### The Agent Chain (Firestore Triggers)
- [ ] `eventarc.googleapis.com` confirmed enabled
- [ ] Function region matches Firestore region confirmed
- [ ] Run the single end-to-end ASHA visit test (voice/text → Field Agent →
      Verification Agent → dashboard update) and fill in the result table
- [ ] Zero silent `catch` blocks returning fallback/mock data — every catch
      either surfaces a visible error state or rethrows
- [ ] Scheduled agents (Alert/Analytics/Incentive, if aggregate-based)
      confirmed via `gcloud scheduler jobs list`, last run succeeded

### Geolocation
- [ ] Tested on the live HTTPS URL, not just localhost
- [ ] All four permission states handled visibly: granted / denied / prompt / unavailable
- [ ] Geo-anchor verification logic tested against at least 2 real coordinate pairs

---

## TIER 2 — FEATURE COMPLETENESS (Day 2–3)

### Multilingual Voice (only claim this once it's true)
- [ ] Audio uploads via `MediaRecorder` → Cloud Storage (not inline base64
      beyond short test clips — 1MB Firestore document limit will break longer notes)
- [ ] Cloud Speech-to-Text (Chirp 3) called with `alternativeLanguageCodes`
      for `hi-IN`, `te-IN`, `en-IN`
- [ ] Tested with one REAL Hindi recording — transcription verified correct
- [ ] Tested with one REAL Telugu recording — transcription verified correct
- [ ] Only after both pass: update README to claim multilingual support

### Dashboards — Real Data, Not Placeholders
- [ ] Every KPI card traced to an actual Firestore query (grep the component,
      confirm no hardcoded numbers remain)
- [ ] Coverage map pins sourced from real visit geo-fields, not sample coordinates
- [ ] PHC breakdown table and disbursement section confirmed reading live data
- [ ] Alert feed shows a real, agent-generated alert (not a static string)

### CSV / Export
- [ ] DHO Dashboard CSV export tested end-to-end — confirm downloaded file
      contains real current data, correct headers, no encoding issues

---

## TIER 3 — QUALITY & RESILIENCE (Day 3–4)

### Error Handling
- [ ] Network failure mid-visit-log → offline queue or clear error, not a silent freeze
- [ ] Gemini API 429/rate-limit → retry with backoff, or clear user-facing message
- [ ] Firestore permission-denied → visible message, never a blank dashboard
- [ ] Cloud Run cold start → `minInstances: 1` set on all agent functions
      (only turn this on the morning of Aug 8 to control cost)

### Automated Testing
- [ ] At least one unit test per agent function (mock Gemini response, assert
      correct Firestore write)
- [ ] Firestore rules tested with the Firebase Emulator Suite
- [ ] CI pipeline fails the build if tests fail (not just reports and continues)
- [ ] Test coverage badge added to README

### Accessibility (WCAG 2.1 AA — this matters for a public health app)
- [ ] All text meets 4.5:1 contrast ratio
- [ ] All touch targets minimum 44×44px
- [ ] Screen reader labels (`aria-label`) on all interactive elements
- [ ] Works at 200% browser zoom without breaking layout
- [ ] No information conveyed by color alone (status badges also have text/icons)

---

## TIER 4 — PRESENTATION LAYER (Day 4–5)

### Repository Structure
- [ ] `README.md` — demo GIF/video embed, live URL, architecture diagram,
      quick-start commands, tech stack table, team section
- [ ] `PROJECT.md` — ground truth doc (already exists — keep it updated as
      code changes, don't let it drift from reality again)
- [ ] `DESIGN.md` — UI/UX spec (already exists)
- [ ] `/architecture/diagram.png` — accurate to the REAL Firestore-trigger
      chain, not a generic multi-agent diagram
- [ ] `/architecture/PRD.md` — Product Requirements Document
- [ ] `LICENSE` file present
- [ ] `.env.example` with placeholder values only, committed
- [ ] No stray/dead code directories (old React pages, unused test scaffolding)

### Demo Readiness
- [ ] Seed script runs 15–20 visits through the REAL agent pipeline
      (not direct Firestore writes) to populate realistic historical data
- [ ] One zone deliberately left with zero recent visits, for a live
      Alert Agent trigger during the demo
- [ ] Live demo rehearsed at least 3 times, timed at under 4 minutes
- [ ] Backup demo video recorded in case live demo fails on stage
- [ ] Judge Q&A prep: honest answer ready for "is this seeded data?"
      (yes — explain it went through real agents, see prior guidance)

### Final Verification (morning of Aug 8)
- [ ] `minInstances: 1` enabled on all Cloud Functions
- [ ] Fresh incognito load of live URL — full flow works with no console errors
- [ ] GitHub repo set to public, latest commit is clean on `main`
- [ ] Tag release: `v1.0.0-finale`

---

## Honest Note on "98% Across All Parameters"

I can't promise a judge's subjective score — that's genuinely outside
anyone's control, including mine. What I can tell you is: every item in
this checklist is objectively verifiable, and if all of them are checked
with real evidence (not assumption), you will have closed every gap a
technical judge can actually find. That's the most any team can control
going into judging. The rest is your live demo and how clearly you explain
the "why" behind IntelliASHA — which you already do well.

Work Tier 0 today. Don't move to Tier 1 until every Tier 0 box is
verified with actual command output, not memory of what it usually does.
