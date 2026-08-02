/**
 * IntelliASHA — Speech-to-Text Service (Cloud Function)
 *
 * Provides real Google Cloud Speech-to-Text (v2) transcription,
 * replacing the inconsistent browser Web Speech API.
 * Supports Hindi, Telugu, Tamil, Bengali, Kannada, and English.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { SpeechClient } from '@google-cloud/speech';
import * as logger from 'firebase-functions/logger';

// Initialize the Speech client
const speechClient = new SpeechClient();

export const transcribeAudio = onCall(
  {
    region: 'asia-south1',
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const { audioBase64, languageCode = 'en-IN' } = request.data as {
      audioBase64?: string;
      languageCode?: string;
    };

    if (!audioBase64) {
      throw new HttpsError('invalid-argument', 'Audio data is required.');
    }

    try {
      const audio = {
        content: audioBase64,
      };

      const config = {
        encoding: 'WEBM_OPUS' as const,
        sampleRateHertz: 48000,
        languageCode: languageCode,
        // Fallback languages if the worker mixes Hindi/English etc.
        alternativeLanguageCodes: ['hi-IN', 'en-US'],
        enableAutomaticPunctuation: true,
      };

      const requestObj = {
        audio: audio,
        config: config,
      };

      // Detects speech in the audio file
      const [response] = await speechClient.recognize(requestObj);
      const transcription = response.results
        ?.map((result) => result.alternatives?.[0]?.transcript)
        .join('\n');

      if (!transcription) {
        return { success: true, transcription: '' };
      }

      logger.info('[SPEECH_TO_TEXT] Transcription successful', { length: transcription.length });

      return { success: true, transcription };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[SPEECH_TO_TEXT] Failed', { error: message });
      throw new HttpsError('internal', `Transcription failed: ${message}`);
    }
  }
);
