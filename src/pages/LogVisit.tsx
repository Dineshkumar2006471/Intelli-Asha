import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveVisit, uploadAudioLog } from '../services/db';
import { processVisitVoiceNote } from '../services/aiAgent';
import type { VisitData, HealthStatus } from '../types';
import { createLogger } from '../utils/logger';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useGeolocation } from '../hooks/useGeolocation';

const log = createLogger('LOG_VISIT');

const LogVisit = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [structuredData, setStructuredData] = useState<VisitData | null>(null);
  const [isEditingData, setIsEditingData] = useState(false);
  const [editableTranscription, setEditableTranscription] = useState('');
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
  
  const [selectedLang, setSelectedLang] = useState('en-IN');
  
  const { 
    isRecording, 
    isProcessingAudio, 
    transcription, 
    audioBlob,
    error: speechError, 
    isSupported: speechSupported, 
    startRecording, 
    stopRecording 
  } = useSpeechRecognition(selectedLang);
  const { geoAnchor, locationName, districtName } = useGeolocation({ zoom: 14 });

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

  useEffect(() => {
    if (transcription) {
      setEditableTranscription(transcription);
    }
  }, [transcription]);

  const handleProcessVoiceNote = useCallback(async () => {
    if (!editableTranscription.trim()) return;
    
    setIsProcessing(true);
    try {
      const data = await processVisitVoiceNote(editableTranscription);
      setStructuredData(data);
      
      // USP Feature: Native Audio Feedback
      if ('speechSynthesis' in window) {
        const textToSpeak = `Data extracted. Household ${data.householdName || 'Unknown'}, Child ${data.childName || 'Unknown'}, Weight ${data.weight || 'Unknown'}. Status is ${data.status}.`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
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
  }, [editableTranscription]);

  // Removed auto-processing effect to allow manual editing

  const handleSubmit = async () => {
    if (!structuredData || !currentUser) return;
    
    setIsProcessing(true);

    try {
      let audioUrl: string | null = null;
      if (audioBlob) {
        try {
          const workerId = currentUser.photoURL || currentUser.uid;
          audioUrl = await uploadAudioLog(audioBlob, workerId);
        } catch (audioErr) {
          log.error('Audio upload failed (non-blocking)', audioErr);
        }
      }

      await saveVisit(
        {
          ...structuredData,
          rawTranscription: editableTranscription,
          audioUrl,
          geoAnchor: geoAnchor ?? null,
          locationName: locationName || 'Unknown District',
          districtName: districtName || 'Unknown District',
        },
        currentUser.uid
      );
      // Navigate back to Field Worker home after successful submission
      navigate('/app/field');
    } catch (err) {
      setError('Failed to save visit to database. Please check your connection and try again.');
      log.error('Failed to save visit', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex-1 bg-surface-container-lowest">
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
          <div className="flex flex-col items-center gap-2 mb-4">
            <label htmlFor="lang-select" className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Select Language</label>
            <select 
              id="lang-select" 
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={isRecording || isProcessingAudio || isProcessing}
              className="bg-surface-container-lowest border border-border-default text-on-surface font-body-base rounded-md px-3 py-2 outline-none focus:border-primary disabled:opacity-50"
            >
              <option value="en-US">English (Strict)</option>
              <option value="en-IN">English (India/Hinglish)</option>
              <option value="hi-IN">Hindi (हिंदी)</option>
              <option value="te-IN">Telugu (తెలుగు)</option>
              <option value="ta-IN">Tamil (தமிழ்)</option>
            </select>
          </div>

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
            {isProcessingAudio && <p className="font-title-md text-title-md text-primary animate-pulse mb-2">Transcribing audio (Google Speech-to-Text)...</p>}
            {isProcessing && !isProcessingAudio && <p className="font-title-md text-title-md text-primary animate-pulse mb-2">Understanding with Gemini AI...</p>}
            
            {editableTranscription && (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-center">Review Transcription (Edit if needed)</p>
                <textarea
                  value={editableTranscription}
                  onChange={(e) => setEditableTranscription(e.target.value)}
                  disabled={isProcessing}
                  className="w-full font-body-base text-body-base text-on-surface bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-border-default focus:border-primary outline-none resize-y min-h-[100px] disabled:opacity-50"
                  placeholder="Transcription will appear here..."
                />
                {!structuredData && !isProcessing && (
                  <button 
                    onClick={handleProcessVoiceNote}
                    className="w-full bg-primary-container text-on-primary font-title-sm text-title-sm py-3 rounded-lg shadow-sm hover:bg-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
                    Extract Data with AI
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
        {structuredData && (
          <section className="bg-surface-container-lowest border border-border-default rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border-default pb-4">
              <h2 className="font-title-md text-title-md text-on-surface">Structured Data Preview</h2>
              <button 
                onClick={() => setIsEditingData(!isEditingData)}
                className={`flex items-center gap-1 font-label-md text-label-md px-3 py-1.5 rounded-full transition-colors ${isEditingData ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 0"}}>
                  {isEditingData ? 'check' : 'edit'}
                </span>
                {isEditingData ? 'Done' : 'Edit'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 items-start">
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Household</span>
                {isEditingData ? (
                  <input type="text" value={structuredData.householdName || ''} onChange={(e) => setStructuredData({...structuredData, householdName: e.target.value})} className="w-full border border-border-default rounded px-2 py-1 font-body-base text-body-base bg-surface-container outline-none focus:border-primary" />
                ) : (
                  <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.householdName || '-'}</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Child Name</span>
                {isEditingData ? (
                  <input type="text" value={structuredData.childName || ''} onChange={(e) => setStructuredData({...structuredData, childName: e.target.value})} className="w-full border border-border-default rounded px-2 py-1 font-body-base text-body-base bg-surface-container outline-none focus:border-primary" />
                ) : (
                  <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.childName || '-'}</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Age</span>
                {isEditingData ? (
                  <input type="text" value={structuredData.childAge || ''} onChange={(e) => setStructuredData({...structuredData, childAge: e.target.value})} className="w-full border border-border-default rounded px-2 py-1 font-body-base text-body-base bg-surface-container outline-none focus:border-primary" />
                ) : (
                  <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.childAge || '-'}</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Weight</span>
                {isEditingData ? (
                  <input type="text" value={structuredData.weight || ''} onChange={(e) => setStructuredData({...structuredData, weight: e.target.value})} className="w-full border border-border-default rounded px-2 py-1 font-body-base text-body-base bg-surface-container outline-none focus:border-primary" />
                ) : (
                  <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.weight || '-'}</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Visit Type</span>
                {isEditingData ? (
                  <input type="text" value={structuredData.visitType || ''} onChange={(e) => setStructuredData({...structuredData, visitType: e.target.value})} className="w-full border border-border-default rounded px-2 py-1 font-body-base text-body-base bg-surface-container outline-none focus:border-primary" />
                ) : (
                  <span className="block font-body-base text-body-base text-on-surface font-medium">{structuredData.visitType || '-'}</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Condition</span>
                {isEditingData ? (
                  <select 
                    value={structuredData.status || 'Unknown'} 
                    onChange={(e) => setStructuredData({...structuredData, status: e.target.value as HealthStatus})} 
                    className="w-full border border-border-default rounded px-2 py-1 font-body-base text-body-base bg-surface-container outline-none focus:border-primary"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Underweight">Underweight</option>
                    <option value="Severe Acute Malnutrition">Severe Acute Malnutrition</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                ) : (
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${structuredData.status === 'Severe Acute Malnutrition' ? 'bg-error-container text-on-error-container' : structuredData.status === 'Underweight' ? 'bg-amber-100 text-amber-900' : structuredData.status === 'Normal' ? 'bg-green-100 text-green-800' : 'bg-surface-container-high text-on-surface'}`} role="status">
                    <span className="material-symbols-outlined text-[16px] mr-1.5" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">
                      {structuredData.status === 'Severe Acute Malnutrition' ? 'warning' : structuredData.status === 'Normal' ? 'check_circle' : 'info'}
                    </span>
                    <span className="font-label-sm text-label-sm uppercase">
                      {structuredData.status || 'Unknown'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Observations Section */}
            <div className="mt-6 pt-4 border-t border-border-default">
              <div className="flex justify-between items-center mb-3">
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Contextual Observations (Unstructured)</span>
                {isEditingData && (
                  <button
                    onClick={() => {
                      const newObs = [...(structuredData.observations || []), ""];
                      setStructuredData({ ...structuredData, observations: newObs });
                    }}
                    className="flex items-center text-primary hover:text-primary-dark font-label-sm text-label-sm transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1" style={{fontVariationSettings: "'FILL' 0"}}>add</span>
                    Add Observation
                  </button>
                )}
              </div>
              
              {(!structuredData.observations || structuredData.observations.length === 0) ? (
                <p className="font-body-base text-body-base text-on-surface-variant italic bg-surface-container-low p-3 rounded-md">
                  No additional context detected. (Tip: If the transcription was unclear, click Edit to add notes manually).
                </p>
              ) : (
                <ul className="list-disc pl-5 space-y-2">
                  {structuredData.observations.map((obs, idx) => (
                    <li key={idx} className="font-body-base text-body-base text-on-surface leading-relaxed flex items-start group">
                      {isEditingData ? (
                        <div className="flex w-full items-center gap-2">
                          <input
                            type="text"
                            value={obs}
                            onChange={(e) => {
                              const newObs = [...structuredData.observations!];
                              newObs[idx] = e.target.value;
                              setStructuredData({ ...structuredData, observations: newObs });
                            }}
                            className="w-full border border-border-default rounded px-3 py-1.5 font-body-base text-body-base bg-surface-container outline-none focus:border-primary transition-colors"
                            placeholder="Enter observation..."
                          />
                          <button
                            onClick={() => {
                              const newObs = structuredData.observations!.filter((_, i) => i !== idx);
                              setStructuredData({ ...structuredData, observations: newObs });
                            }}
                            className="text-error hover:bg-error-container p-1 rounded-full transition-colors"
                            aria-label="Delete observation"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      ) : (
                        <span>{obs}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
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
                aria-label={!isOnline ? 'Save Visit Offline' : 'Confirm and Submit Visit'}
                className="w-full md:w-auto min-w-[240px] bg-primary-container text-on-primary font-title-sm text-title-sm py-3 px-8 rounded-lg shadow-sm hover:bg-primary transition-colors flex justify-center items-center active:scale-[0.98] disabled:opacity-50"
              >
                <span>{isProcessing ? 'Saving...' : (!isOnline ? 'Save Offline' : 'Confirm & Submit')}</span>
                {!isProcessing && <span className="material-symbols-outlined ml-2" style={{fontVariationSettings: "'FILL' 0"}}>{!isOnline ? 'save' : 'send'}</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogVisit;
