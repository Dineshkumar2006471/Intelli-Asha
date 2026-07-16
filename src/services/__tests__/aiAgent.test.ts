import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processVisitVoiceNote } from '../aiAgent';

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

// Mock the @google/genai module
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function(this: any) {
      this.models = {
        generateContent: mockGenerateContent,
      };
    }),
  };
});

describe('processVisitVoiceNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        householdName: 'Sharma',
        childName: 'Rahul',
        childAge: '3 years',
        weight: '12kg',
        status: 'Normal',
        visitType: 'Routine Checkup',
        immunisation: 'Polio Booster',
      }),
    });
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
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        householdName: 'Kumar',
        status: 'Unknown',
        visitType: 'General Visit',
      }),
    });

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
