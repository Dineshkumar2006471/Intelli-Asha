/**
 * IntelliASHA — Agent Logger
 *
 * Shared utility used by all 5 agents to write structured activity logs
 * to the `agent_logs` Firestore collection. These logs power the real-time
 * Agentic Orchestration Terminal on the Supervisor Dashboard.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export type AgentName =
  | 'FIELD_AGENT'
  | 'VERIFICATION_AGENT'
  | 'ALERT_AGENT'
  | 'ANALYTICS_AGENT'
  | 'INCENTIVE_AGENT'
  | 'A2A_ROUTER'
  | 'MCP_SERVER';

export type LogSeverity = 'info' | 'warning' | 'error' | 'success';

export interface AgentLogEntry {
  agentName: AgentName;
  action: string;
  details: string;
  severity: LogSeverity;
  timestamp: FieldValue;
  relatedVisitId?: string;
  relatedWorkerId?: string;
}

/**
 * Write an activity entry to `agent_logs`.
 * All agents call this to produce observable, real-time telemetry.
 */
export async function writeAgentLog(
  entry: Omit<AgentLogEntry, 'timestamp'>
): Promise<string> {
  const db = getFirestore();
  const doc = await db.collection('agent_logs').add({
    ...entry,
    timestamp: FieldValue.serverTimestamp(),
  });
  return doc.id;
}
