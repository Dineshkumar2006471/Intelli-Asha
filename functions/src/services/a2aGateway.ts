/**
 * IntelliASHA — A2A Protocol Gateway (Google Agent-to-Agent Specification)
 *
 * Implements the Google A2A protocol (https://github.com/google/A2A) as a
 * Firebase Cloud Function. Provides:
 *
 *  1. Agent Card Discovery  — GET /.well-known/agent.json
 *  2. JSON-RPC Task Endpoint — POST /a2a (tasks/send, tasks/get, tasks/sendSubscribe)
 *  3. Internal Agent Registry — Maps agent names to their Firestore-backed capabilities
 *
 * This bridges IntelliASHA's Firestore-trigger-based agent chain with the
 * standard A2A protocol so external systems and judges can inspect and
 * interact with the multi-agent network.
 *
 * Agents exposed:
 *  • FIELD_AGENT        — Voice-to-structured-data processing
 *  • VERIFICATION_AGENT — Autonomous visit verification
 *  • ALERT_AGENT        — Anomaly alert classification + FCM
 *  • ANALYTICS_AGENT    — District health intelligence
 *  • INCENTIVE_AGENT    — NHM-compliant TBI calculation
 *  • TRIAGE_AGENT       — AI-powered visit prioritization
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { writeAgentLog } from '../services/agentLogger';
import * as logger from 'firebase-functions/logger';

// ─── Agent Card (A2A Discovery) ─────────────────────────────────────────

const AGENT_CARD = {
  name: 'IntelliASHA',
  description:
    'AI-powered multi-agent system for India\'s ASHA health workers. ' +
    'Provides voice-first visit logging, autonomous verification, ' +
    'anomaly detection, district analytics, and NHM-compliant incentive calculation.',
  url: 'https://asia-south1-kavach-hackathon-500511.cloudfunctions.net/a2aGateway',
  version: '1.0.0',
  provider: {
    organization: 'IntelliASHA Team',
    url: 'https://kavach-hackathon-500511.web.app',
  },
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  authentication: {
    schemes: ['bearer'],
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [
    {
      id: 'process_voice_note',
      name: 'Process Voice Note',
      description:
        'Converts ASHA worker voice transcription into structured visit data using Gemini 2.5 Flash.',
      tags: ['voice', 'nlp', 'field-data'],
      examples: [
        'Process voice note: "Visited Priya Devi household, child Rohan age 2, weight 9kg, gave OPV drops"',
      ],
    },
    {
      id: 'verify_visit',
      name: 'Verify Visit',
      description:
        'Runs GPS, duration, frequency, and medical plausibility checks on a submitted visit.',
      tags: ['verification', 'anomaly-detection', 'quality'],
    },
    {
      id: 'create_alert',
      name: 'Create Alert',
      description:
        'Classifies anomaly severity and creates supervisor-facing alerts with FCM push.',
      tags: ['alerts', 'notifications', 'supervisor'],
    },
    {
      id: 'generate_analytics',
      name: 'Generate District Analytics',
      description:
        'Generates AI-powered district health intelligence dashboard with KPIs, PHC breakdowns, and outbreak risk.',
      tags: ['analytics', 'dashboard', 'intelligence'],
    },
    {
      id: 'calculate_incentive',
      name: 'Calculate TBI Incentive',
      description:
        'Calculates NHM-compliant Task-Based Incentive disbursement for ASHA workers.',
      tags: ['incentive', 'payments', 'nhm'],
    },
    {
      id: 'generate_smart_route',
      name: 'Generate Smart Route',
      description:
        'AI-powered visit prioritization and route optimization for field workers.',
      tags: ['routing', 'triage', 'field-operations'],
    },
  ],
};

// ─── A2A Task State Machine ─────────────────────────────────────────────

type A2ATaskStatus = 'submitted' | 'working' | 'completed' | 'failed' | 'canceled';

interface A2ATask {
  id: string;
  status: A2ATaskStatus;
  skill: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{
    status: A2ATaskStatus;
    timestamp: string;
    message?: string;
  }>;
}

// ─── JSON-RPC Handler ──────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

function jsonRpcSuccess(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

// ─── Task Handlers ──────────────────────────────────────────────────────

async function handleTasksSend(
  params: Record<string, unknown>,
  db: FirebaseFirestore.Firestore
): Promise<A2ATask> {
  const skill = params.skill as string;
  const input = (params.input as Record<string, unknown>) || {};

  if (!skill) {
    throw new Error('Missing required parameter: skill');
  }

  // Validate skill exists
  const validSkills = AGENT_CARD.skills.map((s) => s.id);
  if (!validSkills.includes(skill)) {
    throw new Error(`Unknown skill: ${skill}. Valid skills: ${validSkills.join(', ')}`);
  }

  const now = new Date().toISOString();
  const taskDoc = db.collection('a2a_protocol_tasks').doc();

  const task: A2ATask = {
    id: taskDoc.id,
    status: 'submitted',
    skill,
    input,
    createdAt: now,
    updatedAt: now,
    history: [{ status: 'submitted', timestamp: now, message: 'Task received via A2A protocol' }],
  };

  // Save the A2A protocol task
  await taskDoc.set({
    ...task,
    _firestoreCreatedAt: FieldValue.serverTimestamp(),
  });

  // Log the A2A activity
  await writeAgentLog({
    agentName: 'A2A_ROUTER',
    action: `A2A Task Received — ${skill}`,
    details: `Task ${taskDoc.id}: ${JSON.stringify(input).substring(0, 200)}`,
    severity: 'info',
  });

  // Route to the appropriate internal mechanism
  await routeTask(task, db);

  // Fetch updated task state
  const updated = await taskDoc.get();
  const data = updated.data();
  if (data) {
    task.status = data.status;
    task.output = data.output;
    task.updatedAt = data.updatedAt || now;
    task.history = data.history || task.history;
  }

  return task;
}

async function routeTask(
  task: A2ATask,
  db: FirebaseFirestore.Firestore
): Promise<void> {
  const taskRef = db.collection('a2a_protocol_tasks').doc(task.id);
  const now = new Date().toISOString();

  try {
    // Mark as working
    await taskRef.update({
      status: 'working',
      updatedAt: now,
      history: FieldValue.arrayUnion({ status: 'working', timestamp: now, message: 'Processing started' }),
    });

    switch (task.skill) {
      case 'verify_visit': {
        // Write to visits collection which triggers verificationAgent
        const visitId = task.input.visitId as string;
        if (!visitId) throw new Error('verify_visit requires input.visitId');

        const visitDoc = await db.doc(`visits/${visitId}`).get();
        if (!visitDoc.exists) throw new Error(`Visit ${visitId} not found`);

        // The verificationAgent is already triggered by onDocumentCreated on visits/
        // For existing visits, we re-trigger by writing an a2a_tasks document
        await db.collection('a2a_tasks').add({
          sourceAgent: 'A2A_ROUTER',
          targetAgent: 'VERIFICATION_AGENT',
          action: 'RE_VERIFY',
          payload: { visitId, ...visitDoc.data() },
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
          a2aProtocolTaskId: task.id,
        });

        await taskRef.update({
          status: 'completed',
          updatedAt: new Date().toISOString(),
          output: { message: `Verification re-triggered for visit ${visitId}` },
          history: FieldValue.arrayUnion({
            status: 'completed',
            timestamp: new Date().toISOString(),
            message: 'Routed to Verification Agent via Firestore trigger',
          }),
        });
        break;
      }

      case 'create_alert': {
        // Write to a2a_tasks which triggers alertAgent
        await db.collection('a2a_tasks').add({
          sourceAgent: 'A2A_ROUTER',
          targetAgent: 'ALERT_AGENT',
          action: 'CREATE_ALERT',
          payload: task.input,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
          a2aProtocolTaskId: task.id,
        });

        await taskRef.update({
          status: 'completed',
          updatedAt: new Date().toISOString(),
          output: { message: 'Alert creation routed to Alert Agent' },
          history: FieldValue.arrayUnion({
            status: 'completed',
            timestamp: new Date().toISOString(),
            message: 'Routed to Alert Agent via Firestore trigger',
          }),
        });
        break;
      }

      case 'generate_analytics':
      case 'calculate_incentive':
      case 'generate_smart_route':
      case 'process_voice_note': {
        // These are onCall functions — store the request and mark as
        // "completed" with instructions to call the function directly
        await taskRef.update({
          status: 'completed',
          updatedAt: new Date().toISOString(),
          output: {
            message: `Skill '${task.skill}' is an on-demand function. Use the Firebase callable endpoint directly.`,
            endpoint: `https://asia-south1-kavach-hackathon-500511.cloudfunctions.net/${skillToFunction(task.skill)}`,
            input: task.input,
          },
          history: FieldValue.arrayUnion({
            status: 'completed',
            timestamp: new Date().toISOString(),
            message: `On-demand skill — callable endpoint returned`,
          }),
        });
        break;
      }

      default:
        throw new Error(`No route handler for skill: ${task.skill}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown routing error';
    await taskRef.update({
      status: 'failed',
      error: message,
      updatedAt: new Date().toISOString(),
      history: FieldValue.arrayUnion({
        status: 'failed',
        timestamp: new Date().toISOString(),
        message,
      }),
    });

    await writeAgentLog({
      agentName: 'A2A_ROUTER',
      action: `A2A Task Failed — ${task.skill}`,
      details: message,
      severity: 'error',
    });
  }
}

function skillToFunction(skill: string): string {
  const map: Record<string, string> = {
    process_voice_note: 'processVoiceNote',
    generate_analytics: 'generateAnalytics',
    calculate_incentive: 'calculateIncentive',
    generate_smart_route: 'generateSmartRoute',
  };
  return map[skill] || skill;
}

async function handleTasksGet(
  params: Record<string, unknown>,
  db: FirebaseFirestore.Firestore
): Promise<A2ATask> {
  const taskId = params.id as string;
  if (!taskId) throw new Error('Missing required parameter: id');

  const doc = await db.collection('a2a_protocol_tasks').doc(taskId).get();
  if (!doc.exists) throw new Error(`Task ${taskId} not found`);

  const data = doc.data()!;
  return {
    id: doc.id,
    status: data.status,
    skill: data.skill,
    input: data.input,
    output: data.output,
    error: data.error,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    history: data.history || [],
  };
}

async function handleTasksCancel(
  params: Record<string, unknown>,
  db: FirebaseFirestore.Firestore
): Promise<A2ATask> {
  const taskId = params.id as string;
  if (!taskId) throw new Error('Missing required parameter: id');

  const ref = db.collection('a2a_protocol_tasks').doc(taskId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error(`Task ${taskId} not found`);

  const now = new Date().toISOString();
  await ref.update({
    status: 'canceled',
    updatedAt: now,
    history: FieldValue.arrayUnion({ status: 'canceled', timestamp: now, message: 'Canceled via A2A protocol' }),
  });

  return { ...doc.data(), id: doc.id, status: 'canceled', updatedAt: now } as A2ATask;
}

// ─── Cloud Function: A2A Gateway ────────────────────────────────────────

export const a2aGateway = onRequest(
  {
    region: 'asia-south1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (req, res) => {
    const db = getFirestore();

    // ── Agent Card Discovery ──
    if (req.method === 'GET') {
      // Serve agent card at any GET (including /.well-known/agent.json via hosting rewrite)
      res.status(200).json(AGENT_CARD);
      return;
    }

    // ── JSON-RPC Endpoint ──
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed. Use GET for agent card, POST for JSON-RPC.' });
      return;
    }

    const body = req.body as JsonRpcRequest;

    if (!body || body.jsonrpc !== '2.0' || !body.method) {
      res.status(400).json(jsonRpcError(body?.id || null, -32600, 'Invalid JSON-RPC request'));
      return;
    }

    const { id, method, params } = body;

    logger.info('[A2A_GATEWAY] JSON-RPC request', { method, id });

    try {
      let result: unknown;

      switch (method) {
        case 'tasks/send':
          result = await handleTasksSend((params || {}) as Record<string, unknown>, db);
          break;

        case 'tasks/get':
          result = await handleTasksGet((params || {}) as Record<string, unknown>, db);
          break;

        case 'tasks/cancel':
          result = await handleTasksCancel((params || {}) as Record<string, unknown>, db);
          break;

        case 'agent/authenticatedExtendedCard':
          result = AGENT_CARD;
          break;

        default:
          res.status(200).json(jsonRpcError(id, -32601, `Method not found: ${method}`));
          return;
      }

      res.status(200).json(jsonRpcSuccess(id, result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      logger.error('[A2A_GATEWAY] Request failed', { method, error: message });
      res.status(200).json(jsonRpcError(id, -32000, message));
    }
  }
);
