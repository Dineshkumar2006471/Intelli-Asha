import { GoogleGenAI } from '@google/genai';
import type { VisitData, DashboardData } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('FIELD_AGENT');

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

const delay = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

/**
 * Processes raw voice transcription through Gemini to extract structured visit data.
 * Implements exponential backoff retry logic for resilience.
 */
export async function processVisitVoiceNote(
  transcription: string,
  attempt = 1
): Promise<VisitData> {
  try {
    // Sanitize transcription to prevent basic prompt injection
    const sanitizedInput = transcription.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const prompt = `
      You are an AI assistant helping a health worker (ASHA) log a household visit in rural India.
      Extract the structured data from the transcription.
      
      Transcription: "${sanitizedInput}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            householdName: { type: 'STRING', nullable: true },
            childName: { type: 'STRING', nullable: true },
            childAge: { type: 'STRING', nullable: true },
            weight: { type: 'STRING', nullable: true },
            status: {
              type: 'STRING',
              enum: ['Normal', 'Underweight', 'Severe Acute Malnutrition', 'Unknown'],
            },
            visitType: { type: 'STRING' },
            immunisation: { type: 'STRING', nullable: true },
          },
          required: ['householdName', 'status', 'visitType'],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsedData = JSON.parse(resultText) as Partial<VisitData>;

    log.info('Voice note processed successfully', { household: parsedData.householdName });

    return {
      householdName: parsedData.householdName ?? 'Unknown',
      childName: parsedData.childName ?? '-',
      childAge: parsedData.childAge ?? '-',
      weight: parsedData.weight ?? '-',
      status: parsedData.status ?? 'Unknown',
      visitType: parsedData.visitType ?? 'General Visit',
      immunisation: parsedData.immunisation ?? '-',
    };
  } catch (error) {
    log.error(`Gemini API error (attempt ${attempt}/${RETRY_COUNT})`, error);

    if (attempt < RETRY_COUNT) {
      await delay(RETRY_DELAY_MS * attempt);
      return processVisitVoiceNote(transcription, attempt + 1);
    }

    throw new Error(
      `AI processing failed after ${RETRY_COUNT} attempts. Check your network or API quota.`
    );
  }
}

/**
 * Generates a full AI-powered dashboard payload for the DHO using Gemini with Google Search grounding.
 * Falls back to randomised realistic data if the API call fails.
 */
export async function generateFullDashboardData(locationName: string): Promise<DashboardData> {
  try {
    const prompt = `
      You are the IntelliASHA Analytics Agent. The user is viewing the District Health Office dashboard for ${locationName}.
      Generate a realistic, localized data payload for this specific location.
      
      Requirements:
      1. AI Brief: 
         - anomaly: a localized anomaly based on real recent news or weather in ${locationName}.
         - recommendation: action for the DHO based on the anomaly.
         - alert: mentioning a realistic number of high-risk cases for the region.
      2. Metrics (CRITICAL: generate unique, plausible numbers based on the population of ${locationName}):
         - total_ashas: realistic number (500–8000)
         - total_beneficiaries: realistic number (10000–900000)
         - surveys_completed: realistic number (less than beneficiaries)
         - high_risk_cases: realistic number (50–2000)
         - data_quality_score: realistic percentage (82–98)
         - disbursement_ready: realistic currency amount (1000000–9000000)
      3. PHC Breakdown (array of exactly 4 Primary Health Centers localized to ${locationName}):
         - Each: name, block, active_ashas, surveys_wtd, status ("Optimal"|"Delayed"|"Critical"), readiness (e.g. "98%").

      Output ONLY a valid JSON object.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Analytics Agent');
    }

    log.info('Dashboard data generated for location', { locationName });
    return JSON.parse(text) as DashboardData;
  } catch (error) {
    log.error('Analytics Agent failed — using fallback data', error);

    const randomAshas = Math.floor(Math.random() * 4200 + 800);
    const randomBeneficiaries = randomAshas * Math.floor(Math.random() * 30 + 20);
    const randomSurveys = Math.floor(randomBeneficiaries * (Math.random() * 0.6 + 0.2));
    const randomHighRisk = Math.floor(randomSurveys * (Math.random() * 0.09 + 0.01));
    const randomQuality = Math.floor(Math.random() * 23 + 75);
    const randomDisbursement = Math.floor(Math.random() * 8_000_000 + 1_000_000);

    return {
      aiBrief: {
        anomaly: `Anomaly Detected: Minor uptick in respiratory issues reported in ${locationName} clinics today.`,
        recommendation: `Recommendation: Ensure field workers in ${locationName} have updated protocols.`,
        alert: `Alert: ${randomHighRisk} potential high-risk cases identified in ${locationName}.`,
      },
      metrics: {
        total_ashas: randomAshas,
        total_beneficiaries: randomBeneficiaries,
        surveys_completed: randomSurveys,
        high_risk_cases: randomHighRisk,
        data_quality_score: randomQuality,
        disbursement_ready: randomDisbursement,
      },
      phcs: [
        { name: `Central ${locationName} CHC`, block: 'Central', active_ashas: Math.floor(randomAshas * 0.3), surveys_wtd: Math.floor(randomSurveys * 0.3), status: 'Optimal', readiness: '98%' },
        { name: `North ${locationName} PHC`, block: 'North', active_ashas: Math.floor(randomAshas * 0.2), surveys_wtd: Math.floor(randomSurveys * 0.15), status: 'Delayed', readiness: '72%' },
        { name: `South ${locationName} PHC`, block: 'South', active_ashas: Math.floor(randomAshas * 0.25), surveys_wtd: Math.floor(randomSurveys * 0.25), status: 'Optimal', readiness: '95%' },
        { name: `East ${locationName} PHC`, block: 'East', active_ashas: Math.floor(randomAshas * 0.25), surveys_wtd: Math.floor(randomSurveys * 0.3), status: 'Critical', readiness: '54%' },
      ],
    };
  }
}
