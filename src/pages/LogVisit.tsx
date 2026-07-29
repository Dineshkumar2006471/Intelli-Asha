import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { processVisitVoiceNote } from '../services/aiAgent';
import { saveVisit } from '../services/db';
import { createLogger } from '../utils/logger';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useGeolocation } from '../hooks/useGeolocation';
import type { VisitData } from '../types';

const log = createLogger('LOG_VISIT');

const LogVisit = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [structuredData, setStructuredData] = useState<VisitData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const { isRecording, transcription, error: speechError, isSupported: speechSupported, startRecording, stopRecording } = useSpeechRecognition('en-IN');
  const { geoAnchor } = useGeolocation({ zoom: 14 });

  useEffect(() => {
    if (speechError) setError(speechError);
    else if (!speechSupported) setError('Speech Recognition API is not supported in this browser.');
  }, [speechError, speechSupported]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setStructuredData(null);
      setError(null);
      startRecording();
    }
  };

  const handleProcessVoiceNote = useCallback(async () => {
    if (!transcription.trim()) return;
    
    setIsProcessing(true);
    try {
      const data = await processVisitVoiceNote(transcription);
      setStructuredData(data);
      
      // USP Feature: Native Audio Feedback
      // Speak back the parsed data to the worker for confirmation
      if ('speechSynthesis' in window) {
        const textToSpeak = `Data extracted. Household ${data.householdName || 'Unknown'}, Child ${data.childName || 'Unknown'}, Weight ${data.weight || 'Unknown'}. Status is ${data.status}.`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        // Try to find an Indian English or Hindi voice if available
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN'));
        if (indianVoice) utterance.voice = indianVoice;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process voice note with AI.';
      setError(message);
      log.error('AI processing failed', err);
    } finally {
      setIsProcessing(false);
    }
  }, [transcription]);

  useEffect(() => {
    if (!isRecording && transcription.trim() && !structuredData && !isProcessing) {
      handleProcessVoiceNote();
    }
  }, [isRecording, transcription, structuredData, isProcessing, handleProcessVoiceNote]);

  const handleSubmit = async () => {
    if (!structuredData) return;
    
    setIsProcessing(true);

    try {
      await saveVisit({
        ...structuredData,
        rawTranscription: transcription,
        geoAnchor: geoAnchor ?? null
      }, currentUser?.photoURL ?? '');
      // Navigate back to Field Worker home after successful submission
      navigate('/app/field');
    } catch (err) {
      setError('Failed to save visit to database.');
      log.error('Failed to save visit', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      
      <main className="flex-1 h-full overflow-y-auto bg-surface-container-lowest">
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

        {/* USP Feature: Offline Sync Indicator */}
        {!isOnline && (
          <div className="p-4 bg-amber-100 text-amber-800 rounded-lg text-sm flex items-center gap-2 border border-amber-200">
            <span className="material-symbols-outlined text-[20px]">cloud_off</span>
            <span><strong>You are offline.</strong> Don't worry, you can still log visits. They will sync automatically when you reconnect.</span>
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
                <span>{isProcessing ? 'Saving...' : (!isOnline ? 'Save Offline' : 'Confirm & Submit')}</span>
                {!isProcessing && <span className="material-symbols-outlined ml-2" style={{fontVariationSettings: "'FILL' 0"}}>{!isOnline ? 'save' : 'send'}</span>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LogVisit;
