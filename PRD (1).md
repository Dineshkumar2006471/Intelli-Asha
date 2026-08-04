# Product Requirements Document — IntelliASHA

**AI Agent Builder Series 2026 — National Finale**
**Track:** HealthTech · Problem Statement: Community Health Worker Attendance & Field Verification
**Project ID:** kavach-hackathon-500511
**Live Demo:** https://kavach-hackathon-500511.web.app
**Document version:** 2.0 — reflects verified production architecture

---

## 1. Executive Summary

IntelliASHA is a real-time, agent-driven field intelligence system that
replaces India's paper-based community health worker reporting with
verified, voice-first digital visit logging. It is built entirely on
Google Cloud — React on Firebase Hosting, an event-driven agent pipeline
on Firebase Cloud Functions, Firestore as the real-time data layer, and
Vertex AI (Gemini 2.5 Flash) powering natural language understanding,
verification logic, and district-level health intelligence.

The system directly targets a problem of national scale: **1.04 million
ASHA workers**, **200,000+ ANM workers**, and **₹3,800 crore** in annual
incentive disbursement — currently tracked with zero digital verification.

---

## 2. Track & Problem Statement Selection

**Chosen domain:** HealthTech

**Chosen problem statement:** Community/rural health worker attendance
and field visit verification.

**Why this problem statement, explicitly:**

| Selection criterion | Why it fits |
|---|---|
| National scale | Largest community health workforce on earth — no other HealthTech problem statement in this program touches a workforce this size |
| Measurable failure | Verification rate today is effectively 0% — a clean, dramatic before/after metric |
| Government alignment | Maps directly onto NHM (National Health Mission) and Ayushman Bharat digital infrastructure priorities |
| No existing AI-native competitor | Existing tools are either paper-based or basic form-digitization with no verification or agent intelligence layer |
| Full Google stack fit | Voice (Speech-to-Text), NLP (Gemini), geo (Maps Platform), real-time data (Firestore), analytics (BigQuery) — every layer maps to a real Google Cloud service, not a forced integration |
| Demo-ability | A single live voice-logged visit, verified and reflected on a supervisor's map in real time, is a self-explanatory, memorable demo moment for judges |

---

## 3. Problem Deep-Dive

### 3.1 The current state
Every ASHA/ANM household visit — child immunisation checks, maternal
health monitoring, nutrition surveys, disease surveillance — is logged
on a paper register. There is no timestamp verification, no geo-location
confirmation, and no real-time visibility for supervisors.

### 3.2 Consequences, quantified
- **Ghost reporting**: visits logged that never happened, undetectable
  until manual, retrospective audit — if ever.
- **Blind PHCs**: Primary Health Centres have no live view of which
  zones are covered and which are not, on any given day.
- **Delayed outbreak response**: District Health Officers receive
  aggregated data on a weekly/monthly cycle, by which point a
  disease cluster (dengue, diarrhoeal outbreaks) has already spread.
- **Disbursement risk**: ₹3,800 crore is disbursed annually against
  visit counts that cannot currently be independently verified.

### 3.3 Why this hasn't been solved already
Existing digitization efforts in this space are largely **form
digitization**, not **verification and intelligence**. A digital form
that a worker fills in from memory, at home, at the end of the day,
solves data entry — it does not solve trust. IntelliASHA's differentiator
is that verification (geo-anchor, duration, pattern) and proactive
intelligence (alerts, outbreak risk scoring) are core to the system,
not an afterthought.

---

## 4. Target Users & Personas

### Persona 1 — Sunita, ASHA Worker
- Age 34, village-level health worker, Android smartphone (entry-level,
  2–4GB RAM), intermittent 3G/4G connectivity, comfortable speaking
  Hindi, limited comfort with typing/English UI text.
- **Need:** log a visit in seconds, in her own language, without typing.
- **Frustration today:** paper registers, end-of-day reconciliation,
  no way to prove she did her job if questioned.

### Persona 2 — Rajesh, PHC Supervisor
- Manages 40–50 ASHA workers across a block. Currently reconciles
  paper registers manually, 60–70% of his working time.
- **Need:** real-time visibility into who visited where, and where
  gaps exist, without manual paperwork.
- **Frustration today:** finds out about coverage gaps weeks too late.

### Persona 3 — Dr. Kavita, District Health Officer
- Oversees 8–12 PHCs across a district. Needs aggregate health
  intelligence and disbursement sign-off, not individual visit detail.
- **Need:** a weekly, trustworthy, synthesized health brief and a
  clear, audit-ready disbursement report.
- **Frustration today:** aggregated data arrives too late to act on
  emerging risk signals.

---

## 5. Solution Overview

IntelliASHA is a single React web application (responsive, PWA-capable)
serving three role-based experiences (Field Worker, Supervisor, DHO),
backed by an event-driven agent pipeline. A worker's visit write to
Firestore triggers a chain of Cloud Functions — the "agents" — that
transcribe, structure, verify, alert on, analyze, and reconcile that
visit data, entirely server-side, with results reflected back to
dashboards in real time via Firestore's live listeners.

**This is explicitly an event-driven serverless architecture using
Firestore document triggers — not an HTTP-based multi-agent protocol,
not a Python backend, not a native mobile app.** See Section 8 for the
full technical architecture.

---

## 6. Goals & Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Digitize visit logging | % of visits logged digitally vs paper | 100% of pilot cohort |
| Verify visit authenticity | % of visits passing geo/duration verification | ≥ 90% |
| Reduce supervisor reconciliation time | Hours/week spent on manual reconciliation | From ~25 hrs/week → under 2 hrs/week |
| Accelerate outbreak signal detection | Time from zero-coverage zone to alert | Under 24 hours (vs. weeks today) |
| Improve disbursement accuracy | % of disbursement matched to verified visits | ≥ 95% |
| Multilingual accessibility | Languages supported for voice logging | Hindi, Telugu, English at MVP |

---

## 7. Key Features (with User Stories)

### 7.1 Voice-First Field Logging
**User story:** *As an ASHA worker, I want to log a household visit by
speaking in my own language, so that I don't need to type or fill in
a form after a long day of fieldwork.*

- Tap-to-record voice note in the Field App
- Audio uploaded to Cloud Storage, transcribed via Cloud Speech-to-Text
  (Chirp 3 model) with Hindi/Telugu/English language support
- Transcription passed to Gemini 2.5 Flash, which extracts structured
  fields (household ID, health metrics, visit type) directly from
  natural language — including non-English input, without a separate
  translation step
- Worker sees a structured confirmation card and can correct any
  misheard field before submitting

### 7.2 Geo-Anchored Verification
**User story:** *As a PHC Supervisor, I want every visit automatically
checked against location and duration, so that I can trust the data
without personally re-verifying it.*

- Verification Agent cross-checks the visit's recorded location
  against the household's registered zone using Google Maps Platform
  geocoding/distance calculations
- Visit duration and time-of-day patterns are checked for anomalies
  (e.g., implausibly short visits)
- Flags — not accuses — anomalies for supervisor review, framed
  constructively (e.g., "needs confirmation" rather than "fraud detected")

### 7.3 Proactive Coverage Alerts
**User story:** *As a PHC Supervisor, I want to be notified the moment
a zone has gone uncovered for too long, so I can act before it becomes
a health risk.*

- Alert Agent evaluates zone coverage (via scheduled checks and
  Firestore triggers on verified visits)
- Pushes real-time notifications via Firebase Cloud Messaging when a
  zone crosses a no-visit threshold during a risk season
- Alerts appear in the Supervisor Dashboard's live alert feed with
  one-click assignment to a follow-up worker

### 7.4 District Health Intelligence Briefs
**User story:** *As a District Health Officer, I want a synthesized,
readable weekly brief instead of raw visit logs, so I can make
decisions quickly.*

- Analytics Agent runs on a nightly schedule, aggregating verified
  visit data via BigQuery
- Gemini 2.5 Flash synthesizes a natural-language health intelligence
  brief — coverage trends, risk zones, notable patterns
- Presented on the DHO Dashboard alongside a district coverage map

### 7.5 Verified Incentive Reconciliation
**User story:** *As a District Health Officer, I want disbursement
sheets generated from verified visit counts only, so ghost reporting
cannot inflate payouts.*

- Incentive Agent runs on a monthly schedule, tallying verified visit
  counts per worker
- Generates an NHM-compatible disbursement summary with anomaly flags
  for supervisor sign-off before payout

---

## 8. Technical Architecture

*(See `architecture-diagram.svg` in this folder for the full visual.)*

### 8.1 Architecture Summary
IntelliASHA is a fully serverless, event-driven system on Firebase and
Google Cloud. There is no traditional REST API layer between frontend
and backend logic — the frontend writes to Firestore, and all backend
"agent" behavior is triggered by Firestore document events or by
Cloud Scheduler for aggregate/batch operations.

### 8.2 Layer-by-Layer Breakdown

**Client Layer**
- React 18 + TypeScript, built with Vite, styled with Tailwind CSS
- React Router v6 for navigation across three role-based experiences
- Recharts for dashboard data visualization
- Google Maps JavaScript API for coverage heatmaps
- Deployed on Firebase Hosting

**Authentication Layer**
- Firebase Authentication
- ASHA workers: Phone OTP, with anonymous sessions upgraded via
  `linkWithCredential()` to preserve visit history across the
  anonymous-to-verified transition
- Supervisors / DHOs: Google Sign-In

**Data Layer**
- Cloud Firestore as the single real-time source of truth
- Key collections: `visits`, `structured_visits`, `verified_visits`,
  `alerts`, `analytics_briefs`, `disbursements`, `workers`, `zones`
- Cloud Storage for voice recording files (referenced by path in
  Firestore documents, not embedded as base64 beyond short test clips)

**Agent Layer (Firebase Cloud Functions, Gen 2, Node.js 22, TypeScript)**

| Agent | Trigger | Calls | Writes to |
|---|---|---|---|
| Field Agent | `onDocumentCreated(visits/{id})` | Cloud Speech-to-Text, Vertex AI Gemini 2.5 Flash | `structured_visits` |
| Verification Agent | `onDocumentCreated`/`onDocumentUpdated(structured_visits/{id})` | Google Maps Platform | `verified_visits` |
| Alert Agent | Firestore trigger + Cloud Scheduler | Firebase Cloud Messaging | `alerts` |
| Analytics Agent | Cloud Scheduler (nightly) | Vertex AI Gemini 2.5 Flash, BigQuery | `analytics_briefs` |
| Incentive Agent | Cloud Scheduler (monthly) | BigQuery | `disbursements` |

**External Google Cloud Services**
- Vertex AI (`gemini-2.5-flash`) — structured extraction, health
  intelligence synthesis
- Cloud Speech-to-Text (Chirp 3) — multilingual voice transcription
- Google Maps Platform — geocoding, distance verification, heatmap
- Firebase Cloud Messaging — push alert delivery
- BigQuery — historical aggregation, disbursement calculation
- Cloud Scheduler — batch job triggers for aggregate agents
- Secret Manager — credential storage
- Cloud Logging & Monitoring — observability

### 8.3 Why Firestore Triggers, Not an HTTP Agent Protocol
This architectural choice is deliberate, not a limitation. Firestore
triggers give the system:
- Automatic retry semantics on function failure
- No API surface to secure/rate-limit beyond Firestore's own security
  rules
- Natural real-time propagation to dashboards via the same data layer
  the agents write to (`onSnapshot` listeners), with zero additional
  sync infrastructure

---

## 9. Data Model (Firestore Collections, Simplified)

```
visits/{visitId}
  workerId, householdId, rawAudioPath | rawText, submittedAt, zoneId

structured_visits/{visitId}
  visitId (ref), extractedFields: { childAgeMonths, weightKg,
  healthStatus, visitType, immunisationDue }, language, confidence

verified_visits/{visitId}
  visitId (ref), verified: boolean, verificationFlags: [],
  geoDistanceMeters, visitDurationSeconds

alerts/{alertId}
  zoneId, type, severity, message, createdAt, assignedTo, status

analytics_briefs/{briefId}
  districtId, weekOf, generatedText, coverageStats, riskZones

disbursements/{disbursementId}
  workerId, month, verifiedVisitCount, estimatedAmount, anomalyFlags

workers/{workerId}
  name, phone, role, zoneId, phcId

zones/{zoneId}
  name, phcId, boundaryGeo, lastVisitTimestamp
```

---

## 10. User Flows

### 10.1 ASHA Worker — Logging a Visit
1. Open Field App → authenticate via phone OTP
2. Tap "Log a Visit" → select or search household
3. Tap microphone → speak visit details in Hindi/Telugu/English
4. Field Agent transcribes and extracts structured data (few seconds)
5. Worker reviews structured confirmation card, corrects if needed
6. Submits → Verification Agent runs in background
7. Worker sees visit marked "Verified" in their visit history

### 10.2 PHC Supervisor — Responding to a Coverage Alert
1. Log in via Google Sign-In
2. Alert notification received via FCM: "Zone 4B — 0 verified visits
   in 8 days"
3. Open Supervisor Dashboard → alert appears in live feed with zone
   highlighted on the coverage map
4. Assign a worker for immediate follow-up visit directly from the
   alert card

### 10.3 District Health Officer — Weekly Review
1. Log in via Google Sign-In
2. Open DHO Dashboard → view AI-generated weekly health intelligence
   brief
3. Review district coverage map and PHC-by-PHC breakdown
4. Open Incentive Agent's disbursement report → review anomaly flags
   → approve or escalate for review

---

## 11. Non-Functional Requirements

### Security
- Firestore Security Rules: deny-by-default, explicit role-based access
- No secrets in frontend bundle or committed source — all credentials
  via Secret Manager
- API keys scoped and restricted (HTTP referrer for Maps, API
  restrictions per key)
- Anonymous auth sessions upgraded to persistent identity via
  `linkWithCredential` to prevent data orphaning

### Accessibility (WCAG 2.1 AA target)
- Minimum 44×44px touch targets throughout
- 4.5:1 minimum color contrast on all text
- Screen-reader labels on all interactive elements
- Voice-first design accommodates low-literacy users; visual fallback
  provided for all voice interactions

### Performance & Reliability
- `minInstances` configured on Cloud Functions to mitigate cold-start
  latency during time-sensitive demo/production use
- Offline-tolerant submission queue on the Field App for intermittent
  connectivity scenarios
- Graceful error states (no silent fallback to mock data) across all
  network-dependent operations

### Scalability
- Firestore and Cloud Functions scale automatically with load;
  no fixed-capacity bottleneck in the core pipeline
- BigQuery handles historical aggregation independent of the live
  transactional path, avoiding read-side contention

---

## 12. Technology Stack Summary

| Layer | Technology |
|---|---|
| Frontend framework | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Charts | Recharts |
| Maps | Google Maps JavaScript API |
| Hosting | Firebase Hosting |
| Auth | Firebase Authentication (Phone OTP, Anonymous + linking, Google Sign-In) |
| Backend compute | Firebase Cloud Functions, Gen 2, Node.js 22, TypeScript |
| Database | Cloud Firestore |
| File storage | Cloud Storage |
| AI / LLM | Vertex AI — `gemini-2.5-flash`, via `@google/genai` SDK |
| Speech | Cloud Speech-to-Text (Chirp 3) |
| Notifications | Firebase Cloud Messaging |
| Analytics warehouse | BigQuery |
| Scheduling | Cloud Scheduler |
| Secrets | Secret Manager |
| Observability | Cloud Logging, Cloud Monitoring |
| CI/CD | GitHub Actions → Firebase Hosting + Cloud Functions deploy |

---

## 13. Implementation Roadmap

| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Auth, Firestore schema, Field App shell, voice capture | Complete |
| Phase 2 | Field Agent (transcription + extraction), Verification Agent | Complete |
| Phase 3 | Supervisor Dashboard, Alert Agent, FCM integration | Complete |
| Phase 4 | Analytics Agent, DHO Dashboard, BigQuery pipeline | In progress |
| Phase 5 | Incentive Agent, disbursement reporting | In progress |
| Phase 6 | Multilingual voice validation (Hindi, Telugu), hardening, CI/CD, security audit | In progress — see Production Readiness Checklist |
| Phase 7 | Demo data seeding through live pipeline, rehearsal, final submission | Upcoming |

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cold-start latency during live judge demo | `minInstances: 1` set on all agent functions on demo day |
| Voice transcription accuracy in noisy field conditions | Confirmation card lets worker review/correct extracted data before submission |
| Anonymous auth data orphaning across sessions | `linkWithCredential` upgrade path implemented and tested explicitly |
| Ghost/ghost-adjacent reporting gaming the verification logic | Multi-signal verification (geo + duration + pattern), not a single easily-spoofed check |
| Judges questioning seeded demo data | Seed data generated by running real inputs through the actual agent pipeline, not hardcoded — transparently explained if asked |

---

## 15. Differentiation & Innovation

1. **Verification-first, not form-first.** Most digitization efforts
   in this space stop at replacing paper with a form. IntelliASHA's
   core innovation is the verification and intelligence layer on top
   of that data — geo-anchoring, anomaly detection, proactive alerts.
2. **Voice-native, not voice-assisted.** The primary input modality
   is speech in the worker's own language, not a voice "feature"
   bolted onto a typing-first form.
3. **Proactive, not reactive.** The Alert Agent surfaces coverage
   gaps before a supervisor has to notice them manually.
4. **Fully Google Cloud native.** Every layer — auth, data, AI,
   speech, maps, messaging, analytics, scheduling — runs on Google
   Cloud/Firebase, with no third-party AI or infrastructure dependency.
5. **Audit-ready by design.** Incentive reconciliation is a first-class
   output, not an afterthought — directly addressing the ₹3,800 crore
   disbursement integrity question at the heart of the problem.

---

## 16. Impact Summary

| Metric | Before | With IntelliASHA |
|---|---|---|
| Visit verification | ~0% (paper-based) | ≥ 90% (geo + pattern verified) |
| Supervisor reconciliation time | ~25 hrs/week | < 2 hrs/week |
| Outbreak signal lag | Weeks | < 24 hours |
| Disbursement accuracy | Estimated, unverifiable | ≥ 95% verified |
| Language accessibility | None (paper, English forms) | Hindi, Telugu, English (voice) |

**Beneficiaries:** 1.04 million ASHA workers (fair, verifiable pay),
200,000+ PHC supervisors (drastically reduced manual reconciliation),
600 million rural Indians served by this workforce (faster health
response).

---

## 17. Team

**Bingi Dinesh Kumar** — Sanskriti University, Mathura
[Add duo partner name, role, and contribution split here before submission]

---

## 18. Appendix — Glossary

- **ASHA** — Accredited Social Health Activist
- **ANM** — Auxiliary Nurse Midwife
- **PHC** — Primary Health Centre
- **DHO** — District Health Officer
- **NHM** — National Health Mission
- **Geo-anchor** — location-based cross-validation of a claimed visit
- **Firestore trigger** — a Cloud Function invocation caused by a
  document being created, updated, or deleted in Firestore

---

*This PRD reflects the verified, production architecture as confirmed
through direct codebase and deployment audit — not aspirational or
planned features not yet implemented. Update Section 13 status column
as remaining phases are completed.*
