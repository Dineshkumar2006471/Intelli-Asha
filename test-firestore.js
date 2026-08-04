import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASqsinqeZPGXrl1rdAJYlshxP_1G2o5ek",
  authDomain: "kavach-hackathon-500511.firebaseapp.com",
  projectId: "kavach-hackathon-500511",
  storageBucket: "kavach-hackathon-500511.firebasestorage.app",
  messagingSenderId: "97454001548",
  appId: "1:97454001548:web:0b68d20e737fef257d1aa9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const hyderabadDoc = await getDoc(doc(db, "analytics", "Hyderabad"));
  console.log("Hyderabad:", hyderabadDoc.data());
  
  const kottapalleDoc = await getDoc(doc(db, "analytics", "Kottapalle"));
  console.log("Kottapalle:", kottapalleDoc.data());
}

test().catch(console.error);
