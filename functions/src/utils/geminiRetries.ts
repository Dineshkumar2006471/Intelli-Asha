import * as logger from 'firebase-functions/logger';
import { GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from '@google/genai';

/**
 * Wraps Gemini API calls with exponential backoff to handle
 * Free Tier 429 (Rate Limit) and 503 (Overloaded) errors.
 */
export async function callGeminiWithRetries(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
  maxRetries = 8
): Promise<GenerateContentResponse> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const status = error?.status || error?.response?.status || error?.error?.code;
      const errorMsg = error?.message?.toLowerCase() || '';
      
      // 429 = Rate Limited (Too many requests)
      // 503 = Service Unavailable (Model overloaded)
      const isRateLimit = status === 429 || status === 503 || status === 'RESOURCE_EXHAUSTED' || status === 'UNAVAILABLE' || errorMsg.includes('429') || errorMsg.includes('503') || errorMsg.includes('quota') || errorMsg.includes('exhausted') || errorMsg.includes('unavailable') || errorMsg.includes('overloaded');

      if (isRateLimit) {
        attempts++;
        if (attempts >= maxRetries) {
          logger.error(`[GEMINI_RETRY] Failed after ${maxRetries} attempts`, { error: error.message });
          throw error;
        }
        
        // Exponential backoff with LARGE jitter to prevent Thundering Herd (all 4 agents waking up at once)
        const baseDelay = 3000 * Math.pow(2, attempts - 1);
        const jitter = Math.random() * 8000;
        const delayMs = baseDelay + jitter;
        
        logger.warn(`[GEMINI_RETRY] Hit ${status}. Retrying in ${Math.round(delayMs / 1000)}s... (Attempt ${attempts}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        // Throw immediately for auth errors (401, 403) or bad requests (400)
        logger.error(`[GEMINI_RETRY] Fatal non-retryable error`, { error: error.message, status });
        throw error;
      }
    }
  }
  
  throw new Error('Unreachable');
}
