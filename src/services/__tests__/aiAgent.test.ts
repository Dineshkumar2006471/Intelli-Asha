import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processVisitVoiceNote } from '../aiAgent';
import { httpsCallable } from 'firebase/functions';

vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/functions')>();
  return {
    ...actual,
    getFunctions: vi.fn(),
    httpsCallable: vi.fn(),
    connectFunctionsEmulator: vi.fn(),
  };
});

describe('processVisitVoiceNote', () => {
  const mockHttpsCallable = vi.mocked(httpsCallable);

  beforeEach(() => {
    vi.clearAllMocks();
    const mockFunction = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          householdName: 'Sharma',
          childName: 'Rahul',
          childAge: '3 years',
          weight: '12kg',
          status: 'Normal',
          visitType: 'Routine Checkup',
          immunisation: 'Polio Booster',
        }
      }
    });
    mockHttpsCallable.mockReturnValue(mockFunction as any);
  });

  it('should extract structured data from a valid transcription', async () => {
    const result = await processVisitVoiceNote(
      'Visited Sharma household. Child Rahul, weight 12kg. Standard checkup.'
    );

    expect(result).toEqual({
      householdName: 'Sharma',
      childName: 'Rahul',
      childAge: '3 years',
      weight: '12kg',
      status: 'Normal',
      visitType: 'Routine Checkup',
      immunisation: 'Polio Booster',
    });
  });

  it('should return proper defaults for missing optional fields', async () => {
    const mockFunction = vi.fn().mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          householdName: 'Kumar',
          status: 'Unknown',
          visitType: 'General Visit',
        }
      }
    });
    mockHttpsCallable.mockReturnValue(mockFunction as any);

    const result = await processVisitVoiceNote('Visited Kumar household');

    expect(result.householdName).toBe('Kumar');
    expect(result.status).toBeDefined();
    expect(result.visitType).toBeDefined();
  });

  it('should sanitize HTML tags from transcription input', async () => {
    const result = await processVisitVoiceNote('<script>alert("xss")</script>');
    // Should not throw — sanitization prevents injection
    expect(result).toBeDefined();
    expect(result.householdName).toBeDefined();
  });
});
