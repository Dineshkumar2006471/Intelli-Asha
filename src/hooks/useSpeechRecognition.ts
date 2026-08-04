import { useState, useRef, useCallback, useEffect } from 'react';
import { createLogger } from '../utils/logger';

const log = createLogger('SPEECH');

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  isProcessingAudio: boolean;
  transcription: string;
  audioBlob: Blob | null;
  isSupported: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  toggleRecording: () => void;
  reset: () => void;
}

export function useSpeechRecognition(lang = 'en-IN'): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isSupported && !recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
    }
  }, [isSupported]);

  const startRecording = useCallback(async () => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech Recognition API is not supported in this browser.');
      return;
    }

    try {
      setTranscription('');
      setAudioBlob(null);
      setError(null);
      
      // 1. Setup MediaRecorder for the raw audio blob
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const newAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(newAudioBlob);
        setIsProcessingAudio(false);
      };

      // 2. Setup Web Speech API for fast transcription
      const recognition = recognitionRef.current;
      recognition.lang = lang;
      
      let finalTranscript = '';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscription((finalTranscript + interimTranscript).trim());
      };

      recognition.onerror = (event: any) => {
        log.error('Speech recognition error', event.error);
        if (event.error !== 'no-speech') {
           setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      mediaRecorder.start();
      recognition.start();
      setIsRecording(true);
      log.info('Recording started (Web Speech API)');

    } catch (err) {
      log.error('Microphone access denied', err);
      setError('Microphone access denied or error occurred.');
      setIsRecording(false);
    }
  }, [isSupported, lang]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsProcessingAudio(true);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
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
    setAudioBlob(null);
    setError(null);
  }, []);

  return {
    isRecording,
    isProcessingAudio,
    transcription,
    audioBlob,
    isSupported,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    reset,
  };
}
