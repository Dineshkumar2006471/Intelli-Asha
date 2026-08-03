/**
 * IntelliASHA — Cloud Functions Entry Point
 *
 * Exports all 5 agents + supporting services as Firebase Cloud Functions.
 * Each agent is a self-contained module in `./agents/`.
 *
 * Agent Architecture:
 *  ┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
 *  │  Field Agent     │────▶│  Verification Agent  │────▶│  Alert Agent  │
 *  │  (processVoice)  │     │  (Firestore trigger) │     │  (A2A task)   │
 *  └─────────────────┘     └─────────────────────┘     └──────────────┘
 *                                                              │
 *  ┌─────────────────┐     ┌─────────────────────┐            │ FCM Push
 *  │ Analytics Agent  │     │  Incentive Agent     │            ▼
 *  │ (generateBrief)  │     │ (calculateTBI)       │     [Supervisor]
 *  └─────────────────┘     └─────────────────────┘
 */

import { initializeApp } from 'firebase-admin/app';

// Initialise Firebase Admin SDK (must be called before any agent imports)
initializeApp();

// ---------------------------------------------------------------------------
// 1. Agent Cloud Functions
// ---------------------------------------------------------------------------

export { processVisitVoiceNote } from './agents/fieldAgent';
export { verificationAgent } from './agents/verificationAgent';
export { calculateIncentive } from './agents/incentiveAgent';

// Agent 3: Alert Agent — A2A task handler + scheduled zero-visit detection
export { alertAgent, zeroVisitZoneDetection } from './agents/alertAgent';

// Agent 4: Analytics Agent — District health intelligence
export { updateAnalyticsOnVisit } from './agents/analyticsAgent';


// Agent 6: Triage Agent — AI-powered visit prioritization
export { updateSmartRouteOnVisit } from './agents/triageAgent';

// Services
export { geocode } from './services/geocode';
export { transcribeAudio } from './services/speechToText';
export { syncVisitToBigQuery } from './services/syncToBigQuery';

// A2A Protocol Gateway (Google Agent-to-Agent Specification)

