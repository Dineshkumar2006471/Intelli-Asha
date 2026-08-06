import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateIncentive } from '../agents/incentiveAgent';

vi.mock('firebase-admin/firestore', () => {
  const getMock = vi.fn();
  return {
    getFirestore: () => ({
      collection: () => ({
        where: () => ({
          where: () => ({
            get: getMock
          })
        })
      })
    }),
    __getMock: getMock
  };
});
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
}));

describe('Incentive Agent (calculateIncentive)', () => {
  const { __getMock } = require('firebase-admin/firestore');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates correct disbursement for verified and flagged visits', async () => {
    // 2 verified immunizations (150 each) + 1 flagged HBNC (250)
    __getMock.mockResolvedValue([
      { data: () => ({ visitType: 'Immunization', anomaliesFound: false }) },
      { data: () => ({ visitType: 'Immunization', anomaliesFound: false }) },
      { data: () => ({ visitType: 'HBNC', anomaliesFound: true }) }
    ]);

    const request = {
      auth: { uid: 'worker_1' },
      data: { workerId: 'worker_1' }
    } as any;

    const result = await (calculateIncentive as any).run(request);
    
    // Total gross = 150 + 150 + 250 = 550
    // Total deductions = 250 (flagged HBNC)
    // Net = 300
    expect(result.totalGross).toBe(550);
    expect(result.totalDeductions).toBe(250);
    expect(result.netDisbursement).toBe(300);
    expect(result.totalVisits).toBe(3);
    expect(result.verifiedVisits).toBe(2);
    expect(result.flaggedVisits).toBe(1);
  });
});
