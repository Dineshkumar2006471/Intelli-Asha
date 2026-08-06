/**
 * IntelliASHA — Triage Agent (Cloud Function)
 *
 * AI-powered visit prioritization for ASHA field workers.
 * Analyses past visit history and generates a severity-sorted
 * visit plan for the day using Gemini 2.5 Flash.
 *
 * Capabilities:
 *  • Severity-based triage (Critical → High → Medium → Routine)
 *  • NHM guideline-aware prioritization
 *  • Malnutrition case escalation (SAM/MAM detection)
 *  • Flagged visit follow-up prioritization
 *
 * Google Services: Gemini 2.5 Flash, Firebase Cloud Functions, Secret Manager
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { writeAgentLog } from '../services/agentLogger';
import { callGeminiWithRetries } from '../utils/geminiRetries';
import * as logger from 'firebase-functions/logger';

// ─── Gemini Schema ──────────────────────────────────────────────────────

const triageOutputSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Household name' },
      lastStatus: { type: Type.STRING, description: 'Last recorded health status' },
      lastVisitDate: { type: Type.STRING, description: 'Date of last visit (YYYY-MM-DD)' },
      priority: {
        type: Type.STRING,
        enum: ['critical', 'high', 'medium', 'routine'],
        description: 'Priority level based on NHM guidelines',
      },
      reason: { type: Type.STRING, description: 'Brief reason for the assigned priority' },
      visitType: { type: Type.STRING, description: 'Type of visit recommended' },
    },
    required: ['name', 'lastStatus', 'lastVisitDate', 'priority', 'reason', 'visitType'],
  },
};

// ─── Cloud Function ─────────────────────────────────────────────────────

export const updateSmartRouteOnVisit = onDocumentWritten(
  {
    document: 'visits/{visitId}',
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    const snap = event.data?.after?.exists ? event.data.after : event.data?.before;
    if (!snap || !snap.exists) return;

    const workerId = snap.data()?.workerId;
    if (!workerId) return;

    const db = getFirestore();

    // Fetch all visits for this worker
    const visitsSnap = await db.collection('visits').where('workerId', '==', workerId).get();
    
    // Group by household to get the latest status
    const households = new Map<string, any>();
    visitsSnap.docs.forEach(doc => {
      const data = doc.data();
      const name = data.householdName || 'Unknown';
      
      if (!households.has(name) || (data.timestamp?.toMillis?.() > households.get(name).timestamp)) {
        households.set(name, {
          household: name,
          status: data.status,
          visitType: data.visitType,
          date: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          flagged: !!data.anomaliesFound,
          flaggedReason: data.flaggedReason || '',
          timestamp: data.timestamp?.toMillis?.() || Date.now()
        });
      }
    });

    const visits = Array.from(households.values());

    if (visits.length === 0) return;

    logger.info('[TRIAGE_AGENT] Processing triage request', {
      userId: workerId,
      visitCount: visits.length,
    });

    try {
      const ai = new GoogleGenAI({ vertexai: true, project: 'kavach-hackathon-500511', location: 'us-central1' });

      const systemInstruction = `You are the IntelliASHA Triage Agent, an expert AI auditor following strict NHM guidelines.
Your job is to read past visit data for households and generate a prioritized visit schedule.

STRICT PRIORITY RULES:
1. CRITICAL: MUST be assigned if the household has 'flagged: true' AND the 'flaggedReason' mentions Severe Acute Malnutrition (SAM), severe emergency, or high-risk medical anomaly.
2. HIGH: MUST be assigned if 'flagged: true' (for non-emergency reasons) OR if 'status' is "Underweight", "At Risk", or "Delayed".
3. MEDIUM: MUST be assigned if 'flagged: false' AND the 'date' is older than 7 days.
4. ROUTINE: MUST be assigned for all other normal households ('flagged: false' and recently visited).

REASONING RULES:
- The 'reason' MUST accurately reflect the data provided. 
- If 'flagged: true', the reason MUST explicitly quote or summarize the 'flaggedReason'.
- Do NOT hallucinate reasons. If status is Normal and not flagged, reason must be "Routine follow-up check".

SORTING RULE:
- You MUST sort the array in order of priority: critical first, then high, then medium, then routine.`;

      const prompt = `Past visits data: ${JSON.stringify(visits.slice(0, 20))}
Please generate the triage plan based on the strict priority rules.`;

      const response = await callGeminiWithRetries(ai, {
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          temperature: 0.1, // Low temperature for deterministic rule following
          responseMimeType: 'application/json',
          responseSchema: triageOutputSchema,
        },
      });

      if (!response.text) throw new Error('Empty response from Gemini');
      const parsed = JSON.parse(response.text);

      await writeAgentLog({
        agentName: 'TRIAGE_AGENT',
        action: 'visit_prioritization',
        details: `Triaged ${visits.length} visits → ${parsed.length} prioritized for worker ${workerId}`,
        severity: 'success',
      });

      logger.info('[TRIAGE_AGENT] Triage completed', { count: parsed.length });

      await db.collection('workers').doc(workerId).collection('smartRoute').doc('latest').set({ route: parsed });
    } catch (error) {
      logger.error('[TRIAGE_AGENT] Failed', error);

      await writeAgentLog({
        agentName: 'TRIAGE_AGENT',
        action: 'visit_prioritization',
        details: `Failed to triage ${visits.length} visits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
      throw error;
    }
  }
);
