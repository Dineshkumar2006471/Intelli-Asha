import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processVisitVoiceNote, generateFullDashboardData, calculateWorkerIncentive } from '../aiAgent';

vi.mock('../../firebase', () => ({
  db: {},
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

describe('aiAgent Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processVisitVoiceNote', () => {
    it('should call the cloud function and return extracted VisitData', async () => {
      const mockResult = {
        data: {
          data: {
            householdName: 'Sharma',
            childName: 'Rahul',
            status: 'Normal',
            visitType: 'Checkup',
          }
        }
      };
      
      const mockCallable = vi.fn().mockResolvedValue(mockResult);
      (httpsCallable as ReturnType<typeof vi.fn>).mockReturnValue(mockCallable);

      const result = await processVisitVoiceNote('Test transcription');

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'processVisitVoiceNote');
      expect(mockCallable).toHaveBeenCalledWith({ text: 'Test transcription' });
      expect(result.householdName).toBe('Sharma');
    });

    it('should propagate errors from the cloud function', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Cloud Function Failed'));
      (httpsCallable as ReturnType<typeof vi.fn>).mockReturnValue(mockCallable);

      await expect(processVisitVoiceNote('Test')).rejects.toThrow('Cloud Function Failed');
    });
  });

  describe('generateFullDashboardData', () => {
    it('should return empty fallback state if document does not exist', async () => {
      (doc as ReturnType<typeof vi.fn>).mockReturnValue('doc-ref');
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({ exists: () => false });

      const result = await generateFullDashboardData('UnknownLocation');
      expect(result.metrics.total_ashas).toBe(0);
      expect(result.aiBrief.anomaly).toBe('No data available yet.');
      expect(result.phcs).toEqual([]);
    });

    it('should return analytics data if document exists', async () => {
      (doc as ReturnType<typeof vi.fn>).mockReturnValue('doc-ref');
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        exists: () => true,
        data: () => ({ metrics: { total_ashas: 10 } })
      });

      const result = await generateFullDashboardData('TestLocation');
      expect(result.metrics.total_ashas).toBe(10);
    });
  });

  describe('calculateWorkerIncentive', () => {
    it('should throw if no workerId is provided', async () => {
      await expect(calculateWorkerIncentive(undefined)).rejects.toThrow('workerId is required');
    });

    it('should return pending state if document does not exist', async () => {
      (doc as ReturnType<typeof vi.fn>).mockReturnValue('doc-ref');
      (getDoc as ReturnType<typeof vi.fn>).mockResolvedValue({ exists: () => false });

      const result = await calculateWorkerIncentive('worker123');
      expect(result.workerName).toBe('Pending');
      expect(result.netDisbursement).toBe(0);
    });
  });
});
