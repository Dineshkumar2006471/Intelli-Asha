# IntelliASHA — Brutal Audit Report

**Auditor posture:** Senior Google Cloud Architect + Hackathon Judge (500+ submissions evaluated)  
**Audit date:** 2 August 2026, 23:00 IST  
**Submission deadline:** 5 August 2026, 23:59 IST  
**Grand Finale:** 8 August 2026, Google Office Bengaluru  
**Days remaining:** 6 (3 before submission, 5 before stage)

---

## 1. OVERALL VERDICT

| Metric | Value |
|--------|-------|
| **Current estimated score** | **32 / 100** |
| **Estimated rank if submitted today** | **Top 45–55 out of 100** |
| **Biggest risk of not making top 5** | Your README and PROJECT.md claim 15+ Google services that do not exist in your codebase. A judge who opens your `package.json` and sees zero ADK, zero A2A, zero Cloud Speech-to-Text, zero Google Maps SDK, and zero Vertex AI will mark you as a **fabricated submission** — which is worse than an incomplete one. |

### ⚠️ CRITICAL WARNING

**The single most dangerous problem in your submission is the credibility gap between what your documentation claims and what your code actually does.** Every claim below that is marked ❌ is something a judge can verify in under 60 seconds by reading your `package.json`, `functions/package.json`, and searching for import statements. You are not competing against other builders — you are competing against a judge's ability to grep your repo.

---

## 2. PARAMETER-BY-PARAMETER REPORT

---

### PARAMETER 1: GOOGLE SERVICES INTEGRATION DEPTH

**Status: FAIL**  
**Priority: 🔴 CRITICAL**

I audited every Google service you listed in your README and PROJECT.md against what actually exists in your code. Here is the line-by-line truth:

| # | Claimed Service | Actually Used? | Evidence |
|---|----------------|---------------|----------|
| 1 | **Google ADK (Agent Development Kit)** | ❌ **NOT USED** | Zero ADK dependency in either `package.json`. No `@google/adk` import anywhere. Your "agents" are plain TypeScript functions — `processVisitVoiceNote()` and `generateFullDashboardData()` in `src/services/aiAgent.ts`. The Cloud Function `verificationAgent` is a Firestore trigger, not an ADK agent. |
| 2 | **Google A2A Protocol** | ❌ **NOT USED** | Zero A2A code anywhere. No `/.well-known/agent.json`. No agent cards. No task delegation. Your "agents" never communicate with each other — the Verification Agent is triggered by Firestore `onDocumentCreated`, which is a database trigger, not A2A. |
| 3 | **Antigravity (Orchestration Platform)** | ❌ **NOT USED AS ORCHESTRATION** | Antigravity is your IDE. You developed code inside it. That is not "orchestration." There is no Antigravity deployment config, no agent graph definition, no orchestration manifest in your repo. |
| 4 | **Google Maps Platform + Places API** | ❌ **NOT USED** | Your map uses **Leaflet + OpenStreetMap** tiles — see `DHODashboard.tsx` lines 5-9. Your reverse geocoding uses **Nominatim (OpenStreetMap)** — see `useGeolocation.ts` line 46. Zero Google Maps JavaScript API loaded. Zero `@googlemaps/*` dependency. |
| 5 | **Cloud Speech-to-Text (Chirp 3)** | ❌ **NOT USED** | You use the **browser-native Web Speech API** — see `useSpeechRecognition.ts` lines 72-73: `window.SpeechRecognition ?? window.webkitSpeechRecognition`. This is a browser API, not Google Cloud Speech-to-Text. No `@google-cloud/speech` dependency. |
| 6 | **Vertex AI** | ❌ **NOT USED** | Zero Vertex AI dependency. Zero `@google-cloud/aiplatform` import. No deployed model endpoint. No prediction API call. |
| 7 | **Gemini text-embedding-004** | ❌ **NOT USED** | Zero embedding calls anywhere. No `embedContent()` call. No vector search. |
| 8 | **Firebase Cloud Messaging (FCM)** | ❌ **NOT USED** | Zero FCM code. No `getMessaging()`, no `getToken()`, no push token storage, no service worker for background notifications. The notification bell icon in `FieldWorker.tsx` line 63 is a non-functional decorative button. |
| 9 | **Cloud Run** | ⚠️ **DOCKERFILE EXISTS, NO EVIDENCE OF DEPLOYMENT** | `Dockerfile` exists and is well-structured (multi-stage, non-root user, health check). But the Dockerfile builds the **frontend static files** and serves them via nginx — it does not run agent microservices. No `cloudbuild.yaml`, no `gcloud run deploy` script, no Cloud Run service URL documented. |
| 10 | **Secret Manager** | ❌ **NOT USED** | All secrets are in `.env` files loaded via `import.meta.env`. The Cloud Function reads `process.env.GEMINI_API_KEY` — see `functions/src/index.ts` line 13. No `@google-cloud/secret-manager` dependency. Comment says "uses Secret Manager in production" but it doesn't. |
| 11 | **BigQuery** | ⚠️ **CLIENT EXISTS, QUERY IS FAKE** | BigQuery client is initialized in `functions/src/index.ts` line 9. But the query on lines 77-84 is a hardcoded `SELECT 1245 as total_ashas, 45200 as total_beneficiaries...` — it does not query any real table. No BigQuery dataset, schema, or table exists. |
| 12 | **Cloud Storage** | ❌ **NOT USED** | Zero Cloud Storage code. No audio file uploads. No report file storage. |
| 13 | **Cloud Logging + Cloud Monitoring** | ❌ **NOT USED ON FRONTEND** | The Cloud Function uses `firebase-functions/logger` (standard). The frontend uses a custom console-based logger — not Cloud Logging. |
| 14 | **Google Sheets MCP, Maps MCP, Drive MCP** | ❌ **NOT USED** | Your only MCP file is `mcp/ndhm-server.js` — a mock class with hardcoded return values. It doesn't use `@modelcontextprotocol/sdk`. It is not connected to any agent. It is `module.exports` with no transport binding. |
| 15 | **Flutter Web (PWA)** | ❌ **NOT USED** | Your app is **React 19 + Vite 8 + TypeScript** — see `package.json`. Zero Flutter. Zero Dart. No `pubspec.yaml`. |
| 16 | **Gemini 2.5 Flash** | ✅ **USED** | Correctly integrated via `@google/genai` SDK. Structured JSON output with `responseSchema`. Used in both frontend (`aiAgent.ts`) and Cloud Functions (`index.ts`). Google Search grounding enabled for dashboard data. |
| 17 | **Firebase Firestore** | ✅ **USED** | Persistent local cache enabled with `persistentMultipleTabManager` — see `firebase.ts` lines 25-27. Real-time `onSnapshot` listeners in `db.ts`. Composite indexes defined in `firestore.indexes.json`. |
| 18 | **Firebase Authentication** | ⚠️ **PARTIALLY USED** | Anonymous sign-in (not phone OTP) for field workers — `AuthContext.tsx` line 45. Google Sign-In for supervisors — lines 66-70. **Phone OTP is NOT implemented** despite being claimed. Phone number is stored in `photoURL` field as a string hack — line 46. |
| 19 | **Firebase Hosting** | ✅ **CONFIGURED** | `firebase.json` and `.firebaserc` exist. Live URL `intelliasha.web.app` is linked in README. |
| 20 | **Firebase Cloud Functions** | ✅ **USED** | Two functions: `getDHOMetrics` (callable) and `verificationAgent` (Firestore trigger) in `functions/src/index.ts`. Proper authentication check, error handling, and type definitions. |

**Summary: You claim 20+ Google services. You actually use 5 (Gemini, Firestore, Firebase Auth, Firebase Hosting, Cloud Functions). The other 15 are fabricated claims.**

> **⚠️ WARNING:** This is a disqualifying credibility gap. If a judge reads your PROJECT.md claiming "Google ADK," "A2A Protocol," "Antigravity orchestration," "Vertex AI," "Cloud Speech-to-Text Chirp 3," and "Google Maps Platform" — then opens your `package.json` and finds none of these dependencies — your submission will be flagged as dishonest. This is worse than not having them. **Remove every claim you cannot prove with code, or implement them.**

---

### PARAMETER 2: GITHUB REPOSITORY STRUCTURE

**Status: FAIL**  
**Priority: 🔴 CRITICAL**

**What you have:**
```
intelliasha/
├── .github/workflows/ci.yml     ✅ CI pipeline
├── Audit.md                      (this file)
├── Dockerfile                    ✅ Multi-stage build
├── LICENSE                       ✅ MIT
├── README.md                     ⚠️ Overclaims
├── PROJECT (6).md                ❌ "(6)" in filename — screams amateur
├── firebase.json                 ✅
├── firestore.rules               ⚠️ Too permissive
├── firestore.indexes.json        ✅
├── functions/                    ✅ Cloud Functions
├── mcp/ndhm-server.js            ❌ Fake stub
├── src/                          ✅ React app
│   ├── services/aiAgent.ts       ⚠️ Functions, not agents
│   ├── services/db.ts            ✅
│   ├── hooks/                    ✅ Well-structured
│   ├── components/               ✅
│   ├── pages/                    ✅
│   ├── types/                    ✅
│   ├── utils/                    ✅
│   └── context/                  ✅
├── .env                          ❌ REAL KEYS IN REPO
├── .env.example                  ✅
├── convert.cjs                   ❌ Random utility, messy
├── refactor_layout.cjs           ❌ Random utility, messy
├── test_services.js              ❌ Random test file in root
├── report_page_0.png             ❌ Random screenshots in root
├── report_page_1.png             ❌ Random screenshots in root
└── stitch-exports/               ❌ Unknown purpose
```

**What is missing (that judges look for):**
- ❌ No `agents/` directory — judges expect to see distinct agent definitions
- ❌ No `architecture/` directory with architecture diagrams
- ❌ No `DESIGN.md` or `PRD.md`
- ❌ No `CONTRIBUTING.md`
- ❌ No `deploy.sh` or deployment script
- ❌ No `seed_data.ts` script for demo data
- ❌ No `docs/` directory
- ❌ No demo video linked or embedded
- ❌ No `deploy.yml` workflow (only CI, no CD)
- ❌ Junk files in root: `convert.cjs`, `refactor_layout.cjs`, `test_services.js`, `report_page_*.png`, `PROJECT (6).md`

**Issues:**
- `PROJECT (6).md` — the `(6)` suffix signals this was downloaded and re-uploaded multiple times. Rename to `PROJECT.md`
- `.env` file exists and may contain real keys — **security violation**
- `stitch-exports/` is unexplained clutter

**Time to fix:** 2–3 hours

---

### PARAMETER 3: README.md QUALITY

**Status: PARTIAL**  
**Priority: 🟡 HIGH**

| Required Element | Present? | Quality |
|-----------------|----------|---------|
| Project name + one-line description | ✅ | Good |
| Demo GIF or video embed | ❌ | **Missing entirely** — judges look at this FIRST |
| Live demo URL | ✅ | `intelliasha.web.app` linked with badge |
| Badges | ✅ | License, hackathon, Gemini, TypeScript |
| Problem statement | ✅ | Clear and compelling |
| Architecture diagram | ✅ | Mermaid diagram included |
| Agent breakdown | ✅ | But describes agents that **don't exist in code** |
| Tech stack table | ✅ | But lists services that **aren't implemented** |
| Quick start commands | ✅ | Clean 5-step setup |
| Environment variables | ⚠️ | Mentioned but no table of variables |
| Firestore data model | ❌ | Missing |
| API endpoints table | ❌ | Missing |
| Testing instructions | ⚠️ | `npm run test` mentioned but no detail |
| Deployment instructions | ❌ | Missing |
| Team section | ❌ | No builder profile, photo, or links |
| Demo video link | ❌ | **Critical miss** |

**Key issues:**
1. **No demo video** — #1 thing judges look at. A 2-minute Loom showing voice → Gemini → Firestore → dashboard update would add 10+ points.
2. **README claims don't match code** — Mermaid diagram shows "Google ADK", "A2A", "Vertex AI + BigQuery" which don't exist in code.
3. **No builder/team section** — judges want to see who built this.

**Time to fix:** 3–4 hours

---

### PARAMETER 4: AGENT ARCHITECTURE QUALITY

**Status: FAIL**  
**Priority: 🔴 CRITICAL**

**Claimed: 5 ADK agents with A2A inter-agent communication**  
**Reality: 3 plain functions + 1 Cloud Function trigger + 1 nonexistent agent**

| Agent | Claimed | Actual | ADK? | A2A? |
|-------|---------|--------|------|------|
| **Field Agent** | ADK + Gemini 2.5 Flash | `processVisitVoiceNote()` — single async function in `aiAgent.ts` | ❌ | ❌ |
| **Verification Agent** | ADK + Maps Platform | Firestore `onDocumentCreated` trigger in `functions/src/index.ts` L116 | ❌ | ❌ |
| **Alert Agent** | ADK + FCM | 5 lines inside the Verification Agent — writes to `alerts` collection. Not a separate agent. | ❌ | ❌ |
| **Analytics Agent** | Vertex AI + BigQuery | `generateFullDashboardData()` — calls Gemini from **client side**. Falls back to random data. | ❌ | ❌ |
| **Incentive Agent** | ADK + Sheets MCP | **DOES NOT EXIST.** Zero code. `Earnings.tsx` calculates earnings with `visits.length * 250`. | ❌ | ❌ |

**What the judge sees:** Your "5-agent multi-agent orchestration system" is actually:
1. A Gemini API call on the frontend
2. A Firestore trigger on the backend that calls Gemini
3. An `if (result.flagged)` block that writes to a Firestore collection
4. Another Gemini API call on the frontend for dashboard data
5. Nothing (Incentive Agent doesn't exist)

This is **not a multi-agent system**. This is a standard web app with two Gemini API calls and a Cloud Function.

**Time to fix:** 16–24 hours (implement real agents) OR 2 hours (reframe architecture honestly)

---

### PARAMETER 5: SECURITY AUDIT

**Status: FAIL**  
**Priority: 🔴 CRITICAL**

| Check | Status | Evidence |
|-------|--------|----------|
| Hardcoded API keys | ⚠️ **LIKELY** | `.env` file exists in repo root |
| `.env` in `.gitignore` | ⚠️ **CHECK** | Needs manual verification |
| `.env.example` with placeholders | ✅ | Placeholder values |
| Firestore rules locked down | ❌ **FAIL** | `isWorker()` only checks `request.auth != null`. **Any authenticated user can read ALL visits from ALL workers.** |
| Role-based access | ❌ **FAIL** | No role enforcement. `ProtectedRoute` only checks `currentUser != null`. |
| Workers collection | ❌ **FAIL** | Any user can write to ANY worker document. Comment: `// In production, this should be...` |
| **Gemini API key exposure** | ❌ **CRITICAL** | `VITE_GEMINI_API_KEY` loaded via `import.meta.env` in `aiAgent.ts` L8. **API key embedded in client-side JavaScript bundle.** Anyone with DevTools can extract it. |
| CORS restrictions | ❌ | No CORS configuration |
| Secret Manager | ❌ | Not used |
| API key restrictions | ❌ | No evidence |

**Most critical:** Your Gemini API key is in the client bundle. A judge who opens DevTools → Sources → searches for `AIzaSy` will find it. Hard fail for production readiness.

**Time to fix:** 4–6 hours

---

### PARAMETER 6: ERROR HANDLING & RESILIENCE

**Status: PARTIAL**  
**Priority: 🟡 HIGH**

| Scenario | Handled? |
|----------|----------|
| Internet lost mid-visit | ✅ Firestore persistent cache + offline indicator |
| Gemini 429 rate limit | ✅ Exponential backoff retry (3 attempts) |
| Geo-anchor fails | ✅ Fallback name |
| BigQuery timeout | ⚠️ Hardcoded fallback (not cached last result) |
| Empty Gemini response | ✅ Null check |
| Malformed Gemini JSON | ✅ Shape validation |
| Global error boundary | ✅ ErrorBoundary component |
| Speech Recognition unsupported | ✅ Browser detection |
| Verification Agent empty snapshot | ✅ Null check |
| Cloud Run cold start | ❌ No configuration |
| FCM push fails | N/A (FCM not implemented) |
| A2A failure | N/A (A2A not implemented) |

**Credit:** Error handling on paths that DO exist is reasonably solid. Retry logic, offline indicator, fallback data, and error boundary are real.

**Time to fix:** 2 hours

---

### PARAMETER 7: ACCESSIBILITY (WCAG 2.1 AA)

**Status: PARTIAL**  
**Priority: 🟢 MEDIUM**

| Check | Status |
|-------|--------|
| Touch targets ≥ 44×44px | ⚠️ Main mic button 112×112px ✅. Some smaller buttons may not meet 44px. |
| Colour contrast ≥ 4.5:1 | ⚠️ Design-system tokens suggest intent, needs runtime verification |
| Voice input visual fallback | ✅ Transcription + structured data preview |
| Screen reader labels | ⚠️ `aria-label` on mic ✅, `aria-live` on transcription ✅. Many elements lack labels. |
| Font size ≥ 13px | ✅ |
| Info not by colour alone | ⚠️ Status badges use colour + text ✅. Map legend is colour-only ❌. |
| Skip-to-content | ✅ |
| 2G/3G connectivity | ✅ Firestore offline persistence |

**Time to fix:** 2 hours

---

### PARAMETER 8: AUTOMATED TESTING

**Status: PARTIAL**  
**Priority: 🟡 HIGH**

**What exists (10 test files):**
- ✅ AI service tests, DB tests, geolocation hook tests, speech hook tests
- ✅ Logger tests, env validation tests, auth context tests
- ✅ ErrorBoundary, ProtectedRoute, Sidebar tests
- ✅ CI pipeline: lint → typecheck → test → build → Docker

**What is missing:**
- ❌ No integration tests
- ❌ No E2E tests
- ❌ No Firestore security rules tests
- ❌ No Cloud Function tests
- ❌ Pages excluded from coverage
- ❌ Coverage thresholds at 50% (low)
- ❌ `continue-on-error: true` on Firestore rules validation in CI

**Credit:** More tests than 80% of hackathon submissions. Organized structure.

**Time to fix:** 4–6 hours

---

### PARAMETER 9: LIVE DEMO READINESS

**Status: PARTIAL**  
**Priority: 🔴 CRITICAL**

**What works today:**
1. ✅ Login as field worker (anonymous auth)
2. ✅ Tap mic → speak → Web Speech API transcribes
3. ✅ Gemini extracts structured data → preview
4. ✅ Speech synthesis reads back data
5. ✅ Submit → Firestore + geo-anchor
6. ✅ Cloud Function verifies → may flag + create alert
7. ✅ Supervisor dashboard live updates via onSnapshot
8. ✅ DHO Dashboard with Gemini-generated AI brief
9. ✅ CSV/report export

**What does NOT work:**
- ❌ No real push notifications
- ❌ No real A2A agent chain visible
- ❌ No Incentive Agent output
- ❌ Terminal animation is **hardcoded setTimeout**, not real agent events
- ❌ Worker positions on map are **animated with sine/cosine**, not real GPS
- ❌ No demo video recorded
- ❌ No seed script for demo data

**Time to fix:** 8–10 hours

---

### PARAMETER 10: JUDGE SCORING ANALYSIS

**50% AI Agent Evaluation — Current score: ~12/50**

| What judges check | Status | Impact |
|-------------------|--------|--------|
| ADK agents defined? | ❌ | -15 pts |
| Agents use proper tools? | ❌ | -10 pts |
| A2A implemented? | ❌ | -8 pts |
| Real inter-agent communication? | ❌ | -5 pts |
| Well-engineered prompts? | ✅ | +5 pts |
| Real Gemini integration? | ✅ | +8 pts |
| System handles failures? | ✅ | +4 pts |
| Real-time data flow? | ✅ | +5 pts |
| Autonomous verification? | ✅ | +5 pts |

**25% Structured Feedback — Current score: ~15/25**

| Criterion | Status |
|-----------|--------|
| Problem clarity | ✅ Excellent |
| Impact measurability | ✅ Good |
| Solution novelty | ⚠️ Voice + AI extraction isn't novel in 2026 |
| Google stack depth | ❌ Claims depth that doesn't exist |

**Estimated total: 32/100**

---

### PARAMETER 11: PRODUCTION DEPLOYMENT CHECKLIST

| Category | Check | Status |
|----------|-------|--------|
| Firebase Hosting deployed | ⚠️ Config exists |
| Firestore rules deployed | ⚠️ Rules exist but insecure |
| Firestore indexes deployed | ✅ |
| Auth providers enabled | ⚠️ Anonymous + Google only |
| FCM configured | ❌ |
| Cloud Run deployed | ❌ |
| Cloud Logging | ❌ |
| Secret Manager | ❌ |
| BigQuery tables | ❌ |
| Repo is public | ✅ |
| No secrets in git history | ⚠️ Check `.env` |
| Clean main branch | ⚠️ Junk files |
| Release tag | ❌ |
| Seed script | ❌ |
| Demo credentials documented | ❌ |
| Backup video | ❌ |

---

### PARAMETER 12: TOP 5 vs TOP 50 PLACEMENT

**Where IntelliASHA sits today:**

```
TOP 5  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  TOP 50
                                           ▲
                                     YOU ARE HERE (~45-55)
```

| Criterion | TOP 5 Standard | IntelliASHA Today | Gap |
|-----------|---------------|-------------------|-----|
| Agent framework | Real ADK agents | Plain functions | 🔴 Massive |
| Inter-agent comms | Real A2A protocol | Firestore trigger | 🔴 Massive |
| Google services | 8–12 deeply integrated | 5 real out of 20 claimed | 🔴 Large |
| Security | Locked per role, Secret Manager | Open rules, client API key | 🔴 Large |
| Testing | >60% coverage, integration tests | ~50% unit only | 🟡 Medium |
| Demo video | Polished 2-min | Does not exist | 🔴 Critical |
| README honesty | Every claim backed by code | 15 fabricated claims | 🔴 Disqualifying |
| Error handling | Circuit breakers on all paths | Good on existing paths | 🟡 Medium |
| Offline support | Full offline queue | ✅ Firestore persistence | 🟢 Good |
| Real-time data | Live dashboard updates | ✅ onSnapshot listeners | 🟢 Good |
| Code quality | Strict TypeScript | ✅ Well-typed, clean hooks | 🟢 Good |

---

## 3. 6-DAY BATTLE PLAN

### Day 1 (Aug 3) — CREDIBILITY FIX + SECURITY [10 hrs]

**Morning (5 hrs): Kill the credibility gap**
1. **Strip all false claims** from README and PROJECT.md. Remove every mention of ADK, A2A, Antigravity orchestration, Google Maps Platform, Cloud Speech-to-Text, Vertex AI, Gemini embeddings, FCM, Cloud Storage, Secret Manager, Google Sheets MCP, Maps MCP, Drive MCP, and Flutter.
2. **Reframe architecture honestly.** "Gemini-powered voice processing + autonomous Firestore-triggered Verification Agent + real-time Firestore sync to supervisor dashboards."
3. **Delete junk files:** `convert.cjs`, `refactor_layout.cjs`, `test_services.js`, `report_page_*.png`, `stitch-exports/`. Rename `PROJECT (6).md` → `PROJECT.md`.
4. **Add builder section** to README.

**Afternoon (5 hrs): Security hardening**
1. **Move client-side Gemini call to a Cloud Function.** Create callable `processVoiceNote` function. Remove `VITE_GEMINI_API_KEY` from frontend.
2. **Fix Firestore security rules** — scope reads to own data for workers, restrict writes.
3. **Remove `.env` from repo.** `git rm --cached .env`. Check git history. Rotate all keys if committed.
4. **Restrict Firebase API key** in Google Cloud Console.

---

### Day 2 (Aug 4) — AGENT DEPTH + DEMO VIDEO [12 hrs]

**Morning (6 hrs): Deepen agent architecture**
1. **Enhance Verification Agent** — add visit-duration checking, geo-accuracy checking, household frequency checking.
2. **Create Analytics Agent Cloud Function** — move `generateFullDashboardData()` server-side, read actual Firestore visit data before calling Gemini.
3. **Connect terminal to real events** — add `agent_logs` Firestore collection, have Cloud Functions write log entries, display via onSnapshot in SupervisorReports.
4. **Create seed script** — populate 20 visits, 3 flagged, 5 alerts, 10 workers.

**Afternoon (6 hrs): Record demo video**
1. **Record 2-minute Loom** showing full flow: login → voice → Gemini → submit → verification → alert → dashboard.
2. **Embed video** in README.
3. **Deploy:** `npm run build && firebase deploy`

---

### Day 3 (Aug 5 — SUBMISSION) — POLISH + SUBMIT [10 hrs]

**Morning (5 hrs): Testing + CI**
1. Add Cloud Function integration test for Verification Agent.
2. Add Firestore rules test.
3. Raise coverage to 70%. Remove `continue-on-error` from CI.

**Afternoon (5 hrs): Final README + submit**
1. Rewrite README with honest tech stack, data model, builder section.
2. Create release tag: `git tag -a v1.0.0 -m "Submission"`
3. Final deploy and submit.

---

### Day 4 (Aug 6) — DEMO REHEARSAL [6 hrs]
- Write and practice 4-minute demo script 5 times.
- Test on physical Android phone.
- Prepare backup video.

### Day 5 (Aug 7) — STAGE PREP [4 hrs]
- Prepare judge Q&A answers.
- Final end-to-end test.
- Fresh seed data.

### Day 6 (Aug 8) — FINALE
- Seed data 30 minutes before slot.
- Execute rehearsed demo.

---

## 4. JUDGE CONVERSATION PREP

### Top 10 Questions & Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | "How do your agents communicate?" | "Event-driven through Firestore. Visit saved → triggers Verification Agent (Cloud Function) → writes results back + creates alerts → Supervisor Dashboard picks up via real-time onSnapshot listener. Agents are decoupled through the database." |
| 2 | "Why this problem?" | "1 million ASHA workers, paper registers, ₹3,800 crore annual disbursements with zero visit verification. 600 million rural Indians affected." |
| 3 | "What happens offline?" | "Firestore persistent local cache stores visits in IndexedDB. Syncs when connectivity returns. UI shows offline indicator." |
| 4 | "How does verification decide to flag?" | "Sends full visit payload + GPS to Gemini 2.5 Flash with structured JSON schema. Checks for medical anomalies, missing geo-anchors, poor GPS accuracy. Returns boolean flag + reason + confidence score." |
| 5 | "What Google services?" | "Gemini 2.5 Flash, Firebase Firestore with offline persistence, Firebase Auth, Cloud Functions, Firebase Hosting." (Be honest.) |
| 6 | "How did you handle prompt injection?" | "HTML tags escaped, data JSON-stringified and truncated to 5,000 chars, Gemini configured with `responseMimeType: 'application/json'` and strict responseSchema." |
| 7 | "Test coverage?" | "Unit tests for all services, hooks, utilities, and components using Vitest. CI runs lint, typecheck, and tests with coverage on every commit." |
| 8 | "How would you scale to 1M workers?" | "Firestore scales horizontally. Cloud Functions auto-scale per document trigger. Analytics moves to BigQuery batch aggregation." |
| 9 | "Most technically challenging part?" | "The real-time autonomous verification loop. Worker speaks → Gemini extracts → Firestore → Cloud Function verifies with Gemini → writes results + alert → supervisor sees it in 2 seconds. No human in the loop." |
| 10 | "What would you add with more time?" | "Real ADK agent definitions, A2A protocol for inter-agent task delegation, and an Incentive Reconciliation Agent for NHM-compliant disbursement reports." |

### The Demo Moment

After logging a voice visit on phone, switch to Supervisor Dashboard on laptop. Judges see visit count increment + alert appear with reason — all within 3 seconds. No refresh.

**Say:** *"Nobody told the system to flag this visit. The Verification Agent saw the data, recognized the anomaly, and pushed the alert before the ASHA worker even put her phone down. That is what autonomous means."*

---

## 5. WHAT NOT TO DO

| # | Mistake | Why It Kills You |
|---|---------|-----------------|
| 1 | **Submit with false claims in README** | Judges will flag you as dishonest. An honest 5-service submission beats a dishonest 20-service claim. |
| 2 | **Spend 6 days adding new services instead of polishing** | You'll end up with 15 half-broken integrations instead of 5 solid ones. Go deep, not wide. |
| 3 | **No demo video** | 30% of judges will never visit your URL. No video = invisible. |
| 4 | **Live demo crashes on stage** | Test 5 times on actual device. Have backup video. Pre-populate data. |
| 5 | **Leave Gemini API key in client bundle** | Judge opens DevTools, finds your key. Hard fail. 2-hour fix. |

---

## FINAL WORD

Your codebase has real quality underneath the credibility problem. TypeScript is strict. Hooks are clean. Firestore offline persistence is genuine. The Verification Agent Cloud Function is the best code in your repo. Error handling is above average.

**Your problem is not code quality. Your problem is honesty.** You built a solid 5-service app and dressed it up as a 20-service system. Judges will see through this in 90 seconds.

**Strip the lies. Own what you built. Polish the real work. Record the video. Fix the security. Submit with integrity.**

A clean submission that honestly uses 5 Google services well will score higher than a dishonest submission claiming 20 services that don't exist.

**With the fixes in this battle plan, realistic score ceiling: 55–65/100 (top 15–25 range).** To crack top 5, you'd need real ADK + A2A — a 40+ hour implementation you don't have time for. Focus on the achievable top 15 target.