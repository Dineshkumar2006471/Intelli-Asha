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
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

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
    timeoutSeconds: 30,
    secrets: [geminiApiKey],
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
      const originalProject = process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GOOGLE_CLOUD_PROJECT;
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value(), project: '' });
      process.env.GOOGLE_CLOUD_PROJECT = originalProject;

      const prompt = `You are the IntelliASHA Triage Agent. Based on these past visit records for an ASHA worker, generate a prioritized visit list for today.

Past visits data: ${JSON.stringify(visits.slice(0, 20))}

Rules:
1. Households with "Severe Acute Malnutrition" → priority: "critical"
2. Households with "Underweight" or flagged anomalies → priority: "high"
3. Households not visited in 7+ days → priority: "medium"
4. All others → priority: "routine"
5. Include a brief "reason" for each priority assignment.
6. Sort from highest to lowest priority.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
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
