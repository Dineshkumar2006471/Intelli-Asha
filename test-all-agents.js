import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASqsinqeZPGXrl1rdAJYlshxP_1G2o5ek",
  authDomain: "kavach-hackathon-500511.firebaseapp.com",
  projectId: "kavach-hackathon-500511",
  storageBucket: "kavach-hackathon-500511.firebasestorage.app",
  messagingSenderId: "97454001548",
  appId: "1:97454001548:web:0b68d20e737fef257d1aa9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'asia-south1');
const processVisitVoiceNote = httpsCallable(functions, 'processVisitVoiceNote');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2ETest() {
  console.log("==========================================");
  console.log("INTELLIASHA: 5-AGENT END-TO-END TEST");
  console.log("==========================================");

  try {
    console.log("[1/5] Authenticating test worker...");
    await signInAnonymously(auth);
    const workerId = auth.currentUser.uid;
    console.log("✅ Worker authenticated:", workerId);

    console.log("\n[2/5] Triggering Field Agent (processVisitVoiceNote)...");
    const rawTranscript = "विजेटेड विष्णु हाउसहोल्ड। हिस चिल्ड्रन! शिव 3 ईयर ओल्ड 2 केजी वेट।";
    const result = await processVisitVoiceNote({ text: rawTranscript });
    
    if (!result.data.success) throw new Error("Field agent failed");
    console.log("✅ Field Agent extracted data:", result.data.data);

    console.log("\n[3/5] Saving to Firestore (Triggering Verification, Triage, Analytics)...");
    const visitRef = await addDoc(collection(db, "visits"), {
      ...result.data.data,
      workerId,
      rawTranscription: rawTranscript,
      timestamp: serverTimestamp(),
      locationName: "Test District E2E"
    });
    console.log("✅ Visit saved. ID:", visitRef.id);

    console.log("\nWaiting 15 seconds for background AI Agents to process...");
    await sleep(15000);

    console.log("\n[4/5] Checking Verification Agent results...");
    const visitDoc = await getDoc(visitRef);
    const visitData = visitDoc.data();
    if (visitData.verificationConfidence) {
      console.log("✅ Verification Agent succeeded!");
      console.log("   Confidence:", visitData.verificationConfidence);
      console.log("   Anomalies:", visitData.anomaliesFound);
      console.log("   Reasoning:", visitData.verificationReasoning);
    } else {
      console.log("❌ Verification Agent did not write to document.");
    }

    console.log("\n[5/5] Checking Analytics Agent results...");
    const analyticsDoc = await getDoc(doc(db, "analytics", "Hyderabad")); // currently hardcoded
    if (analyticsDoc.exists()) {
      console.log("✅ Analytics Agent succeeded!");
      console.log("   Generated AI Brief:");
      console.log(analyticsDoc.data().aiBrief);
    } else {
      console.log("❌ Analytics Agent did not generate dashboard.");
    }

    console.log("\n[Bonus] Checking Alert Agent results (if anomalies were found)...");
    const alertsQuery = query(collection(db, "tasks"), where("visitId", "==", visitRef.id));
    const alertsSnap = await getDocs(alertsQuery);
    if (!alertsSnap.empty) {
      console.log("✅ Alert Agent triggered!");
      console.log("   Task created:", alertsSnap.docs[0].data());
    } else {
      console.log("ℹ️ No alerts created (either no anomalies or agent failed).");
    }

    console.log("\n==========================================");
    console.log("TEST COMPLETE");
    console.log("==========================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ E2E TEST FAILED:", error);
    process.exit(1);
  }
}

runE2ETest();
