/**
 * IntelliASHA — Verification Agent (Cloud Function)
 *
 * Autonomous agent triggered by Firestore `onDocumentCreated` on the
 * `visits` collection. Performs multi-dimensional verification of every
 * field visit submitted by ASHA workers.
 *
 * Verification Checks:
 *  1. Geo-accuracy      — GPS accuracy > 500 m → flag
 *  2. Visit duration     — < 3 min since last visit → flag
 *  3. Household frequency — same household visited > 2× today → flag
 *  4. Data completeness  — missing critical fields → flag
 *  5. Medical plausibility — Gemini analyses clinical data for anomalies
 *
 * On anomaly detection, delegates to Alert Agent via A2A task queue.
 *
 * Google Services: Gemini 2.5 Flash, Firestore, Secret Manager
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { writeAgentLog } from '../services/agentLogger';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ─── Verification Output Schema ─────────────────────────────────────────

const verificationSchema = {
  type: Type.OBJECT,
  properties: {
    anomaliesFound: { type: Type.BOOLEAN },
    flaggedReason: { type: Type.STRING },
    verificationConfidence: { type: Type.NUMBER, description: 'Confidence 0-100' },
    medicalPlausibility: {
      type: Type.STRING,
      enum: ['pass', 'fail', 'uncertain'],
    },
    recommendation: { type: Type.STRING, description: 'Action recommendation for supervisor' },
  },
  required: ['anomaliesFound', 'flaggedReason', 'verificationConfidence', 'medicalPlausibility'],
};

const SYSTEM_INSTRUCTION = `You are the IntelliASHA Verification Agent — an autonomous AI auditor for India's public health visits.

Your job: Analyse a submitted ASHA worker visit and determine if it contains anomalies.

You receive:
- Structured visit data (household, child, weight, status, visit type)
- GPS accuracy in metres
- Pre-check results from rule-based validation (geo, duration, frequency, completeness)

DECISION RULES:
1. If any pre-check FAILED → set anomaliesFound=true and cite the failing check.
2. Even if pre-checks pass, analyse the MEDICAL DATA:
   - Weight of 4 kg for a "2 year old" → Severe Acute Malnutrition → flag as HIGH RISK
   - "Normal" status but weight below WHO growth standards → flag as DATA INCONSISTENCY
   - Multiple immunisations listed that are normally spaced months apart → flag as SUSPICIOUS
3. Set verificationConfidence (0-100):
   - 90+ if all checks pass and data is medically plausible
   - 60-89 if minor concerns
   - Below 60 if anomalies detected
4. Provide a clear, actionable recommendation for the PHC supervisor.

Respond ONLY with valid JSON matching the output schema.`;

// ─── Rule-Based Pre-Checks ──────────────────────────────────────────────

interface PreCheckResults {
  geoAccuracy: 'pass' | 'fail' | 'skip';
  visitDuration: 'pass' | 'fail' | 'skip';
  householdFrequency: 'pass' | 'fail' | 'skip';
  dataCompleteness: 'pass' | 'fail' | 'skip';
}

async function runPreChecks(
  visitData: Record<string, unknown>,
  workerId: string,
): Promise<PreCheckResults> {
  const db = getFirestore();
  const results: PreCheckResults = {
    geoAccuracy: 'skip',
    visitDuration: 'skip',
    householdFrequency: 'skip',
    dataCompleteness: 'skip',
  };

  // 1. Geo-accuracy check
  const geoAnchor = visitData.geoAnchor as { accuracy?: number } | null;
  if (geoAnchor && typeof geoAnchor.accuracy === 'number') {
    results.geoAccuracy = geoAnchor.accuracy <= 500 ? 'pass' : 'fail';
  }

  // 2. Visit duration check (< 3 min since last visit = suspicious)
  try {
    const recentVisits = await db
      .collection('visits')
      .where('workerId', '==', workerId)
      .orderBy('timestamp', 'desc')
      .limit(2)
      .get();

    if (recentVisits.docs.length >= 2) {
      const current = recentVisits.docs[0]?.data().timestamp as Timestamp | undefined;
      const previous = recentVisits.docs[1]?.data().timestamp as Timestamp | undefined;
      if (current && previous) {
        const diffMs = current.toMillis() - previous.toMillis();
        const diffMinutes = diffMs / 60000;
        results.visitDuration = diffMinutes >= 3 ? 'pass' : 'fail';
      }
    } else {
      results.visitDuration = 'pass'; // First visit — no comparison
    }
  } catch {
    results.visitDuration = 'skip';
  }

  // 3. Household frequency check (> 2× same household today = suspicious)
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const householdVisits = await db
      .collection('visits')
      .where('workerId', '==', workerId)
      .where('householdName', '==', visitData.householdName || '')
      .where('timestamp', '>=', todayTimestamp)
      .get();

    results.householdFrequency = householdVisits.size <= 2 ? 'pass' : 'fail';
  } catch {
    results.householdFrequency = 'skip';
  }

  // 4. Data completeness check
  const required = ['householdName', 'childName', 'weight', 'status'];
  const missing = required.filter(
    (f) => !visitData[f] || visitData[f] === 'Not mentioned'
  );
  results.dataCompleteness = missing.length === 0 ? 'pass' : 'fail';

  return results;
}

// ─── Firestore Trigger ──────────────────────────────────────────────────

export const verificationAgent = onDocumentCreated(
  {
    document: 'visits/{visitId}',
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 60,
    secrets: [geminiApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('[VERIFICATION_AGENT] No data in snapshot');
      return;
    }

    const visitId = event.params.visitId;
    const visitData = snapshot.data();
    const workerId = (visitData.workerId as string) || 'unknown';
    const db = getFirestore();

    logger.info('[VERIFICATION_AGENT] Processing visit', { visitId, workerId });

    await writeAgentLog({
      agentName: 'VERIFICATION_AGENT',
      action: 'Received new visit payload',
      details: `Visit ID: ${visitId} from worker ${workerId}`,
      severity: 'info',
      relatedVisitId: visitId,
      relatedWorkerId: workerId,
    });

    try {
      // ── Step 1: Run rule-based pre-checks ──
      const preChecks = await runPreChecks(visitData, workerId);
      const failedChecks = Object.entries(preChecks)
        .filter(([, v]) => v === 'fail')
        .map(([k]) => k);

      await writeAgentLog({
        agentName: 'VERIFICATION_AGENT',
        action: 'Pre-checks complete',
        details: `Geo: ${preChecks.geoAccuracy}, Duration: ${preChecks.visitDuration}, Frequency: ${preChecks.householdFrequency}, Completeness: ${preChecks.dataCompleteness}`,
        severity: failedChecks.length > 0 ? 'warning' : 'info',
        relatedVisitId: visitId,
        relatedWorkerId: workerId,
      });

      // ── Step 2: Gemini medical plausibility check ──
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
      const prompt = `ASHA Worker Visit Data:
${JSON.stringify(visitData, null, 2).substring(0, 3000)}

Pre-Check Results:
${JSON.stringify(preChecks, null, 2)}
Failed Checks: ${failedChecks.length > 0 ? failedChecks.join(', ') : 'None'}

Analyse this visit and determine if anomalies exist.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: verificationSchema,
          temperature: 0.1,
        },
      });

      const text = response?.text;
      if (!text) {
        logger.error('[VERIFICATION_AGENT] Gemini returned empty response');
        return;
      }

      const result = JSON.parse(text) as {
        anomaliesFound: boolean;
        flaggedReason: string;
        verificationConfidence: number;
        medicalPlausibility: string;
        recommendation?: string;
      };

      // ── Step 3: Update the visit document ──
      await db.doc(`visits/${visitId}`).update({
        anomaliesFound: result.anomaliesFound,
        flaggedReason: result.flaggedReason || '',
        verificationConfidence: result.verificationConfidence,
        verifiedAt: FieldValue.serverTimestamp(),
        preChecks,
      });

      // ── Step 4: Log result ──
      await writeAgentLog({
        agentName: 'VERIFICATION_AGENT',
        action: result.anomaliesFound ? 'ANOMALY DETECTED' : 'Visit VERIFIED',
        details: result.anomaliesFound
          ? `Reason: ${result.flaggedReason}. Confidence: ${result.verificationConfidence}%`
          : `Confidence: ${result.verificationConfidence}%. All checks passed.`,
        severity: result.anomaliesFound ? 'warning' : 'success',
        relatedVisitId: visitId,
        relatedWorkerId: workerId,
      });

      // ── Step 5: If flagged, create A2A task for Alert Agent ──
      if (result.anomaliesFound) {
        await db.collection('a2a_tasks').add({
          sourceAgent: 'VERIFICATION_AGENT',
          targetAgent: 'ALERT_AGENT',
          action: 'CREATE_ALERT',
          payload: {
            visitId,
            workerId,
            householdName: visitData.householdName || 'Unknown',
            flaggedReason: result.flaggedReason,
            verificationConfidence: result.verificationConfidence,
            recommendation: result.recommendation || '',
          },
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        });

        await writeAgentLog({
          agentName: 'VERIFICATION_AGENT',
          action: 'Delegated to Alert Agent',
          details: `Created A2A task for Alert Agent — Visit ${visitId}`,
          severity: 'info',
          relatedVisitId: visitId,
          relatedWorkerId: workerId,
        });
      }

      logger.info('[VERIFICATION_AGENT] Complete', {
        visitId,
        anomaliesFound: result.anomaliesFound,
        confidence: result.verificationConfidence,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[VERIFICATION_AGENT] Failed', { visitId, error: message });

      await writeAgentLog({
        agentName: 'VERIFICATION_AGENT',
        action: 'Processing failed - Falling back',
        details: message,
        severity: 'warning',
        relatedVisitId: visitId,
        relatedWorkerId: workerId,
      });

      // Fallback: If AI fails, update the visit to avoid stalling the pipeline
      await db.doc(`visits/${visitId}`).update({
        anomaliesFound: false, // Default to false so it doesn't spam alerts
        flaggedReason: 'Pending AI Verification (System Offline)',
        verificationConfidence: 0,
        verifiedAt: FieldValue.serverTimestamp(),
      });
    }
  }
);
