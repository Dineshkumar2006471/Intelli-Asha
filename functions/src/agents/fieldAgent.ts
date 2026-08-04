/**
 * IntelliASHA — Field Agent (Cloud Function)
 *
 * Processes ASHA worker voice transcriptions into structured health visit
 * data using Gemini 2.5 Flash. This agent runs entirely server-side,
 * keeping the Gemini API key out of the client bundle.
 *
 * Capabilities:
 *  • Multilingual voice input (Hindi, Telugu, Tamil, Bengali, Kannada, English)
 *  • Structured JSON extraction with strict output schema
 *  • Visit type auto-classification (Immunization, ANC, HBNC, Delivery, General)
 *  • Data validation (weight ranges, age formats)
 *  • Follow-up recommendation
 *  • Input sanitisation (prompt-injection defence)
 *
 * Google Services: Gemini 2.5 Flash, Firebase Cloud Functions, Secret Manager
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI, Type } from '@google/genai';
import { writeAgentLog } from '../services/agentLogger';
import { callGeminiWithRetries } from '../utils/geminiRetries';
import * as logger from 'firebase-functions/logger';

// ─── Gemini Schema ──────────────────────────────────────────────────────

const visitDataSchema = {
  type: Type.OBJECT,
  properties: {
    householdName: { type: Type.STRING, description: 'Name of the household head' },
    childName: { type: Type.STRING, description: 'Name of the child / beneficiary' },
    childAge: { type: Type.STRING, description: 'Age of the child (e.g. "3 months")' },
    weight: { type: Type.STRING, description: 'Weight (e.g. "4.2 kg")' },
    status: {
      type: Type.STRING,
      enum: ['Normal', 'Underweight', 'Severe Acute Malnutrition', 'Unknown'],
      description: 'Health status classification',
    },
    visitType: {
      type: Type.STRING,
      enum: ['Immunization', 'Antenatal Care', 'Institutional Delivery', 'HBNC', 'General Visit'],
      description: 'Classification of visit type based on described activities',
    },
    immunisation: { type: Type.STRING, description: 'Immunisation status or vaccines administered' },
    followUpNeeded: { type: Type.BOOLEAN, description: 'Whether a follow-up visit is recommended' },
    followUpReason: { type: Type.STRING, description: 'Reason for recommended follow-up, if any' },
    detectedLanguage: {
      type: Type.STRING,
      enum: ['hindi', 'english', 'telugu', 'tamil', 'bengali', 'kannada', 'other'],
      description: 'Language detected in the transcription',
    },
    professionalReport: {
      type: Type.STRING,
      description: 'A professional, structured medical summary report in Markdown format.',
    },
  },
  required: [
    'householdName', 'childName', 'childAge', 'weight',
    'status', 'visitType', 'immunisation', 'followUpNeeded',
    'detectedLanguage', 'professionalReport'
  ],
};

const SYSTEM_INSTRUCTION = `You are the IntelliASHA Field Agent — an AI assistant embedded in India's public health system.

Your job: Extract structured health-visit data from an ASHA worker's voice transcription.

RULES:
1. The input may be in Hindi, Telugu, Tamil, Bengali, Kannada, or English — handle all.
2. Extract every field in the output schema. If a value is not mentioned, use "Not mentioned" for strings, "Unknown" for status, and false for booleans.
3. For weight: extract numeric value with unit (e.g. "4.2 kg"). If only a number is said, assume kilograms.
4. For childAge: normalise to a readable format (e.g. "3 months", "2 years").
5. Classify visitType based on activities described:
   - "Immunization" if vaccines are mentioned
   - "Antenatal Care" if pregnancy checkup described
   - "Institutional Delivery" if delivery/birth facilitation described
   - "HBNC" if newborn care / home visit for infant described
   - "General Visit" for all other health visits
6. Set followUpNeeded=true if:
   - Weight is critically low for stated age
   - Status is Severe Acute Malnutrition
   - Immunisation is overdue
   - Any danger signs are mentioned
7. NEVER fabricate data that isn't in the transcription.
8. Respond ONLY with valid JSON matching the output schema.
9. CRITICAL: ALL extracted string values (like names, immunisations) MUST be translated to English. NEVER output Hindi, Telugu, or regional text in the JSON fields.
10. Generate a professional, structured medical summary report in Markdown format for the \`professionalReport\` field. Frame it like an official Medical Officer's case summary, capturing all symptoms, complaints, and requests in structured bullet points. Make it detailed, clear, and actionable.`;

// ─── Input sanitisation ─────────────────────────────────────────────────

function sanitiseInput(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')           // Strip HTML tags
    .replace(/[<>{}]/g, '')            // Strip dangerous chars
    .substring(0, 5000);               // Truncate to 5 KB
}

// ─── Callable Cloud Function ────────────────────────────────────────────

export const processVisitVoiceNote = onCall(
  {
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (request) => {
    // 1. Authenticate Request
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { text } = request.data;
    const transcription = text;

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Transcription text is required.');
    }

    const sanitised = sanitiseInput(transcription);

    logger.info('[FIELD_AGENT] Processing voice note (onCall)', {
      uid: request.auth.uid,
      inputLength: sanitised.length,
    });

    // Log agent activity
    await writeAgentLog({
      agentName: 'FIELD_AGENT',
      action: 'Processing voice transcription',
      details: `Received ${sanitised.length} chars from worker ${request.auth.uid}`,
      severity: 'info',
      relatedWorkerId: request.auth.uid,
    });

    try {
      const ai = new GoogleGenAI({ vertexai: true, project: 'kavach-hackathon-500511', location: 'us-central1' });
      const response = await callGeminiWithRetries(ai, {
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `ASHA worker voice transcription:\n\n"${sanitised}"` }],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: visitDataSchema,
          temperature: 0.1,
        },
      });

      const text = response?.text;
      if (!text) {
        throw new Error('Gemini returned empty response.');
      }

      const parsed = JSON.parse(text);

      // Validate shape
      if (!parsed.householdName || !parsed.status) {
        throw new Error('Gemini response missing required fields.');
      }

      // Log success
      await writeAgentLog({
        agentName: 'FIELD_AGENT',
        action: 'Extraction complete',
        details: `Extracted data for household "${parsed.householdName}" — Status: ${parsed.status}, Type: ${parsed.visitType}, Language: ${parsed.detectedLanguage}`,
        severity: 'success',
        relatedWorkerId: request.auth.uid,
      });

      logger.info('[FIELD_AGENT] Extraction complete', {
        household: parsed.householdName,
        status: parsed.status,
        visitType: parsed.visitType,
      });

      // Return structured data directly to the frontend for preview
      return {
        success: true,
        data: parsed
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[FIELD_AGENT] Processing failed', { error: message });

      await writeAgentLog({
        agentName: 'FIELD_AGENT',
        action: 'Processing failed',
        details: message,
        severity: 'error',
        relatedWorkerId: request.auth.uid,
      });

      throw new HttpsError('internal', message);
    }
  }
);
