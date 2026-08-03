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

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI, Type } from '@google/genai';
import { writeAgentLog } from '../services/agentLogger';
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

export const generateSmartRoute = onCall(
  {
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 30,
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const { visits } = request.data as {
      visits: Array<{
        household: string;
        status: string;
        visitType: string;
        date: string;
        flagged: boolean;
      }>;
    };

    if (!visits || !Array.isArray(visits) || visits.length === 0) {
      return { success: true, data: [] };
    }

    logger.info('[TRIAGE_AGENT] Processing triage request', {
      userId: request.auth.uid,
      visitCount: visits.length,
    });

    try {
      const ai = new GoogleGenAI({ vertexai: true, project: 'kavach-hackathon-500511', location: 'asia-south1' });

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
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: triageOutputSchema,
        },
      });

      const parsed = JSON.parse(response.text || '[]');

      await writeAgentLog({
        agentName: 'TRIAGE_AGENT',
        action: 'visit_prioritization',
        details: `Triaged ${visits.length} visits → ${parsed.length} prioritized for worker ${request.auth.uid}`,
        severity: 'success',
      });

      logger.info('[TRIAGE_AGENT] Triage completed', { count: parsed.length });
      return { success: true, data: parsed };
    } catch (error) {
      logger.error('[TRIAGE_AGENT] Failed', error);

      await writeAgentLog({
        agentName: 'TRIAGE_AGENT',
        action: 'visit_prioritization',
        details: `Failed to triage ${visits.length} visits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });

      throw new HttpsError('internal', 'Triage Agent failed to process visits.');
    }
  }
);
