import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { processVisitVoiceNote } from '../services/aiAgent';
import { saveVisit } from '../services/db';
import Sidebar from '../components/Sidebar';
import type { VisitData, GeoAnchor } from '../types';

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

const LogVisit = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [structuredData, setStructuredData] = useState<VisitData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const resultItem = event.results[i];
          if (resultItem && resultItem[0]) {
            currentTranscript += resultItem[0].transcript;
          }
        }
        setTranscription(currentTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        setError('Microphone error: ' + event.error);
      };

      recognitionRef.current = recognition;
    } else {
      setError('Speech Recognition API is not supported in this browser.');
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      handleProcessVoiceNote();
    } else {
      setTranscription('');
      setStructuredData(null);
      setError(null);
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleProcessVoiceNote = async () => {
    if (!transcription.trim()) return;
    
    setIsProcessing(true);
    try {
      const data = await processVisitVoiceNote(transcription);
      setStructuredData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process voice note with AI.';
      setError(message);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!structuredData) return;
    
    setIsProcessing(true);

    const captureLocation = (): Promise<GeoAnchor | null> => new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }),
          (geoErr) => {
            console.warn('Geolocation error', geoErr);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    });

    try {
      const geoAnchor = await captureLocation();

      await saveVisit({
        ...structuredData,
        rawTranscription: transcription,
        geoAnchor: geoAnchor ?? null
      }, currentUser?.photoURL ?? '');
      // Navigate back to Field Worker home after successful submission
      navigate('/app/field');
    } catch (err) {
      setError('Failed to save visit to database.');
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-subtle flex">
      <Sidebar role="field-worker" />

      <main className="flex-1 h-screen overflow-y-auto bg-surface-container-lowest">
        <header className="bg-surface-container-lowest flex justify-between items-center px-margin-tablet lg:px-margin-desktop py-6 border-b border-border-default sticky top-0 z-50">
          <div className="flex items-center space-x-4">
            <Link to="/app/field" aria-label="Go back" className="text-on-surface-variant hover:text-on-surface transition-colors p-2 -ml-2 rounded-full hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 0"}}>arrow_back</span>
            </Link>
            <h1 className="font-title-lg text-title-lg text-on-surface">Log Visit</h1>
          </div>
        </header>

        <div className="flex flex-col px-margin-tablet lg:px-margin-desktop py-12 max-w-max-width mx-auto w-full space-y-12">
        
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <section className="flex flex-col items-center justify-center space-y-6 py-4">
          <p className="font-title-md text-title-md text-on-surface-variant text-center max-w-2xl">
            Tap to speak. Try saying:<br />
            <span className="italic text-on-surface font-semibold">"Visited Sharma household. Child Rahul, weight 12kg. Standard checkup."</span>
          </p>

          <div className="relative flex items-center justify-center w-32 h-32">
            {isRecording && (
              <div className="absolute inset-0 bg-primary-container rounded-full opacity-50 animate-ping"></div>
            )}
            <button 
              onClick={toggleRecording}
              disabled={isProcessing}
              aria-label={isRecording ? "Stop recording" : "Start recording"} 
              className={`relative z-10 w-28 h-28 ${isRecording ? 'bg-error text-white' : 'bg-primary-container text-on-primary'} rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50`}
            >
              <span className="material-symbols-outlined text-6xl" style={{fontVariationSettings: "'FILL' 1"}}>
                {isRecording ? 'stop' : 'mic'}
              </span>
            </button>
          </div>

          <div className="min-h-[48px] flex flex-col items-center justify-center w-full max-w-2xl" aria-live="polite" aria-atomic="true">
            {isRecording && <p className="font-title-md text-title-md text-primary animate-pulse mb-2">Listening...</p>}
            {isProcessing && <p className="font-title-md text-title-md text-primary animate-pulse mb-2">Understanding with Gemini AI...</p>}
            
            {transcription && (
              <p className="font-title-sm text-title-sm text-on-surface-variant text-center bg-surface-container-low p-4 rounded-lg w-full shadow-sm">
                "{transcription}"
              </p>
            )}
          </div>
        </section>

        {structuredData && (
          <section className="bg-surface-container-lowest border border-border-default rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border-default pb-4">
              <h2 className="font-title-md text-title-md text-on-surface">Structured Data Preview</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 items-start">
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Household</span>
                <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.householdName || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Child Name</span>
                <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.childName || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Weight</span>
                <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.weight || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Visit Type</span>
                <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.visitType || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</span>
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface`} role="status">
                  <span className="material-symbols-outlined text-[16px] mr-1.5" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">
                    pending
                  </span>
                  <span className="font-label-sm text-label-sm uppercase">
                    Pending Verification
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
        </div>

        {structuredData && (
          <div className="bg-surface-container-lowest border-t border-border-default p-4 sticky bottom-0 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] mt-auto">
            <div className="max-w-max-width mx-auto w-full flex justify-end">
              <button 
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full md:w-auto min-w-[240px] bg-primary-container text-on-primary font-title-sm text-title-sm py-3 px-8 rounded-lg shadow-sm hover:bg-primary transition-colors flex justify-center items-center active:scale-[0.98] disabled:opacity-50"
              >
                <span>{isProcessing ? 'Saving...' : 'Confirm & Submit'}</span>
                {!isProcessing && <span className="material-symbols-outlined ml-2" style={{fontVariationSettings: "'FILL' 0"}}>send</span>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LogVisit;
