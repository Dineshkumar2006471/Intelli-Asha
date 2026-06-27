import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyASqsinqeZPGXrl1rdAJYlshxP_1G2o5ek",
  authDomain: "kavach-hackathon-500511.firebaseapp.com",
  projectId: "kavach-hackathon-500511",
  storageBucket: "kavach-hackathon-500511.firebasestorage.app",
  messagingSenderId: "97454001548",
  appId: "1:97454001548:web:0b68d20e737fef257d1aa9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
