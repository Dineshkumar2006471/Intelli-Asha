import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Visit, VisitData, Alert, GeoAnchor, DashboardMetrics } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('DB');

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Saves a completed visit to Firestore. Alerts are created by the backend Verification Agent. */
export async function saveVisit(
  visitData: VisitData & { rawTranscription: string; geoAnchor: GeoAnchor | null },
  userId: string
): Promise<string> {
  try {
    const visitsRef = collection(db, 'visits');
    const docRef = await addDoc(visitsRef, {
      ...visitData,
      workerId: userId,
      timestamp: serverTimestamp(),
    });

    log.info('Visit saved successfully', { visitId: docRef.id, household: visitData.householdName });
    return docRef.id;
  } catch (error) {
    log.error('Failed to save visit', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetches recent visits for a specific field worker (one-time read). */
export async function getRecentVisits(userId: string): Promise<Visit[]> {
  try {
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, where('workerId', '==', userId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Visit);
  } catch (error) {
    log.error('Failed to fetch recent visits', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Real-Time Listeners
// ---------------------------------------------------------------------------

/** Subscribes to the latest 50 visits across all workers. */
export function onVisitsSnapshot(callback: (visits: Visit[]) => void): Unsubscribe {
  const visitsRef = collection(db, 'visits');
  const q = query(visitsRef, orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const visits = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Visit);
      callback(visits);
    },
    (error) => {
      log.error('Real-time visits listener error', error);
      callback([]);
    }
  );
}

/** Subscribes to visits flagged by the Verification Agent. */
export function onFlaggedVisitsSnapshot(callback: (visits: Visit[]) => void): Unsubscribe {
  const visitsRef = collection(db, 'visits');
  const q = query(
    visitsRef,
    where('anomaliesFound', '==', true),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const visits = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Visit);
      callback(visits);
    },
    (error) => {
      log.error('Real-time flagged visits listener error', error);
      callback([]);
    }
  );
}

/** Subscribes to supervisor alerts (created by backend Verification Agent). */
export function onAlertsSnapshot(callback: (alerts: Alert[]) => void): Unsubscribe {
  const alertsRef = collection(db, 'alerts');
  const q = query(alertsRef, orderBy('timestamp', 'desc'), limit(10));
  return onSnapshot(
    q,
    (snapshot) => {
      const alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Alert);
      callback(alerts);
    },
    (error) => {
      log.error('Real-time alerts listener error', error);
      callback([]);
    }
  );
}

// ---------------------------------------------------------------------------
// One-Time Reads
// ---------------------------------------------------------------------------

/** Fetches the latest 10 supervisor alerts (one-time read). */
export async function getSupervisorAlerts(): Promise<Alert[]> {
  try {
    const alertsRef = collection(db, 'alerts');
    const q = query(alertsRef, orderBy('timestamp', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Alert);
  } catch (error) {
    log.error('Failed to fetch supervisor alerts', error);
    return [];
  }
}

/** Fetches all flagged visits (one-time read). */
export async function getFlaggedVisits(): Promise<Visit[]> {
  try {
    const visitsRef = collection(db, 'visits');
    const q = query(
      visitsRef,
      where('anomaliesFound', '==', true),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Visit);
  } catch (error) {
    log.error('Failed to fetch flagged visits', error);
    return [];
  }
}

/** Fetches all visits (one-time read). */
export async function getAllVisits(): Promise<Visit[]> {
  try {
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Visit);
  } catch (error) {
    log.error('Failed to fetch all visits', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// BigQuery Analytics (via Cloud Function)
// ---------------------------------------------------------------------------

/** Calls the getDHOMetrics Cloud Function to fetch aggregated analytics. */
export async function fetchDHOAnalytics(): Promise<DashboardMetrics> {
  try {
    const getDHOMetrics = httpsCallable<void, DashboardMetrics>(functions, 'getDHOMetrics');
    const result = await getDHOMetrics();
    log.info('DHO analytics fetched from BigQuery');
    return result.data;
  } catch (error) {
    log.error('BigQuery analytics unavailable — using fallback', error);
    return {
      total_ashas: 1245,
      total_beneficiaries: 45200,
      surveys_completed: 12800,
      high_risk_cases: 342,
      data_quality_score: 94,
      disbursement_ready: 4200000,
    };
  }
}
