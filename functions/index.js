const { onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { BigQuery } = require('@google-cloud/bigquery');
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

admin.initializeApp();
const bigquery = new BigQuery();

// Initialize Gemini (Ensure GEMINI_API_KEY is available in the environment)
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

// Define BigQuery Dataset and Table (removed unused vars)
/**
 * Cloud Function to fetch District Health Officer (DHO) aggregated metrics from BigQuery.
 * This prevents the frontend from querying thousands of Firestore documents and keeps BQ secure.
 */
exports.getDHOMetrics = onCall(async (request) => {
  // Ensure user is authenticated
  if (!request.auth) {
    throw new Error("Unauthenticated request. You must be signed in.");
  }

  try {
    // In a real production app, we would query the synced tables.
    // E.g. SELECT count(*) FROM \`${DATASET_ID}.visits_raw\` WHERE ...
    // For this prototype, we'll run a query that aggregates mock data if the table isn't populated,
    // or run a basic query that simulates the expected return object.

    const query = `
      SELECT 
        1245 as total_ashas,
        45200 as total_beneficiaries,
        12800 as surveys_completed,
        342 as high_risk_cases,
        94 as data_quality_score,
        4200000 as disbursement_ready
    `;

    const options = {
      query: query,
      location: 'US', // Adjust based on your GCP project location
    };

    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);

    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    if (rows.length > 0) {
      return rows[0];
    } else {
      throw new Error("No data found in BigQuery.");
    }
  } catch (error) {
    console.error("Error executing BigQuery SQL:", error);
    throw new Error("Failed to fetch DHO metrics: " + error.message);
  }
});

/**
 * Autonomous Verification Agent
 * Triggered automatically when a new visit is added.
 * Calls Gemini to analyze the visit data for anomalies.
 */
exports.verificationAgent = onDocumentCreated("visits/{visitId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const visitData = snapshot.data();
  // Prevent infinite loops if we re-trigger on updates (though this is onCreate)
  if (visitData.anomaliesFound !== undefined) return;

  console.log(`[VERIFICATION AGENT] Analyzing new visit: ${event.params.visitId}`);

  const prompt = `
  You are the IntelliASHA Verification Agent.
  Analyze the following health visit data and identify if there are any anomalies, high-risk flags, or suspicious data points.
  Data: ${JSON.stringify(visitData)}
  
  Return a JSON object EXACTLY like this:
  {
    "flagged": true/false,
    "reason": "Short reason if flagged, or 'Verified automatically' if clean",
    "confidence": 95
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text);
    
    // Write verification result back to the visit
    await snapshot.ref.update({
      anomaliesFound: result.flagged,
      flaggedReason: result.reason,
      verificationConfidence: result.confidence,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // If flagged, generate a proactive alert for the supervisor
    if (result.flagged) {
      await admin.firestore().collection('alerts').add({
        visitId: event.params.visitId,
        workerId: visitData.workerId,
        householdName: visitData.householdName || 'Unknown Household',
        message: result.reason,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'unread',
        severity: 'high'
      });
    }

    console.log(`[VERIFICATION AGENT] Completed ${event.params.visitId}. Flagged: ${result.flagged}`);
  } catch (error) {
    console.error("[VERIFICATION AGENT] Error:", error);
  }
});
