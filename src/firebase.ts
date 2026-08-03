import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
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

export const app = initializeApp(firebaseConfig);

/**
 * Firestore with persistent local cache for offline support in rural areas.
 * Uses the modern `persistentLocalCache` API (replaces deprecated `enableIndexedDbPersistence`).
 * Multi-tab persistence is enabled by default for safe concurrent usage.
 * Uses memoryLocalCache during tests to prevent hanging in CI environments.
 */
export const db = initializeFirestore(app, {
  localCache: import.meta.env.MODE === 'test' 
    ? memoryLocalCache() 
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const auth = getAuth(app);
export const functions = getFunctions(app, 'asia-south1');
export const storage = getStorage(app);

// Messaging is only supported in context with a secure origin (HTTPS/localhost)
export const messaging = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};

log.info('Firebase initialized with persistent offline cache');
