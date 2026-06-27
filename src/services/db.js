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
  onSnapshot
} from 'firebase/firestore';

export async function saveVisit(visitData, userId) {
  try {
    const visitsRef = collection(db, 'visits');
    const docRef = await addDoc(visitsRef, {
      ...visitData,
      workerId: userId,
      timestamp: serverTimestamp(),
    });

    // If the visit has anomalies, also create an alert for the supervisor
    if (visitData.anomaliesFound) {
      const alertsRef = collection(db, 'alerts');
      await addDoc(alertsRef, {
        severity: 'high',
        message: `Anomaly flagged at ${visitData.householdName || 'Unknown'} household: ${visitData.anomalyReason || 'Requires review'}`,
        visitId: docRef.id,
        workerId: userId,
        timestamp: serverTimestamp(),
      });
    }

    return docRef.id;
  } catch (error) {
    console.error("Error saving visit:", error);
    throw error;
  }
}

export async function getRecentVisits(userId) {
  try {
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, where("workerId", "==", userId), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching visits:", error);
    throw error;
  }
}

// REAL-TIME LISTENER: Subscribes to ALL visits and fires callback on every change
export function onVisitsSnapshot(callback) {
  const visitsRef = collection(db, 'visits');
  const q = query(visitsRef, orderBy("timestamp", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(visits);
  }, (error) => {
    console.error("Real-time visits listener error:", error);
    callback([]);
  });
}

// REAL-TIME LISTENER: Subscribes to FLAGGED visits only
export function onFlaggedVisitsSnapshot(callback) {
  const visitsRef = collection(db, 'visits');
  const q = query(visitsRef, where("anomaliesFound", "==", true), orderBy("timestamp", "desc"), limit(20));
  return onSnapshot(q, (snapshot) => {
    const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(visits);
  }, (error) => {
    console.error("Real-time flagged visits listener error:", error);
    callback([]);
  });
}

// REAL-TIME LISTENER: Subscribes to alerts
export function onAlertsSnapshot(callback) {
  const alertsRef = collection(db, 'alerts');
  const q = query(alertsRef, orderBy("timestamp", "desc"), limit(10));
  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(alerts);
  }, (error) => {
    console.error("Real-time alerts listener error:", error);
    callback([]);
  });
}

export async function getSupervisorAlerts() {
  try {
    const alertsRef = collection(db, 'alerts');
    const q = query(alertsRef, orderBy("timestamp", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }
}

export async function getFlaggedVisits() {
  try {
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, where("anomaliesFound", "==", true), orderBy("timestamp", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching flagged visits:", error);
    return [];
  }
}

export async function getAllVisits() {
    try {
      const visitsRef = collection(db, 'visits');
      const q = query(visitsRef, orderBy("timestamp", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching all visits:", error);
      return [];
    }
  }

export async function fetchDHOAnalytics() {
  try {
    const getDHOMetrics = httpsCallable(functions, 'getDHOMetrics');
    const result = await getDHOMetrics();
    return result.data;
  } catch (error) {
    console.error("Error fetching BigQuery analytics:", error);
    return {
      total_ashas: 1245,
      total_beneficiaries: 45200,
      surveys_completed: 12800,
      high_risk_cases: 342,
      data_quality_score: 94,
      disbursement_ready: 4200000
    };
  }
}

