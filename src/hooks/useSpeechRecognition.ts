import { useState, useRef, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const log = createLogger('SPEECH');
const functions = getFunctions(app, 'asia-south1');

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
  
  // MediaRecorder API is supported in modern browsers
  const isSupported = !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      setTranscription('');
      setAudioBlob(null);
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use webm opus if available
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
        
        setIsProcessingAudio(true);
        const newAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(newAudioBlob);
        
        try {
          // Convert Blob to Base64
          const reader = new FileReader();
          reader.readAsDataURL(newAudioBlob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string)?.split(',')[1];
            if (!base64data) {
              setError('Failed to encode audio.');
              setIsProcessingAudio(false);
              return;
            }
            
            log.info('Sending audio to Cloud Function', { size: base64data.length });
            
            const transcribeAudio = httpsCallable<{ audioBase64: string; languageCode: string }, { success: boolean; transcription: string }>(functions, 'transcribeAudio');
            
            const result = await transcribeAudio({
              audioBase64: base64data,
              languageCode: lang
            });

            if (result.data.success && result.data.transcription) {
              setTranscription(result.data.transcription);
            } else {
              setError('No speech detected or transcription failed.');
            }
            setIsProcessingAudio(false);
          };
        } catch (err) {
          log.error('Speech-to-Text failed', err);
          setError('Failed to transcribe audio.');
          setIsProcessingAudio(false);
        }
      };

      mediaRecorder.start(200); // 200ms timeslices
      setIsRecording(true);
      log.info('Recording started');

    } catch (err) {
      log.error('Microphone access denied', err);
      setError('Microphone access denied or error occurred.');
      setIsRecording(false);
    }
  }, [isSupported, lang]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      log.info('Recording stopped');
    }
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
