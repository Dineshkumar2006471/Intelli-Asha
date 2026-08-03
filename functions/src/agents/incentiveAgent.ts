import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

// NHM Incentive Rates (in INR)
const TBI_RATES: Record<string, number> = {
  'Immunization': 150,
  'Antenatal Care': 250,
  'Institutional Delivery': 300,
  'HBNC': 250,
  'General Visit': 100
};

export const calculateIncentive = onCall(
  {
    region: 'asia-south1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { workerId } = request.data;
    if (!workerId || typeof workerId !== 'string') {
      throw new HttpsError('invalid-argument', 'Valid workerId is required.');
    }

    try {
      const db = getFirestore();
      
      // Calculate start of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch visits for this worker in the current month
      const visitsSnapshot = await db.collection('visits')
        .where('workerId', '==', workerId)
        .where('timestamp', '>=', firstDayOfMonth)
        .get();

      let totalVisits = 0;
      let verifiedVisits = 0;
      let flaggedVisits = 0;
      let totalGross = 0;
      let totalDeductions = 0;

      const breakdownMap = new Map<string, any>();

      // Initialize breakdown map with standard categories to show on UI even if 0
      Object.keys(TBI_RATES).forEach(type => {
        breakdownMap.set(type, {
          visitType: type,
          totalCount: 0,
          verifiedCount: 0,
          flaggedCount: 0,
          rate: TBI_RATES[type],
          grossAmount: 0,
          deduction: 0,
          netAmount: 0
        });
      });

      visitsSnapshot.forEach(doc => {
        const data = doc.data();
        const vType = data.visitType || 'General Visit';
        const isFlagged = data.anomaliesFound === true;
        
        totalVisits++;
        if (isFlagged) flaggedVisits++;
        else verifiedVisits++;

        // Ensure category exists
        if (!breakdownMap.has(vType)) {
          breakdownMap.set(vType, {
            visitType: vType,
            totalCount: 0,
            verifiedCount: 0,
            flaggedCount: 0,
            rate: TBI_RATES[vType] || 100, // Default 100
            grossAmount: 0,
            deduction: 0,
            netAmount: 0
          });
        }

        const stats = breakdownMap.get(vType);
        stats.totalCount++;
        stats.grossAmount += stats.rate;
        totalGross += stats.rate;

        if (isFlagged) {
          stats.flaggedCount++;
          stats.deduction += stats.rate;
          totalDeductions += stats.rate;
        } else {
          stats.verifiedCount++;
          stats.netAmount += stats.rate;
        }
      });

      const breakdown = Array.from(breakdownMap.values()).filter(b => b.totalCount > 0 || Object.keys(TBI_RATES).includes(b.visitType));
      
      const netDisbursement = totalGross - totalDeductions;
      
      // Simple risk determination based on flag ratio
      let ghostReportingRisk = 'Low';
      let recommendation = 'All visit logs appear authentic. No anomalies detected.';
      const anomalyPatterns = [];

      if (totalVisits > 0) {
        const flagRatio = flaggedVisits / totalVisits;
        if (flagRatio > 0.5) {
          ghostReportingRisk = 'High';
          recommendation = 'Multiple AI anomalies detected (possible GPS spoofing or biometric mismatch). Manual review required by Supervisor.';
          anomalyPatterns.push('High frequency of flagged visits');
        } else if (flagRatio > 0.2) {
          ghostReportingRisk = 'Medium';
          recommendation = 'Some visits require manual verification due to missing audio or geolocation mismatches.';
          anomalyPatterns.push('Occasional validation failures');
        }
      }

      logger.info(`[INCENTIVE_AGENT] Calculated earnings for worker ${workerId}: Net ₹${netDisbursement}`);

      return {
        workerId,
        workerName: 'ASHA Worker', // Could be fetched from workers collection if needed
        period: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
        breakdown,
        totalGross,
        totalDeductions,
        netDisbursement,
        totalVisits,
        verifiedVisits,
        flaggedVisits,
        ghostReportingRisk,
        recommendation,
        anomalyPatterns
      };

    } catch (error) {
      logger.error('[INCENTIVE_AGENT] Failed to calculate incentives', error);
      throw new HttpsError('internal', 'Unable to calculate incentives.');
    }
  }
);
