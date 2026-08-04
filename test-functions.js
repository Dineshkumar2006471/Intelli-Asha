import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth, signInAnonymously } from "firebase/auth";

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
const functions = getFunctions(app, 'asia-south1');
const processVisitVoiceNote = httpsCallable(functions, 'processVisitVoiceNote');

async function test() {
  try {
    console.log("Signing in anonymously...");
    await signInAnonymously(auth);
    console.log("Logged in:", auth.currentUser.uid);
    
    const rawTranscript = "विजेटेड विष्णु हाउसहोल्ड। हिस चिल्ड्रन! शिव 3 ईयर ओल्ड 2 केजी वेट।";
    console.log("Calling processVisitVoiceNote...");
    const result = await processVisitVoiceNote({ text: rawTranscript });
    console.log("Result:", JSON.stringify(result.data, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error calling function:");
    console.error(error);
    process.exit(1);
  }
}

test();
