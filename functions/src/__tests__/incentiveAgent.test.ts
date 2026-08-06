import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateIncentive } from '../agents/incentiveAgent';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn()
}));

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: () => ({
      collection: () => ({
        where: () => ({
          where: () => ({
            get: getMock
          })
        })
      })
    })
  };
});
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
}));

describe('Incentive Agent (calculateIncentive)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates correct disbursement for verified and flagged visits', async () => {
    getMock.mockResolvedValue([
      { data: () => ({ visitType: 'Immunization', anomaliesFound: false }) },
      { data: () => ({ visitType: 'Immunization', anomaliesFound: false }) },
      { data: () => ({ visitType: 'HBNC', anomaliesFound: true }) }
    ] as any);

    const request = {
      auth: { uid: 'worker_1' },
      data: { workerId: 'worker_1' }
    } as any;

    const result = await (calculateIncentive as any).run(request);
    
    expect(result.totalGross).toBe(550);
    expect(result.totalDeductions).toBe(250);
    expect(result.netDisbursement).toBe(300);
    expect(result.totalVisits).toBe(3);
    expect(result.verifiedVisits).toBe(2);
    expect(result.flaggedVisits).toBe(1);
  });
});
