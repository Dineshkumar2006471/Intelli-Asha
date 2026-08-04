import admin from 'firebase-admin';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth, signInAnonymously } from "firebase/auth";
import { initializeApp } from "firebase/app";

// Initialize Client App to trigger HTTPS callable (Field Agent)
const firebaseConfig = {
  apiKey: "AIzaSyASqsinqeZPGXrl1rdAJYlshxP_1G2o5ek",
  authDomain: "kavach-hackathon-500511.firebaseapp.com",
  projectId: "kavach-hackathon-500511",
  storageBucket: "kavach-hackathon-500511.firebasestorage.app",
  messagingSenderId: "97454001548",
  appId: "1:97454001548:web:0b68d20e737fef257d1aa9"
};
const clientApp = initializeApp(firebaseConfig);
const auth = getAuth(clientApp);
const functions = getFunctions(clientApp, 'asia-south1');
const processVisitVoiceNote = httpsCallable(functions, 'processVisitVoiceNote');

// Initialize Admin App to bypass Firestore rules and check background agents
admin.initializeApp({
  projectId: "kavach-hackathon-500511"
});
const db = admin.firestore();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runComprehensiveAudit() {
  console.log("==================================================");
  console.log("INTELLIASHA: 120% BRUTAL HONEST COMPREHENSIVE AUDIT");
  console.log("==================================================");

  try {
    console.log("\n[STAGE 1] Client Authentication...");
    await signInAnonymously(auth);
    const workerId = auth.currentUser.uid;
    console.log("✅ Worker Authenticated (Client SDK):", workerId);

    console.log("\n[STAGE 2] Field Agent (processVisitVoiceNote) via Gemini...");
    // Intentional anomaly: 1 year old, 25 kg (impossible weight)
    const rawTranscript = "Visited Sharma household. Child Rahul is 1 year old and weighs 25 kg. He has a severe fever.";
    console.log("   Input Text:", rawTranscript);
    
    let result;
    try {
      result = await processVisitVoiceNote({ text: rawTranscript });
      console.log("✅ Field Agent Extracted JSON:");
      console.log(JSON.stringify(result.data.data, null, 2));
    } catch (err) {
      console.error("❌ Field Agent Failed:", err.message);
      throw err;
    }

    console.log("\n[STAGE 3] Firestore Ingestion (Triggers Background Agents)...");
    const testLocation = `Test District ${Date.now()}`;
    const visitRef = await db.collection("visits").add({
      ...result.data.data,
      workerId,
      rawTranscription: rawTranscript,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      locationName: testLocation
    });
    console.log("✅ Visit Saved to Firestore. ID:", visitRef.id);
    console.log("   Location Name passed:", testLocation);

    console.log("\n⏳ Waiting 15 seconds for Verification, Triage, Analytics, and Alert Agents to run...");
    await sleep(15000);

    console.log("\n[STAGE 4] Verification Agent Audit...");
    const visitDoc = await visitRef.get();
    const visitData = visitDoc.data();
    if (visitData.verificationConfidence !== undefined) {
      console.log("✅ Verification Agent Executed.");
      console.log("   Confidence Score:", visitData.verificationConfidence);
      console.log("   Anomalies Detected:", visitData.anomaliesFound);
      console.log("   Reasoning:", visitData.verificationReasoning || "None");
      if (!visitData.anomaliesFound) {
         console.warn("⚠️ Warning: Verification Agent missed the 25kg 1-year-old anomaly.");
      }
    } else {
      console.error("❌ Verification Agent FAILED to write to visit document.");
    }

    console.log("\n[STAGE 5] Analytics Agent Audit...");
    const analyticsDoc = await db.collection("analytics").doc(testLocation).get();
    if (analyticsDoc.exists) {
      console.log("✅ Analytics Agent Executed.");
      console.log("   Target Document:", testLocation);
      const data = analyticsDoc.data();
      console.log("   AI Brief Anomaly:", data.aiBrief?.anomaly);
      console.log("   AI Brief Recommendation:", data.aiBrief?.recommendation);
    } else {
      console.error("❌ Analytics Agent FAILED. Document", testLocation, "not found.");
    }

    console.log("\n[STAGE 6] Alert Agent Audit...");
    const tasksQuery = await db.collection("tasks").where("visitId", "==", visitRef.id).get();
    if (!tasksQuery.empty) {
      console.log("✅ Alert Agent Executed.");
      const task = tasksQuery.docs[0].data();
      console.log("   Alert Created! Priority:", task.priority);
      console.log("   Alert Description:", task.description);
    } else {
      if (visitData.anomaliesFound) {
        console.error("❌ Alert Agent FAILED. No task created despite anomaly being true.");
      } else {
        console.log("ℹ️ Alert Agent skipped (no anomaly detected).");
      }
    }

    console.log("\n[STAGE 7] Triage Agent Audit...");
    const triageQuery = await db.collection("triaged_visits").where("visitId", "==", visitRef.id).get();
    if (!triageQuery.empty) {
      console.log("✅ Triage Agent Executed.");
      const triage = triageQuery.docs[0].data();
      console.log("   Priority Score:", triage.priorityScore);
      console.log("   Reason:", triage.reason);
    } else {
      console.log("ℹ️ Triage Agent either failed or didn't prioritize this visit.");
    }

    console.log("\n==================================================");
    console.log("AUDIT COMPLETE");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ AUDIT FATAL ERROR:", error);
    process.exit(1);
  }
}

runComprehensiveAudit();
