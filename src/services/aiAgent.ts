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

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '../firebase';
import { createLogger } from '../utils/logger';
import type { VisitData, DashboardData } from '../types';

const log = createLogger('AI_AGENT_SERVICE');

// ─── Cloud Functions Instance ───────────────────────────────────────────

const functions = getFunctions(app, 'asia-south1');

// Connect to emulator in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// ─── Field Agent: Voice → Structured Data ───────────────────────────────

/**
 * Process an ASHA worker's voice transcription into structured visit data.
 * Calls the server-side Field Agent Cloud Function.
 *
 * @param transcription - Raw text from speech recognition
 * @returns Structured visit data extracted by Gemini
 */
export async function processVisitVoiceNote(
  transcription: string
): Promise<VisitData> {
  log.info('Sending transcription to Field Agent', { length: transcription.length });

  const processVoiceNote = httpsCallable<
    { transcription: string },
    { success: boolean; data: VisitData }
  >(functions, 'processVoiceNote');

  try {
    const result = await processVoiceNote({ transcription });

    if (!result.data.success || !result.data.data) {
      throw new Error('Field Agent returned unsuccessful response');
    }

    log.info('Field Agent extraction complete', {
      household: result.data.data.householdName,
      status: result.data.data.status,
    });

    return result.data.data;
  } catch (error) {
    log.error('Field Agent call failed', error);

    // Return a fallback structure so the UI doesn't break
    return {
      householdName: 'Processing Error',
      childName: 'Unknown',
      childAge: 'Unknown',
      weight: 'Unknown',
      status: 'Unknown',
      visitType: 'General Visit',
      immunisation: 'Unknown',
    };
  }
}

// ─── Analytics Agent: Dashboard Data ────────────────────────────────────

/**
 * Generate full dashboard data for the DHO Analytics view.
 * Calls the server-side Analytics Agent Cloud Function.
 *
 * @param locationName - District or region name
 * @returns Dashboard payload with AI brief, metrics, and PHC breakdown
 */
export async function generateFullDashboardData(
  locationName: string
): Promise<DashboardData> {
  log.info('Requesting analytics from Analytics Agent', { location: locationName });

  const generateAnalytics = httpsCallable<
    { locationName: string },
    { success: boolean; data: DashboardData }
  >(functions, 'generateAnalytics');

  try {
    const result = await generateAnalytics({ locationName });

    if (!result.data.success || !result.data.data) {
      throw new Error('Analytics Agent returned unsuccessful response');
    }

    log.info('Analytics Agent response received');
    return result.data.data;
  } catch (error) {
    log.error('Analytics Agent call failed — using fallback', error);

    // Fallback data so the dashboard still renders
    return {
      aiBrief: {
        anomaly: 'Anomaly Detection: Unable to reach Analytics Agent. Showing cached data.',
        recommendation: 'Recommendation: Please refresh once connectivity is restored.',
        alert: 'Alert: Analytics service temporarily unavailable.',
      },
      metrics: {
        total_ashas: 0,
        total_beneficiaries: 0,
        surveys_completed: 0,
        high_risk_cases: 0,
        data_quality_score: 0,
        disbursement_ready: 0,
      },
      phcs: [],
    };
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

/**
 * Calculate NHM-compliant TBI disbursement for an ASHA worker.
 * Calls the server-side Incentive Agent Cloud Function.
 */
export async function calculateWorkerIncentive(
  workerId?: string,
  periodStart?: string,
  periodEnd?: string
): Promise<IncentiveResult> {
  log.info('Requesting incentive calculation from Incentive Agent', { workerId });

  const calculateIncentive = httpsCallable<
    { workerId?: string; periodStart?: string; periodEnd?: string },
    { success: boolean; data: IncentiveResult }
  >(functions, 'calculateIncentive');

  try {
    const result = await calculateIncentive({ workerId, periodStart, periodEnd });

    if (!result.data.success || !result.data.data) {
      throw new Error('Incentive Agent returned unsuccessful response');
    }

    return result.data.data;
  } catch (error) {
    log.error('Incentive Agent call failed', error);
    throw error;
  }
}
