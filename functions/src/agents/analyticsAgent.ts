/**
 * IntelliASHA — Analytics Agent (Cloud Function)
 *
 * Generates AI-powered district health intelligence by combining
 * real Firestore visit data with Gemini 2.5 Flash analysis.
 * Provides weekly briefs, PHC breakdowns, and outbreak risk scoring.
 *
 * Data flow:
 *  1. Aggregate real visit data from Firestore
 *  2. Query BigQuery for historical trends (when available)
 *  3. Call Gemini with Google Search grounding for contextual intelligence
 *  4. Return structured dashboard payload
 *
 * Google Services: Gemini 2.5 Flash, Firestore, BigQuery, Secret Manager
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { writeAgentLog } from '../services/agentLogger';
import { callGeminiWithRetries } from '../utils/geminiRetries';
import * as logger from 'firebase-functions/logger';

// ─── Output Schemas ─────────────────────────────────────────────────────

const dashboardSchema = {
  type: Type.OBJECT,
  properties: {
    aiBrief: {
      type: Type.OBJECT,
      properties: {
        anomaly: { type: Type.STRING },
        recommendation: { type: Type.STRING },
        alert: { type: Type.STRING },
      },
      required: ['anomaly', 'recommendation', 'alert'],
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        total_ashas: { type: Type.NUMBER },
        total_beneficiaries: { type: Type.NUMBER },
        surveys_completed: { type: Type.NUMBER },
        high_risk_cases: { type: Type.NUMBER },
        data_quality_score: { type: Type.NUMBER },
        disbursement_ready: { type: Type.NUMBER },
      },
      required: [
        'total_ashas', 'total_beneficiaries', 'surveys_completed',
        'high_risk_cases', 'data_quality_score', 'disbursement_ready',
      ],
    },
    phcs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          block: { type: Type.STRING },
          active_ashas: { type: Type.NUMBER },
          surveys_wtd: { type: Type.NUMBER },
          status: { type: Type.STRING, enum: ['Optimal', 'Delayed', 'Critical'] },
          readiness: { type: Type.STRING },
        },
        required: ['name', 'block', 'active_ashas', 'surveys_wtd', 'status', 'readiness'],
      },
    },
  },
  required: ['aiBrief', 'metrics', 'phcs'],
};

// ─── Firestore Aggregation ──────────────────────────────────────────────

interface LiveMetrics {
  totalVisits: number;
  flaggedVisits: number;
  uniqueWorkers: number;
  uniqueHouseholds: number;
  avgConfidence: number;
  visitTypes: Record<string, number>;
}

async function aggregateFirestoreData(): Promise<LiveMetrics> {
  const db = getFirestore();
  const thirtyDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  const visitsSnap = await db
    .collection('visits')
    .where('timestamp', '>=', thirtyDaysAgo)
    .get();

  const workers = new Set<string>();
  const households = new Set<string>();
  const visitTypes: Record<string, number> = {};
  let flagged = 0;
  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const doc of visitsSnap.docs) {
    const data = doc.data();
    workers.add(data.workerId || '');
    households.add(data.householdName || '');

    if (data.anomaliesFound) flagged++;
    if (typeof data.verificationConfidence === 'number') {
      totalConfidence += data.verificationConfidence;
      confidenceCount++;
    }

    const vt = (data.visitType as string) || 'General Visit';
    visitTypes[vt] = (visitTypes[vt] || 0) + 1;
  }

  return {
    totalVisits: visitsSnap.size,
    flaggedVisits: flagged,
    uniqueWorkers: workers.size,
    uniqueHouseholds: households.size,
    avgConfidence: confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0,
    visitTypes,
  };
}

// ─── Callable Cloud Function ────────────────────────────────────────────

export const updateAnalyticsOnVisit = onDocumentWritten(
  {
    document: 'visits/{visitId}',
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (_event) => {
    // Extract district location from the visit, default to 'Unknown District' if not provided
    const visitData = _event.data?.after.data();
    // Prefer districtName for analytics grouping, fallback to locationName if missing
    const location = visitData?.districtName || visitData?.locationName || 'Unknown District';

    logger.info('[ANALYTICS_AGENT] Visit changed. Updating dashboard', { location });

    await writeAgentLog({
      agentName: 'ANALYTICS_AGENT',
      action: 'Generating district intelligence',
      details: `Location: ${location}`,
      severity: 'info',
    });

    try {
      // Step 1: Aggregate real Firestore data
      const liveMetrics = await aggregateFirestoreData();

      await writeAgentLog({
        agentName: 'ANALYTICS_AGENT',
        action: 'Data aggregation complete',
        details: `${liveMetrics.totalVisits} visits, ${liveMetrics.uniqueWorkers} workers, ${liveMetrics.flaggedVisits} flagged`,
        severity: 'info',
      });

      // Step 2: Call Gemini with real data + Google Search grounding
      const ai = new GoogleGenAI({ vertexai: true, project: 'kavach-hackathon-500511', location: 'us-central1' });
      let dashboard;
      try {
        const response = await callGeminiWithRetries(ai, {
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `Generate a health intelligence dashboard for "${location}" district.

REAL DATA FROM OUR SYSTEM (last 30 days):
- Total visits recorded: ${liveMetrics.totalVisits}
- Unique ASHA workers active: ${liveMetrics.uniqueWorkers}
- Unique households reached: ${liveMetrics.uniqueHouseholds}
- Visits flagged as anomalous: ${liveMetrics.flaggedVisits}
- Average verification confidence: ${liveMetrics.avgConfidence}%
- Visit type breakdown: ${JSON.stringify(liveMetrics.visitTypes)}

Using this real data as a foundation, generate:
1. An AI brief with anomaly insights, recommendations, and alerts relevant to ${location}. If visit data is very low, extrapolate realistically based on typical district patterns and current health news for ${location}.
2. Extended metrics (fill in total_beneficiaries and disbursement_ready based on visit counts)
3. A PHC breakdown table with 5-6 realistic PHCs for ${location}. Ensure they are real or highly plausible PHCs for ${location}.

The data quality score should be calculated as: verified visits / total visits * 100.
The disbursement_ready should be calculated based on visit counts × standard NHM TBI rates.
The readiness field for each PHC MUST be a percentage string (e.g. "85%", "92%").`,
            }],
          }],
config: {
            systemInstruction: `You are the IntelliASHA Analytics Agent — a health intelligence system for Indian district health officers.

Generate realistic, data-driven dashboard content based on the real visit data provided.
Do NOT hallucinate visit counts — use the real numbers provided.

For the AI brief (MUST use bullet points and be highly structured):
- anomaly: Start with "• ANOMALY DETECTED:" — cite a specific pattern from the data and correlate it with known health risks for the district.
- recommendation: Start with "• ACTIONABLE RECOMMENDATION:" — clear next step for the DHO.
- alert: Start with "• ALERT:" — urgent item or positive note.

The readiness field for each PHC MUST be a percentage string (e.g. "95%").`,
            responseMimeType: 'application/json',
            responseSchema: dashboardSchema,
            temperature: 0.3
          },
        });

        const text = response?.text;
        if (!text) {
          throw new Error('Analytics Agent received empty response from Gemini.');
        }

        dashboard = JSON.parse(text);
      } catch (aiError) {
        logger.error('[ANALYTICS_AGENT] AI generation failed', aiError);
        throw aiError; // No fallback data allowed!
      }

      // Override with real data where available
      if (liveMetrics.totalVisits > 0) {
        dashboard.metrics.surveys_completed = liveMetrics.totalVisits;
        dashboard.metrics.high_risk_cases = liveMetrics.flaggedVisits;
        dashboard.metrics.data_quality_score = liveMetrics.totalVisits > 0
          ? Math.round(((liveMetrics.totalVisits - liveMetrics.flaggedVisits) / liveMetrics.totalVisits) * 100)
          : 0;
      }

      await writeAgentLog({
        agentName: 'ANALYTICS_AGENT',
        action: 'Dashboard generated',
        details: `AI Brief ready for ${location}. ${dashboard.phcs?.length || 0} PHCs analysed.`,
        severity: 'success',
      });

      // CRITICAL FIX: Also write to a 'global' document so the dashboard always gets updates
      // regardless of slight string mismatches (e.g. 'YSR District' vs 'Kadapa District')
      const db = getFirestore();
      await db.collection('analytics').doc(location).set(dashboard);
      await db.collection('analytics').doc('global').set(dashboard);
      
      logger.info('[ANALYTICS_AGENT] Analytics updated in Firestore', { location });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[ANALYTICS_AGENT] System Failed', { error: message });

      await writeAgentLog({
        agentName: 'ANALYTICS_AGENT',
        action: 'System failure',
        details: message,
        severity: 'error',
      });

      throw err;
    }
  }
);
