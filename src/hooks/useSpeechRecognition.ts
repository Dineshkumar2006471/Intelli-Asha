import { useState, useRef, useEffect, useCallback } from 'react';
import { createLogger } from '../utils/logger';

const log = createLogger('SPEECH');

// Web Speech API type augmentation
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface UseSpeechRecognitionReturn {
  /** Whether the browser is actively recording audio */
  isRecording: boolean;
  /** Current transcription text (interim + final results) */
  transcription: string;
  /** Whether the Speech Recognition API is supported */
  isSupported: boolean;
  /** Error message, if any */
  error: string | null;
  /** Start recording — clears previous transcription */
  startRecording: () => void;
  /** Stop recording */
  stopRecording: () => void;
  /** Toggle recording on/off */
  toggleRecording: () => void;
  /** Clear the current transcription and error state */
  reset: () => void;
}

/**
 * Custom hook that encapsulates Web Speech API logic.
 * Extracts speech recognition concerns from LogVisit into a reusable, testable hook.
 *
 * @param lang - BCP 47 language tag for recognition (default: 'en-IN')
 *
 * @example
 * ```tsx
 * const { isRecording, transcription, toggleRecording } = useSpeechRecognition('en-IN');
 * ```
 */
export function useSpeechRecognition(lang = 'en-IN'): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      setError('Speech Recognition API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const resultItem = event.results[i];
        if (resultItem?.[0]) {
          currentTranscript += resultItem[0].transcript;
        }
      }
      setTranscription(currentTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      log.error('Speech recognition error', { error: event.error });
      setIsRecording(false);
      setError('Microphone error: ' + event.error);
    };

    recognitionRef.current = recognition;
  }, [lang]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscription('');
    setError(null);
    recognitionRef.current.start();
    setIsRecording(true);
    log.info('Recording started');
  }, []);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsRecording(false);
    log.info('Recording stopped');
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const reset = useCallback(() => {
    setTranscription('');
    setError(null);
  }, []);

  return {
    isRecording,
    transcription,
    isSupported,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    reset,
  };
}
