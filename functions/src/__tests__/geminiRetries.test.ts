import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

import { callGeminiWithRetries } from '../utils/geminiRetries';
import * as logger from 'firebase-functions/logger';
import type { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

describe('callGeminiWithRetries', () => {
  let mockGenAI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGenAI = {
      models: {
        generateContent: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return successfully on the first attempt if no error occurs', async () => {
    const mockResponse = { text: () => 'Success' };
    mockGenAI.models.generateContent.mockResolvedValue(mockResponse);

    const params: GenerateContentParameters = { model: 'test-model', contents: 'test' };
    const result = await callGeminiWithRetries(mockGenAI as GoogleGenAI, params, 3);

    expect(result).toBe(mockResponse);
    expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('should throw immediately on non-retryable errors (e.g. 403)', async () => {
    const authError = new Error('Permission denied');
    (authError as any).status = 403;
    mockGenAI.models.generateContent.mockRejectedValue(authError);

    const params: GenerateContentParameters = { model: 'test-model', contents: 'test' };

    await expect(callGeminiWithRetries(mockGenAI as GoogleGenAI, params, 3)).rejects.toThrow('Permission denied');
    expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should retry on 429 Rate Limit error and eventually succeed', async () => {
    const rateLimitError = new Error('Quota exceeded');
    (rateLimitError as any).status = 429;
    
    const mockResponse = { text: () => 'Eventual Success' };
    
    mockGenAI.models.generateContent
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce(mockResponse);

    const params: GenerateContentParameters = { model: 'test-model', contents: 'test' };
    const promise = callGeminiWithRetries(mockGenAI as GoogleGenAI, params, 3);
    
    // Wait for microtasks, then advance timer
    await Promise.resolve();
    vi.advanceTimersByTime(20000);
    
    const result = await promise;

    expect(result).toBe(mockResponse);
    expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should throw after max retries are exhausted', async () => {
    const rateLimitError = new Error('Overloaded');
    (rateLimitError as any).status = 503;
    
    mockGenAI.models.generateContent.mockRejectedValue(rateLimitError);

    const params: GenerateContentParameters = { model: 'test-model', contents: 'test' };

    const promise = callGeminiWithRetries(mockGenAI as GoogleGenAI, params, 3);
    
    // Advance past all delays
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      vi.advanceTimersByTime(20000);
    }

    await expect(promise).rejects.toThrow('Overloaded');
    expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(3); // 1 initial + 2 retries -> hits max limit on attempt 3
    expect(logger.error).toHaveBeenCalled();
  });
});
