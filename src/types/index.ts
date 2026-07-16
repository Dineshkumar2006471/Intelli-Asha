/**
 * IntelliASHA — Shared Type Definitions
 *
 * Central type registry for all data structures used across the frontend.
 * Ensures consistency between Firestore documents, AI responses, and UI components.
 */

import type { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Geo-Location
// ---------------------------------------------------------------------------

/** GPS coordinates captured silently from the ASHA worker's device. */
export interface GeoAnchor {
  lat: number;
  lng: number;
  /** Accuracy in metres reported by the Geolocation API. */
  accuracy: number;
}

// ---------------------------------------------------------------------------
// Visits
// ---------------------------------------------------------------------------

/** Health status classification assigned by the Field Agent. */
export type HealthStatus =
  | 'Normal'
  | 'Underweight'
  | 'Severe Acute Malnutrition'
  | 'Unknown';

/** Structured data extracted from an ASHA worker's voice transcription. */
export interface VisitData {
  householdName: string;
  childName: string;
  childAge: string;
  weight: string;
  status: HealthStatus;
  visitType: string;
  immunisation: string;
}

/** A visit document as stored in the `visits` Firestore collection. */
export interface Visit extends VisitData {
  id: string;
  workerId: string;
  rawTranscription: string;
  geoAnchor: GeoAnchor | null;
  timestamp: Timestamp | null;
  /** Fields populated by the backend Verification Agent. */
  anomaliesFound?: boolean;
  flaggedReason?: string;
  verificationConfidence?: number;
  verifiedAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

/** Severity levels for supervisor alerts. */
export type AlertSeverity = 'high' | 'medium' | 'low';

/** An alert document as stored in the `alerts` Firestore collection. */
export interface Alert {
  id: string;
  title: string;
  severity: AlertSeverity;
  message: string;
  visitId: string;
  workerId: string;
  householdName: string;
  timestamp: Timestamp | null;
  status: 'unread' | 'read' | 'dismissed';
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

/** A worker profile document in the `workers` Firestore collection. */
export interface WorkerProfile {
  name: string;
  phone: string;
  location: string;
  lastActive: string;
  role?: string;
}

// ---------------------------------------------------------------------------
// DHO Dashboard
// ---------------------------------------------------------------------------

/** AI-generated health intelligence brief for the DHO dashboard. */
export interface AIBrief {
  anomaly: string;
  recommendation: string;
  alert: string;
}

/** Key performance metrics for a district. */
export interface DashboardMetrics {
  total_ashas: number;
  total_beneficiaries: number;
  surveys_completed: number;
  high_risk_cases: number;
  data_quality_score: number;
  disbursement_ready: number;
}

/** Status of a Primary Health Center. */
export type PHCStatus = 'Optimal' | 'Delayed' | 'Critical';

/** A Primary Health Center breakdown row. */
export interface PHCBreakdown {
  name: string;
  block: string;
  active_ashas: number;
  surveys_wtd: number;
  status: PHCStatus;
  readiness: string;
}

/** Full dashboard payload returned by the Analytics Agent. */
export interface DashboardData {
  aiBrief: AIBrief;
  metrics: DashboardMetrics;
  phcs: PHCBreakdown[];
}
