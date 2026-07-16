import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase modules before importing db
vi.mock('../../firebase', () => ({
  db: {},
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'test-visit-id' }),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
  limit: vi.fn(),
  onSnapshot: vi.fn().mockReturnValue(vi.fn()), // returns unsubscribe
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn().mockReturnValue(
    vi.fn().mockResolvedValue({
      data: {
        total_ashas: 1245,
        total_beneficiaries: 45200,
        surveys_completed: 12800,
        high_risk_cases: 342,
        data_quality_score: 94,
        disbursement_ready: 4200000,
      },
    })
  ),
}));

describe('db service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saveVisit should return a document ID on success', async () => {
    const { saveVisit } = await import('../db');

    const visitId = await saveVisit(
      {
        householdName: 'Sharma',
        childName: 'Rahul',
        childAge: '3 years',
        weight: '12kg',
        status: 'Normal',
        visitType: 'Routine Checkup',
        immunisation: '-',
        rawTranscription: 'Test transcription',
        geoAnchor: { lat: 28.6139, lng: 77.209, accuracy: 10 },
      },
      'worker-phone-123'
    );

    expect(visitId).toBe('test-visit-id');
  });

  it('saveVisit should handle null geoAnchor gracefully', async () => {
    const { saveVisit } = await import('../db');

    const visitId = await saveVisit(
      {
        householdName: 'Kumar',
        childName: '-',
        childAge: '-',
        weight: '-',
        status: 'Unknown',
        visitType: 'General Visit',
        immunisation: '-',
        rawTranscription: 'Quick visit',
        geoAnchor: null,
      },
      'worker-phone-456'
    );

    expect(visitId).toBe('test-visit-id');
  });

  it('fetchDHOAnalytics should return metrics', async () => {
    const { fetchDHOAnalytics } = await import('../db');

    const metrics = await fetchDHOAnalytics();

    expect(metrics).toHaveProperty('total_ashas');
    expect(metrics).toHaveProperty('total_beneficiaries');
    expect(metrics).toHaveProperty('surveys_completed');
    expect(metrics.total_ashas).toBeGreaterThan(0);
  });

  it('onVisitsSnapshot should return an unsubscribe function', async () => {
    const { onVisitsSnapshot } = await import('../db');

    const unsubscribe = onVisitsSnapshot(() => {});

    expect(typeof unsubscribe).toBe('function');
  });

  it('onAlertsSnapshot should return an unsubscribe function', async () => {
    const { onAlertsSnapshot } = await import('../db');

    const unsubscribe = onAlertsSnapshot(() => {});

    expect(typeof unsubscribe).toBe('function');
  });
});
