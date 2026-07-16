import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { createLogger } from './utils/logger';

const log = createLogger('FIREBASE');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Enable offline persistence for rural areas with poor connectivity
enableIndexedDbPersistence(db).catch((err: { code: string }) => {
  if (err.code === 'failed-precondition') {
    log.warn('Multiple tabs open — persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    log.warn('This browser does not support IndexedDB persistence.');
  }
});
