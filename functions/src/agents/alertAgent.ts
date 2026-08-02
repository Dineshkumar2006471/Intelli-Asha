/**
 * IntelliASHA — Alert Agent (Cloud Function)
 *
 * Listens for A2A tasks from the Verification Agent and creates
 * structured alerts for PHC supervisors. Also sends FCM push
 * notifications to relevant supervisors.
 *
 * Capabilities:
 *  • Alert severity classification (Gemini)
 *  • FCM push notification delivery
 *  • In-app alert creation in Firestore
 *  • Zero-visit zone detection (scheduled)
 *
 * Google Services: Gemini 2.5 Flash, FCM, Firestore, Secret Manager
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { GoogleGenAI, Type } from '@google/genai';
import { writeAgentLog } from '../services/agentLogger';
import * as logger from 'firebase-functions/logger';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ─── Alert Classification Schema ────────────────────────────────────────

const alertClassificationSchema = {
  type: Type.OBJECT,
  properties: {
    severity: {
      type: Type.STRING,
      enum: ['high', 'medium', 'low'],
    },
    title: { type: Type.STRING, description: 'Short alert title (max 60 chars)' },
    message: { type: Type.STRING, description: 'Detailed alert message for supervisor' },
    actionRequired: { type: Type.STRING, description: 'Specific action the supervisor should take' },
  },
  required: ['severity', 'title', 'message', 'actionRequired'],
};

// ─── A2A Task Handler ───────────────────────────────────────────────────

export const alertAgent = onDocumentCreated(
  {
    document: 'a2a_tasks/{taskId}',
    secrets: [geminiApiKey],
    region: 'asia-south1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const task = snapshot.data();
    const taskId = event.params.taskId;

    // Only process tasks targeted at ALERT_AGENT
    if (task.targetAgent !== 'ALERT_AGENT') return;
    if (task.status !== 'pending') return;

    const db = getFirestore();

    logger.info('[ALERT_AGENT] Processing A2A task', { taskId, action: task.action });

    // Mark task as processing
    await db.doc(`a2a_tasks/${taskId}`).update({ status: 'processing' });

    await writeAgentLog({
      agentName: 'ALERT_AGENT',
      action: `Received A2A task from ${task.sourceAgent}`,
      details: `Action: ${task.action}, Visit: ${task.payload?.visitId || 'N/A'}`,
      severity: 'info',
      relatedVisitId: task.payload?.visitId,
      relatedWorkerId: task.payload?.workerId,
    });

    try {
      if (task.action === 'CREATE_ALERT') {
        await handleCreateAlert(task.payload, taskId, db);
      }

      // Mark task as completed
      await db.doc(`a2a_tasks/${taskId}`).update({
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[ALERT_AGENT] Task failed', { taskId, error: message });

      await db.doc(`a2a_tasks/${taskId}`).update({
        status: 'failed',
        error: message,
      });

      await writeAgentLog({
        agentName: 'ALERT_AGENT',
        action: 'Task failed',
        details: message,
        severity: 'error',
        relatedVisitId: task.payload?.visitId,
      });
    }
  }
);

// ─── Create Alert Handler ───────────────────────────────────────────────

async function handleCreateAlert(
  payload: Record<string, unknown>,
  taskId: string,
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  const { visitId, workerId, householdName, flaggedReason, recommendation } = payload as {
    visitId: string;
    workerId: string;
    householdName: string;
    flaggedReason: string;
    recommendation: string;
  };

  // Classify alert severity with Gemini
  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [{
        text: `Visit anomaly detected:
Household: ${householdName}
Reason: ${flaggedReason}
Verification recommendation: ${recommendation}

Classify this alert's severity and generate a supervisor-facing message.`,
      }],
    }],
    config: {
      systemInstruction: `You are the IntelliASHA Alert Agent. Classify anomaly alerts for PHC supervisors.
HIGH = immediate danger (severe malnutrition, potential fraud, disease outbreak indicator)
MEDIUM = requires review within 24 hours (data inconsistencies, poor GPS accuracy)
LOW = informational (minor data gaps, routine follow-up needed)

Write clear, actionable messages. No jargon.`,
      responseMimeType: 'application/json',
      responseSchema: alertClassificationSchema,
      temperature: 0.2,
    },
  });

  const text = response?.text;
  const classification = text
    ? JSON.parse(text) as { severity: string; title: string; message: string; actionRequired: string }
    : { severity: 'medium', title: `Anomaly: ${householdName}`, message: flaggedReason, actionRequired: 'Review visit data' };

  // Create alert document
  const alertRef = await db.collection('alerts').add({
    title: classification.title,
    severity: classification.severity,
    message: classification.message,
    actionRequired: classification.actionRequired,
    visitId,
    workerId,
    householdName,
    flaggedReason,
    timestamp: FieldValue.serverTimestamp(),
    status: 'unread',
    sourceTaskId: taskId,
  });

  await writeAgentLog({
    agentName: 'ALERT_AGENT',
    action: `Alert created — ${classification.severity.toUpperCase()}`,
    details: `${classification.title}: ${classification.message}`,
    severity: classification.severity === 'high' ? 'warning' : 'info',
    relatedVisitId: visitId,
    relatedWorkerId: workerId,
  });

  // Send FCM push notification to supervisors
  await sendPushToSupervisors(db, classification, alertRef.id);
}

// ─── FCM Push Notification ──────────────────────────────────────────────

async function sendPushToSupervisors(
  db: FirebaseFirestore.Firestore,
  classification: { severity: string; title: string; message: string },
  alertId: string,
): Promise<void> {
  try {
    // FCM tokens are stored in workers/{workerId}.fcmToken by the frontend
    const workersSnap = await db.collection('workers').where('fcmToken', '!=', null).get();
    const tokens = workersSnap.docs
      .map((doc) => doc.data().fcmToken as string)
      .filter(Boolean);

    if (tokens.length === 0) {
      logger.info('[ALERT_AGENT] No FCM tokens found — skipping push');
      return;
    }

    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `⚠️ ${classification.title}`,
        body: classification.message,
      },
      data: {
        alertId,
        severity: classification.severity,
        type: 'visit_anomaly',
      },
      webpush: {
        fcmOptions: {
          link: '/dashboard/supervisor/alerts',
        },
      },
    });

    logger.info('[ALERT_AGENT] FCM push sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    await writeAgentLog({
      agentName: 'ALERT_AGENT',
      action: 'Push notification dispatched',
      details: `Sent to ${response.successCount} devices (${response.failureCount} failed)`,
      severity: 'info',
    });
  } catch (err) {
    // FCM failure should not block alert creation
    logger.warn('[ALERT_AGENT] FCM push failed — alert still created', {
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
}

// ─── Zero-Visit Zone Detection (Scheduled) ──────────────────────────────

export const zeroVisitZoneDetection = onSchedule(
  {
    schedule: 'every 6 hours',
    region: 'asia-south1',
    secrets: [geminiApiKey],
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    const db = getFirestore();

    logger.info('[ALERT_AGENT] Running zero-visit zone detection');

    await writeAgentLog({
      agentName: 'ALERT_AGENT',
      action: 'Zero-visit zone scan started',
      details: 'Checking for workers with no visits in 48 hours',
      severity: 'info',
    });

    try {
      // Get all workers
      const workersSnap = await db.collection('workers').get();
      const cutoff = Timestamp.fromDate(
        new Date(Date.now() - 48 * 60 * 60 * 1000)
      );

      let zeroVisitWorkers = 0;

      for (const workerDoc of workersSnap.docs) {
        const workerId = workerDoc.id;
        const workerData = workerDoc.data();

        // Check for recent visits
        const recentVisits = await db
          .collection('visits')
          .where('workerId', '==', workerId)
          .where('timestamp', '>=', cutoff)
          .limit(1)
          .get();

        if (recentVisits.empty) {
          zeroVisitWorkers++;

          // Create zero-visit alert
          await db.collection('alerts').add({
            title: `No visits: ${workerData.name || workerId}`,
            severity: 'medium',
            message: `Worker ${workerData.name || workerId} has not logged any visits in the past 48 hours.`,
            actionRequired: 'Contact worker to verify status and wellbeing.',
            visitId: '',
            workerId,
            householdName: '',
            flaggedReason: 'zero_visit_zone',
            timestamp: FieldValue.serverTimestamp(),
            status: 'unread',
          });
        }
      }

      await writeAgentLog({
        agentName: 'ALERT_AGENT',
        action: 'Zero-visit scan complete',
        details: `Found ${zeroVisitWorkers} workers with no visits in 48 hours`,
        severity: zeroVisitWorkers > 0 ? 'warning' : 'success',
      });

      logger.info('[ALERT_AGENT] Zero-visit scan complete', { zeroVisitWorkers });
    } catch (err) {
      logger.error('[ALERT_AGENT] Zero-visit scan failed', {
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }
);
