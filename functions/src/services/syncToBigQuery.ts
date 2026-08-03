/**
 * IntelliASHA — BigQuery Sync Pipeline (Cloud Function)
 *
 * Streams Firestore `visits` data into BigQuery in real-time.
 * Solves the "Fake BigQuery Claim" from the audit by actually
 * maintaining an enterprise data warehouse for the Analytics Agent.
 *
 * Creates the Dataset and Table automatically if they don't exist.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';

let bigquery: InstanceType<typeof import('@google-cloud/bigquery').BigQuery> | null = null;

function getBigQuery() {
  if (!bigquery) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BigQuery } = require('@google-cloud/bigquery');
    bigquery = new BigQuery();
  }
  return bigquery;
}
const DATASET_ID = 'intelliasha_analytics';
const TABLE_ID = 'visits';

let tableReady = false;

async function ensureTableExists() {
  if (tableReady) {
    return getBigQuery()!.dataset(DATASET_ID).table(TABLE_ID);
  }

  const dataset = getBigQuery()!.dataset(DATASET_ID);
  const [datasetExists] = await dataset.exists();
  
  if (!datasetExists) {
    await dataset.create();
    logger.info(`[BIGQUERY] Created dataset: ${DATASET_ID}`);
  }

  const table = dataset.table(TABLE_ID);
  const [tableExists] = await table.exists();

  if (!tableExists) {
    const schema = [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'workerId', type: 'STRING' },
      { name: 'householdName', type: 'STRING' },
      { name: 'childName', type: 'STRING' },
      { name: 'childAge', type: 'STRING' },
      { name: 'weight', type: 'STRING' },
      { name: 'status', type: 'STRING' },
      { name: 'visitType', type: 'STRING' },
      { name: 'immunisation', type: 'STRING' },
      { name: 'anomaliesFound', type: 'BOOLEAN' },
      { name: 'verificationConfidence', type: 'INTEGER' },
      { name: 'timestamp', type: 'TIMESTAMP' },
      { name: 'geoLat', type: 'FLOAT' },
      { name: 'geoLng', type: 'FLOAT' },
    ];

    await table.create({ schema });
    logger.info(`[BIGQUERY] Created table: ${TABLE_ID} with schema`);
  }
  
  tableReady = true;
  return table;
}

export const syncVisitToBigQuery = onDocumentWritten(
  {
    document: 'visits/{visitId}',
    region: 'asia-south1',
    memory: '256MiB',
  },
  async (event) => {
    try {
      const table = await ensureTableExists();
      const visitId = event.params.visitId;
      
      // If the document was deleted, we don't necessarily delete from BQ (append-only ledger)
      // but we could mark it as deleted. For now, we'll just skip deletes.
      if (!event.data?.after.exists) {
        logger.info(`[BIGQUERY] Document ${visitId} deleted. Skipping BQ sync.`);
        return;
      }

      const data = event.data.after.data();
      
      const row = {
        id: visitId,
        workerId: data?.workerId || null,
        householdName: data?.householdName || null,
        childName: data?.childName || null,
        childAge: data?.childAge || null,
        weight: data?.weight || null,
        status: data?.status || null,
        visitType: data?.visitType || null,
        immunisation: data?.immunisation || null,
        anomaliesFound: !!data?.anomaliesFound,
        verificationConfidence: data?.verificationConfidence || null,
        timestamp: data?.timestamp ? data.timestamp.toDate() : new Date(),
        geoLat: data?.geoAnchor?.lat || null,
        geoLng: data?.geoAnchor?.lng || null,
      };

      await table.insert([row]);
      logger.info(`[BIGQUERY] Synced visit ${visitId} to BigQuery`);
    } catch (error) {
      logger.error('[BIGQUERY] Failed to sync to BigQuery', error);
      // In a production system, you'd want to queue this for retry or alert
    }
  }
);
