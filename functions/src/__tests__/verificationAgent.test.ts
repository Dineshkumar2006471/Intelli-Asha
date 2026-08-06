import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verificationAgent } from '../agents/verificationAgent';

const { mockUpdate, mockGet, mockAdd, mockWarn } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockGet: vi.fn(),
  mockAdd: vi.fn(),
  mockWarn: vi.fn()
}));

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: () => ({
      doc: () => ({ update: mockUpdate }),
      collection: () => ({
        where: () => ({
          where: () => ({
            where: () => ({ get: mockGet }),
            orderBy: () => ({ limit: () => ({ get: mockGet }) }),
            get: mockGet
          }),
          orderBy: () => ({ limit: () => ({ get: mockGet }) }),
          get: mockGet
        }),
        add: mockAdd
      })
    }),
    FieldValue: { serverTimestamp: () => 'timestamp' },
    Timestamp: { fromDate: () => ({}), now: () => ({}) }
  };
});

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: mockWarn,
}));
vi.mock('../services/agentLogger', () => ({ writeAgentLog: vi.fn() }));
vi.mock('../utils/geminiRetries', () => ({
  callGeminiWithRetries: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      anomaliesFound: false,
      flaggedReason: '',
      verificationConfidence: 95,
      medicalPlausibility: 'pass'
    })
  })
}));

describe('Verification Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ size: 0, docs: [] } as any);
  });

  it('runs successfully (happy path)', async () => {
    const event = {
      params: { visitId: 'v1' },
      data: {
        data: () => ({
          workerId: 'w1',
          householdName: 'Test',
          childName: 'C1',
          weight: '5kg',
          status: 'Normal',
          geoAnchor: { accuracy: 10 }
        })
      }
    } as any;
    
    await (verificationAgent as any).run(event);
    
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('logs warning and skips when Firestore throws an error during pre-checks', async () => {
    mockGet.mockRejectedValue(new Error('Firestore DB Error'));
    
    const event = {
      params: { visitId: 'v2' },
      data: {
        data: () => ({ workerId: 'w1', householdName: 'Test' })
      }
    } as any;
    
    await (verificationAgent as any).run(event);
    
    expect(mockWarn).toHaveBeenCalledWith(
      '[VERIFICATION_AGENT] visitDuration check failed',
      expect.objectContaining({ error: 'Firestore DB Error', workerId: 'w1' })
    );
    expect(mockWarn).toHaveBeenCalledWith(
      '[VERIFICATION_AGENT] householdFrequency check failed',
      expect.objectContaining({ error: 'Firestore DB Error', workerId: 'w1' })
    );
  });
});
