import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processVisitVoiceNote } from '../agents/fieldAgent';
import { callGeminiWithRetries } from '../utils/geminiRetries';

vi.mock('../utils/geminiRetries', () => ({
  callGeminiWithRetries: vi.fn(),
}));
vi.mock('../services/agentLogger', () => ({
  writeAgentLog: vi.fn(),
}));
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

describe('Field Agent (processVisitVoiceNote)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts structured data and returns correct shape', async () => {
    const mockGeminiResponse = {
      householdName: 'Rao',
      childName: 'Aarav',
      childAge: '3 months',
      weight: '5.2 kg',
      status: 'Normal',
      visitType: 'Immunization',
      immunisation: 'OPV',
      followUpNeeded: false,
      detectedLanguage: 'english',
      professionalReport: 'Patient is healthy.'
    };

    vi.mocked(callGeminiWithRetries).mockResolvedValue({
      text: JSON.stringify(mockGeminiResponse)
    } as any);

    const request = {
      auth: { uid: 'worker_123' },
      data: { text: 'Aarav is 3 months old and weighs 5.2kg. Gave OPV.' }
    } as any;

    const result = await (processVisitVoiceNote as any).run(request);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockGeminiResponse);
  });

  it('throws an error if unauthenticated', async () => {
    const request = { data: { text: 'Hello' } } as any;
    await expect((processVisitVoiceNote as any).run(request)).rejects.toThrow('User must be logged in.');
  });
});
