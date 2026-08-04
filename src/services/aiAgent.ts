/**
 * IntelliASHA — AI Agent Service (Frontend)
 *
 * Thin client that calls the server-side agents via Firebase Cloud Functions.
 * No Gemini API key is loaded on the client — all LLM processing happens
 * server-side in the agent Cloud Functions.
 *
 * Agents called:
 *  • processVoiceNote  — Field Agent (voice → structured data)
 *  • generateAnalytics — Analytics Agent (district dashboard)
 *  • calculateIncentive — Incentive Agent (TBI calculation)
 */

import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { createLogger } from '../utils/logger';
import type { DashboardData, VisitData } from '../types';

const log = createLogger('AI_AGENT_SERVICE');

// ─── Field Agent: Voice Transcription ────────────────────────────────────

export async function processVisitVoiceNote(
  transcription: string
): Promise<VisitData> {
  log.info('Calling processVisitVoiceNote (Field Agent)', { length: transcription.length });
  
  try {
    const processVoiceNoteFn = httpsCallable<{ text: string }, { data: VisitData }>(
      functions,
      'processVisitVoiceNote'
    );
    
    const result = await processVoiceNoteFn({ text: transcription });
    log.info('Field Agent response received', result.data);
    return result.data.data;
  } catch (error) {
    log.error('Field Agent processing failed', error);
    throw error;
  }
}

export async function generateFullDashboardData(
  locationName: string
): Promise<DashboardData> {
  log.info('Fetching analytics from Firestore', { location: locationName });

  try {
    const docRef = doc(db, 'analytics', locationName);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      log.warn(`Analytics data not found for ${locationName}. Returning empty dashboard state.`);
      return {
        aiBrief: {
          anomaly: "No data available yet.",
          recommendation: "Please wait for field workers to submit their first visits.",
          alert: "Awaiting initial data sync."
        },
        metrics: {
          total_ashas: 0,
          total_beneficiaries: 0,
          surveys_completed: 0,
          high_risk_cases: 0,
          data_quality_score: 100,
          disbursement_ready: 0
        },
        phcs: []
      };
    }

    log.info('Analytics data retrieved from Firestore');
    return docSnap.data() as DashboardData;
  } catch (error) {
    log.error('Failed to fetch analytics data from Firestore', error);
    throw error;
  }
}

// ─── Incentive Agent: TBI Calculation ───────────────────────────────────

export interface IncentiveResult {
  workerId: string;
  workerName: string;
  period: string;
  breakdown: Array<{
    visitType: string;
    totalCount: number;
    verifiedCount: number;
    flaggedCount: number;
    rate: number;
    grossAmount: number;
    deduction: number;
    netAmount: number;
  }>;
  totalGross: number;
  totalDeductions: number;
  netDisbursement: number;
  totalVisits: number;
  verifiedVisits: number;
  flaggedVisits: number;
  ghostReportingRisk: string;
  recommendation: string;
  anomalyPatterns: string[];
}

export async function calculateWorkerIncentive(
  workerId?: string,
  _periodStart?: string,
  _periodEnd?: string
): Promise<IncentiveResult> {
  if (!workerId) throw new Error('workerId is required');
  log.info('Fetching incentive calculation from Firestore', { workerId });

  try {
    // In a real app, periodStart/periodEnd would be used to fetch the right month's doc
    // e.g., 'workers/{workerId}/incentives/2026-08'
    const docRef = doc(db, 'workers', workerId, 'incentives', 'latest');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      log.warn(`Incentive calculation not found for this worker. Returning empty state.`);
      return {
        workerId,
        workerName: 'Pending',
        period: 'Current',
        breakdown: [],
        totalGross: 0,
        totalDeductions: 0,
        netDisbursement: 0,
        totalVisits: 0,
        verifiedVisits: 0,
        flaggedVisits: 0,
        ghostReportingRisk: 'None',
        recommendation: 'Waiting for visits to be logged.',
        anomalyPatterns: []
      };
    }

    return docSnap.data() as IncentiveResult;
  } catch (error) {
    log.error('Failed to fetch incentive data', error);
    throw error;
  }
}
