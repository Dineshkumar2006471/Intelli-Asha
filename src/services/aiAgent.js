import { GoogleGenAI } from '@google/genai';

// In a real application, Vertex AI requests should ideally be routed through a secure backend or Firebase Cloud Functions
// to protect the API credentials. For this prototype, we'll initialize the client using the environment variable.
const ai = new GoogleGenAI({
  // Fallback to import.meta.env for Vite environment variables
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function processVisitVoiceNote(transcription, attempt = 1) {
  try {
    // Sanitize transcription to prevent basic prompt injection
    const sanitizedInput = transcription.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const prompt = `
      You are an AI assistant helping a health worker (ASHA) log a household visit in rural India.
      Extract the structured data from the transcription.
      
      Transcription: "${sanitizedInput}"
      
      Rule: Flag anomaliesFound=true if weight is extremely abnormal for the age, or if there is mention of fever/danger signs.
    `;

    // Using the recommended enterprise flash model for high-speed tasks with strict schema
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: "OBJECT",
          properties: {
            householdName: { type: "STRING", nullable: true },
            childName: { type: "STRING", nullable: true },
            childAge: { type: "STRING", nullable: true },
            weight: { type: "STRING", nullable: true },
            status: { type: "STRING", enum: ["Normal", "Underweight", "Severe Acute Malnutrition", "Unknown"] },
            visitType: { type: "STRING" },
            immunisation: { type: "STRING", nullable: true },
            anomaliesFound: { type: "BOOLEAN" },
            anomalyReason: { type: "STRING", nullable: true }
          },
          required: ["householdName", "status", "visitType", "anomaliesFound"]
        }
      }
    });

    const resultText = response.text;
    const parsedData = JSON.parse(resultText);
    
    // Fallback normalization in case of missing optional fields
    return {
      householdName: parsedData.householdName || 'Unknown',
      childName: parsedData.childName || '-',
      childAge: parsedData.childAge || '-',
      weight: parsedData.weight || '-',
      status: parsedData.status || 'Unknown',
      visitType: parsedData.visitType || 'General Visit',
      immunisation: parsedData.immunisation || '-',
      anomaliesFound: !!parsedData.anomaliesFound,
      anomalyReason: parsedData.anomalyReason || ''
    };
  } catch (error) {
    console.error(`Gemini API Error (Attempt ${attempt}):`, error);
    if (attempt < RETRY_COUNT) {
      await delay(RETRY_DELAY_MS * attempt);
      return processVisitVoiceNote(transcription, attempt + 1);
    }
    throw new Error(`Real-time AI Processing Failed after ${RETRY_COUNT} attempts. Check your network or API quota.`);
  }
}

export async function generateFullDashboardData(locationName) {
  try {
    const prompt = `
      You are the IntelliASHA Analytics Agent. The user is viewing the District Health Office dashboard for ${locationName}.
      Generate a realistic, localized data payload for this specific location.
      
      Requirements:
      1. AI Brief: 
         - anomaly: a localized anomaly based on real recent news or weather in ${locationName}.
         - recommendation: action for the DHO based on the anomaly.
         - alert: mentioning a realistic number of high-risk cases for the region.
      2. Metrics (CRITICAL: DO NOT COPY THE EXAMPLE NUMBERS. YOU MUST GENERATE UNIQUE, PLAUSIBLE NUMBERS BASED ON THE POPULATION OF ${locationName}):
         - total_ashas: realistic number (e.g., between 500 and 8000)
         - total_beneficiaries: realistic number (e.g., between 10000 and 900000)
         - surveys_completed: realistic number (less than beneficiaries)
         - high_risk_cases: realistic number (e.g., between 50 and 2000)
         - data_quality_score: realistic percentage (e.g., between 82 and 98)
         - disbursement_ready: realistic currency amount (e.g., between 1000000 and 9000000)
      3. PHC Breakdown (array of exactly 4 Primary Health Centers/Community Health Centers localized to ${locationName}):
         - Each object should have: name (e.g., "Main ${locationName} PHC" or actual local names if known), block, active_ashas, surveys_wtd, status ("Optimal", "Delayed", or "Critical"), readiness (percentage string like "98%").

      Output ONLY a valid JSON object in exactly this format (do not use these exact numbers, generate your own):
      {
        "aiBrief": { "anomaly": "...", "recommendation": "...", "alert": "..." },
        "metrics": {
          "total_ashas": 1500,
          "total_beneficiaries": 50000,
          "surveys_completed": 15000,
          "high_risk_cases": 400,
          "data_quality_score": 90,
          "disbursement_ready": 5000000
        },
        "phcs": [
          { "name": "...", "block": "...", "active_ashas": 112, "surveys_wtd": 1450, "status": "Optimal", "readiness": "98%" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }]
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating dashboard data:", error);
    // Fallback data if API key fails or is blocked
    const randomAshas = Math.floor(Math.random() * (5000 - 800 + 1)) + 800;
    const randomBeneficiaries = randomAshas * Math.floor(Math.random() * (50 - 20 + 1) + 20);
    const randomSurveys = Math.floor(randomBeneficiaries * (Math.random() * (0.8 - 0.2) + 0.2));
    const randomHighRisk = Math.floor(randomSurveys * (Math.random() * (0.1 - 0.01) + 0.01));
    const randomQuality = Math.floor(Math.random() * (98 - 75 + 1)) + 75;
    const randomDisbursement = Math.floor(Math.random() * (9000000 - 1000000 + 1)) + 1000000;

    return {
      aiBrief: {
        anomaly: `Anomaly Detected: Minor uptick in respiratory issues reported in ${locationName} clinics today.`,
        recommendation: `Recommendation: Ensure field workers in ${locationName} have updated protocols.`,
        alert: `Alert: ${randomHighRisk} potential high-risk cases identified awaiting verification in ${locationName}.`
      },
      metrics: {
        total_ashas: randomAshas, 
        total_beneficiaries: randomBeneficiaries, 
        surveys_completed: randomSurveys, 
        high_risk_cases: randomHighRisk, 
        data_quality_score: randomQuality, 
        disbursement_ready: randomDisbursement
      },
      phcs: [
        { name: `Central ${locationName} CHC`, block: "Central", active_ashas: Math.floor(randomAshas * 0.3), surveys_wtd: Math.floor(randomSurveys * 0.3), status: "Optimal", readiness: "98%" },
        { name: `North ${locationName} PHC`, block: "North", active_ashas: Math.floor(randomAshas * 0.2), surveys_wtd: Math.floor(randomSurveys * 0.15), status: "Delayed", readiness: "72%" },
        { name: `South ${locationName} PHC`, block: "South", active_ashas: Math.floor(randomAshas * 0.25), surveys_wtd: Math.floor(randomSurveys * 0.25), status: "Optimal", readiness: "95%" },
        { name: `East ${locationName} PHC`, block: "East", active_ashas: Math.floor(randomAshas * 0.25), surveys_wtd: Math.floor(randomSurveys * 0.3), status: "Critical", readiness: "54%" }
      ]
    };
  }
}
