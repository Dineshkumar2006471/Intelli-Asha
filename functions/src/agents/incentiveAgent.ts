/**
 * IntelliASHA — Incentive Agent (Cloud Function)
 *
 * Calculates NHM-compliant Task-Based Incentive (TBI) disbursements
 * for ASHA workers based on their verified visit data. Detects ghost
 * reporting patterns and generates audit-ready disbursement reports.
 *
 * Capabilities:
 *  • TBI calculation per NHM guidelines (official rates per visit type)
 *  • Ghost reporting detection (duplicate visits, failed verifications)
 *  • Verified visit count reconciliation
 *  • Gemini-generated recommendation for supervisor
 *  • Disbursement report generation
 *
 * Google Services: Gemini 2.5 Flash, Firestore, Secret Manager
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { writeAgentLog } from '../services/agentLogger';
import * as logger from 'firebase-functions/logger';

// ─── NHM Official TBI Rate Card ─────────────────────────────────────────

const TBI_RATES: Record<string, number> = {
  'Institutional Delivery': 600,
  'Immunization': 100,
  'Antenatal Care': 200,
  'HBNC': 250,
  'General Visit': 50,
};

// ─── Output Schema ──────────────────────────────────────────────────────

const incentiveSchema = {
  type: Type.OBJECT,
  properties: {
    ghostReportingRisk: {
      type: Type.STRING,
      enum: ['low', 'medium', 'high'],
    },
    recommendation: { type: Type.STRING, description: 'Supervisor recommendation' },
    anomalyPatterns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of detected anomaly patterns',
    },
  },
  required: ['ghostReportingRisk', 'recommendation', 'anomalyPatterns'],
};

// ─── Types ──────────────────────────────────────────────────────────────

interface IncentiveBreakdown {
  visitType: string;
  totalCount: number;
  verifiedCount: number;
  flaggedCount: number;
  rate: number;
  grossAmount: number;
  deduction: number;
  netAmount: number;
}

interface IncentiveResult {
  workerId: string;
  workerName: string;
  period: string;
  breakdown: IncentiveBreakdown[];
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

// ─── Callable Cloud Function ────────────────────────────────────────────

export const calculateIncentive = onCall(
  {
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const { workerId, periodStart, periodEnd } = request.data as {
      workerId?: string;
      periodStart?: string;
      periodEnd?: string;
    };

    const targetWorkerId = workerId || request.auth.uid;
    const db = getFirestore();

    // Default period: current month
    const now = new Date();
    const startDate = periodStart
      ? new Date(periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = periodEnd
      ? new Date(periodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const periodLabel = `${startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;

    logger.info('[INCENTIVE_AGENT] Calculating incentive', {
      workerId: targetWorkerId,
      period: periodLabel,
    });

    await writeAgentLog({
      agentName: 'INCENTIVE_AGENT',
      action: 'Calculating disbursement',
      details: `Worker: ${targetWorkerId}, Period: ${periodLabel}`,
      severity: 'info',
      relatedWorkerId: targetWorkerId,
    });

    try {
      // Step 1: Fetch visits for the period
      // HACKATHON FIX: Since the composite index is still building, we fetch all visits
      // for the worker (which only needs a basic index) and filter/sort in-memory.
      const visitsSnap = await db
        .collection('visits')
        .where('workerId', '==', targetWorkerId)
        .get();

      const startMs = startDate.getTime();
      const endMs = endDate.getTime();

      const visits = visitsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((v: any) => {
          if (!v.timestamp) return false;
          // Firestore timestamp has toMillis()
          const ms = typeof v.timestamp.toMillis === 'function' ? v.timestamp.toMillis() : Date.parse(v.timestamp);
          return ms >= startMs && ms <= endMs;
        })
        .sort((a: any, b: any) => {
          const ams = typeof a.timestamp?.toMillis === 'function' ? a.timestamp.toMillis() : Date.parse(a.timestamp);
          const bms = typeof b.timestamp?.toMillis === 'function' ? b.timestamp.toMillis() : Date.parse(b.timestamp);
          return bms - ams; // DESC
        });

      // Step 2: Get worker profile
      const workerDoc = await db.doc(`workers/${targetWorkerId}`).get();
      const workerName = workerDoc.exists
        ? (workerDoc.data()?.name as string) || 'ASHA Worker'
        : 'ASHA Worker';

      // Step 3: Calculate TBI breakdown
      const typeMap: Record<string, { total: number; verified: number; flagged: number }> = {};

      for (const visit of visits) {
        const vt = (visit as Record<string, unknown>).visitType as string || 'General Visit';
        // Map to standard TBI types
        const standardType = Object.keys(TBI_RATES).find(
          (k) => vt.toLowerCase().includes(k.toLowerCase())
        ) || 'General Visit';

        if (!typeMap[standardType]) {
          typeMap[standardType] = { total: 0, verified: 0, flagged: 0 };
        }
        typeMap[standardType].total++;

        if ((visit as Record<string, unknown>).anomaliesFound) {
          typeMap[standardType].flagged++;
        } else {
          typeMap[standardType].verified++;
        }
      }

      const breakdown: IncentiveBreakdown[] = Object.entries(typeMap).map(
        ([visitType, counts]) => {
          const rate = TBI_RATES[visitType] || 50;
          const grossAmount = counts.total * rate;
          const deduction = counts.flagged * rate; // Flagged visits are deducted
          return {
            visitType,
            totalCount: counts.total,
            verifiedCount: counts.verified,
            flaggedCount: counts.flagged,
            rate,
            grossAmount,
            deduction,
            netAmount: grossAmount - deduction,
          };
        }
      );

      const totalGross = breakdown.reduce((s, b) => s + b.grossAmount, 0);
      const totalDeductions = breakdown.reduce((s, b) => s + b.deduction, 0);
      const netDisbursement = totalGross - totalDeductions;
      const totalVisits = visits.length;
      const verifiedVisits = visits.filter((v) => !(v as Record<string, unknown>).anomaliesFound).length;
      const flaggedVisits = totalVisits - verifiedVisits;

      // Step 4: Ghost reporting detection via Gemini
      let geminiResult = {
        ghostReportingRisk: flaggedVisits / Math.max(totalVisits, 1) > 0.25 ? 'high' : 'low',
        recommendation: 'Automated assessment unavailable. Manual review recommended.',
        anomalyPatterns: [] as string[],
      };

      try {
        const ai = new GoogleGenAI({ vertexai: true, project: 'kavach-hackathon-500511', location: 'us-central1' });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `Analyse this ASHA worker's visit pattern for ghost reporting risk:
  
  Worker: ${workerName}
  Period: ${periodLabel}
  Total visits: ${totalVisits}
  Verified: ${verifiedVisits}
  Flagged: ${flaggedVisits}
  Flagged rate: ${totalVisits > 0 ? Math.round((flaggedVisits / totalVisits) * 100) : 0}%
  Visit type breakdown: ${JSON.stringify(typeMap)}
  Gross earnings: ₹${totalGross}
  Deductions: ₹${totalDeductions}
  Net: ₹${netDisbursement}
  
  Assess ghost reporting risk and provide supervisor recommendation.`,
            }],
          }],
          config: {
            systemInstruction: `You are the IntelliASHA Incentive Agent. Analyse ASHA worker visit patterns for ghost reporting (fake visits to claim incentives).
  
  Risk levels:
  - LOW: flagged rate < 10%, consistent patterns, reasonable visit counts
  - MEDIUM: flagged rate 10-25%, some irregular patterns
  - HIGH: flagged rate > 25%, or suspicious duplicate patterns
  
  Be specific about anomaly patterns. Recommend approval, review, or hold.`,
            responseMimeType: 'application/json',
            responseSchema: incentiveSchema,
            temperature: 0.2,
          },
        });
        
        if (response?.text) {
          geminiResult = JSON.parse(response.text) as {
            ghostReportingRisk: string;
            recommendation: string;
            anomalyPatterns: string[];
          };
        }
      } catch (aiError) {
        logger.warn('[INCENTIVE_AGENT] Vertex AI analysis failed, using fallback metrics', aiError);
      }

      const result: IncentiveResult = {
        workerId: targetWorkerId,
        workerName,
        period: periodLabel,
        breakdown,
        totalGross,
        totalDeductions,
        netDisbursement,
        totalVisits,
        verifiedVisits,
        flaggedVisits,
        ghostReportingRisk: geminiResult.ghostReportingRisk,
        recommendation: geminiResult.recommendation,
        anomalyPatterns: geminiResult.anomalyPatterns,
      };

      await writeAgentLog({
        agentName: 'INCENTIVE_AGENT',
        action: 'Disbursement calculated',
        details: `Worker: ${workerName} | Gross: ₹${totalGross} | Deductions: ₹${totalDeductions} | Net: ₹${netDisbursement} | Risk: ${geminiResult.ghostReportingRisk}`,
        severity: geminiResult.ghostReportingRisk === 'high' ? 'warning' : 'success',
        relatedWorkerId: targetWorkerId,
      });

      logger.info('[INCENTIVE_AGENT] Calculation complete', {
        workerId: targetWorkerId,
        netDisbursement,
        ghostReportingRisk: geminiResult.ghostReportingRisk,
      });

      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[INCENTIVE_AGENT] Failed', { error: message });

      await writeAgentLog({
        agentName: 'INCENTIVE_AGENT',
        action: 'Calculation failed',
        details: message,
        severity: 'error',
        relatedWorkerId: targetWorkerId,
      });

      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', `Incentive Agent failed: ${message}`);
    }
  }
);
