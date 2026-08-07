import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveVisit, uploadAudioLog } from '../services/db';
import { processVisitVoiceNote } from '../services/aiAgent';
import type { VisitData, HealthStatus } from '../types';
import { createLogger } from '../utils/logger';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useGeolocation } from '../hooks/useGeolocation';
import ReactMarkdown from 'react-markdown';

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

  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [overrideLocation, setOverrideLocation] = useState<{name: string, lat: number, lng: number} | null>(null);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocation.trim()) return;
    setGeocodingError(null);
    setIsProcessing(true);
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(manualLocation)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        setOverrideLocation({
          name: manualLocation,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        });
        setIsEditingLocation(false);
      } else {
        setGeocodingError('Location not found. Try adding a district or state.');
      }
    } catch (err) {
      setGeocodingError('Geocoding failed. Check connection.');
    } finally {
      setIsProcessing(false);
    }
  };

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
          geoAnchor: overrideLocation ? { lat: overrideLocation.lat, lng: overrideLocation.lng, accuracy: 100 } : (geoAnchor ?? null),
          locationName: overrideLocation ? overrideLocation.name : (locationName || 'Unknown District'),
          districtName: overrideLocation ? overrideLocation.name : (districtName || 'Unknown District'),
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
    <div className="flex flex-col w-full h-full min-h-screen bg-surface-variant">
      <header className="bg-surface-container-lowest flex justify-between items-center px-6 py-4 border-b border-border-default sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <Link to="/app/field" aria-label="Go back" className="text-on-surface-variant hover:text-on-surface transition-colors p-2 -ml-2 rounded-full hover:bg-surface-container-low">
            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 0"}}>arrow_back</span>
          </Link>
          <h1 className="font-title-lg text-title-lg text-on-surface">Log Visit</h1>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-8">
        
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {!isOnline && (
          <div className="p-4 bg-amber-100 text-amber-800 rounded-lg text-sm flex items-center gap-2 border border-amber-200 mb-6">
            <span className="material-symbols-outlined text-[20px]">cloud_off</span>
            <span><strong>You are offline.</strong> Don't worry, you can still log visits. They will sync automatically when you reconnect.</span>
          </div>
        )}

        {/* MANUAL LOCATION OVERRIDE UI */}
        <div className="mb-6 bg-surface-container-low p-4 rounded-lg border border-border-default flex items-center justify-between shadow-sm">
          <div>
            <span className="font-label-sm text-secondary uppercase tracking-wider block mb-1">Current Location</span>
            {isEditingLocation ? (
              <form onSubmit={handleManualLocationSubmit} className="flex gap-2 items-center">
                <input 
                  type="text" 
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="e.g. YSR Kadapa District"
                  className="border border-border-default rounded px-3 py-1 text-sm bg-surface text-on-surface w-64 focus:border-primary outline-none"
                  autoFocus
                />
                <button type="submit" className="bg-primary text-on-primary px-3 py-1 rounded text-sm hover:bg-primary-dark disabled:opacity-50 transition-colors" disabled={isProcessing}>
                  {isProcessing ? 'Searching...' : 'Save'}
                </button>
                <button type="button" onClick={() => setIsEditingLocation(false)} className="text-secondary hover:text-on-surface text-sm transition-colors">Cancel</button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-body-base font-medium text-on-surface">
                  {overrideLocation ? overrideLocation.name : (locationName || 'Detecting...')}
                </span>
                {(!geoAnchor && !overrideLocation) && <span className="text-xs text-error font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">warning</span> No GPS Found</span>}
              </div>
            )}
            {geocodingError && <p className="text-error text-xs mt-1">{geocodingError}</p>}
          </div>
          {!isEditingLocation && (
            <button 
              onClick={() => {
                setManualLocation(overrideLocation ? overrideLocation.name : (districtName || ''));
                setIsEditingLocation(true);
              }}
              className="text-primary hover:bg-surface-variant px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">edit_location</span>
              Override Location
            </button>
          )}
        </div>

        {/* SPLIT SCREEN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT PANEL - DATA ENTRY */}
          <section className="bg-surface-container-lowest border border-border-default rounded-xl p-6 shadow-sm flex flex-col items-center justify-start space-y-8 lg:h-[650px] overflow-y-auto">
            <div className="w-full flex justify-between items-center border-b border-border-default pb-4">
              <h2 className="font-title-md text-title-md text-on-surface">1. Voice Input</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="lang-select" className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Language:</label>
                <select 
                  id="lang-select" 
                  value={selectedLang} 
                  onChange={(e) => setSelectedLang(e.target.value)}
                  disabled={isRecording || isProcessingAudio || isProcessing}
                  className="bg-surface border border-border-default text-on-surface font-body-base rounded-md px-2 py-1 outline-none focus:border-primary disabled:opacity-50 text-sm"
                >
                  <option value="en-US">English (Strict)</option>
                  <option value="en-IN">English (India/Hinglish)</option>
                  <option value="hi-IN">Hindi (हिंदी)</option>
                  <option value="te-IN">Telugu (తెలుగు)</option>
                  <option value="ta-IN">Tamil (தமிழ்)</option>
                </select>
              </div>
            </div>

            <p className="font-body-base text-body-base text-on-surface-variant text-center max-w-md">
              Tap to speak. Try saying:<br />
              <span className="italic text-on-surface font-semibold">"Visited Sharma household. Child Rahul, weight 12kg. Standard checkup."</span>
            </p>

            <div className="relative flex items-center justify-center w-32 h-32 flex-shrink-0">
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

            <div className="w-full flex-1 flex flex-col items-center justify-start min-h-[250px]" aria-live="polite" aria-atomic="true">
              {isRecording && <p className="font-title-md text-title-md text-primary animate-pulse mb-2">Listening...</p>}
              {isProcessingAudio && <p className="font-title-md text-title-md text-primary animate-pulse mb-2">Transcribing audio (Google Speech-to-Text)...</p>}
              {isProcessing && !isProcessingAudio && <p className="font-title-md text-title-md text-primary animate-pulse mb-2">Understanding with Gemini AI...</p>}
              
              {editableTranscription && (
                <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 mt-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-end">
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Review Transcription</p>
                    <span className="font-label-sm text-on-surface-variant italic">Edit if needed</span>
                  </div>
                  <textarea
                    value={editableTranscription}
                    onChange={(e) => setEditableTranscription(e.target.value)}
                    disabled={isProcessing}
                    className="flex-1 w-full font-body-base text-body-base text-on-surface bg-surface-variant p-4 rounded-lg shadow-inner border border-border-default focus:border-primary outline-none resize-none min-h-[150px] disabled:opacity-50"
                    placeholder="Transcription will appear here..."
                  />
                  {!structuredData && !isProcessing && (
                    <button 
                      onClick={handleProcessVoiceNote}
                      className="w-full bg-primary text-on-primary font-title-md text-title-md py-4 rounded-lg shadow-md hover:bg-primary-dark transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
                      Generate Professional Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT PANEL - REPORT & DATA */}
          {!structuredData ? (
            <section className="hidden lg:flex bg-surface-container-low border border-border-default border-dashed rounded-xl p-6 lg:h-[650px] flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[64px] text-on-surface-variant opacity-50 mb-4">analytics</span>
              <h2 className="font-title-lg text-on-surface-variant opacity-70">Awaiting Data</h2>
              <p className="font-body-base text-on-surface-variant opacity-70 mt-2 max-w-sm">Record a visit and generate an AI report to view the structured analysis and professional case summary here.</p>
            </section>
          ) : (
            <section className="bg-surface-container-lowest border border-border-default rounded-xl p-0 shadow-sm flex flex-col lg:h-[650px] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Header */}
              <div className="bg-primary-container p-6 border-b border-border-default flex justify-between items-center">
                <div>
                  <h2 className="font-title-lg text-title-lg text-on-primary-container">Medical Case Summary</h2>
                  <p className="font-body-base text-on-primary-container/80 mt-1">Generated by IntelliASHA Field Agent</p>
                </div>
                <button 
                  onClick={() => setIsEditingData(!isEditingData)}
                  className={`flex items-center gap-1 font-label-md px-4 py-2 rounded-full transition-colors bg-surface text-primary hover:bg-surface-variant shadow-sm`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 0"}}>
                    {isEditingData ? 'check' : 'edit'}
                  </span>
                  {isEditingData ? 'Done Editing' : 'Edit Data'}
                </button>
              </div>
              
              <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
                {/* Structured Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface p-4 rounded-lg border border-border-default">
                    <span className="block font-label-sm text-secondary uppercase tracking-wider mb-1">Household</span>
                    {isEditingData ? (
                      <input type="text" value={structuredData.householdName || ''} onChange={(e) => setStructuredData({...structuredData, householdName: e.target.value})} className="w-full border-b border-primary bg-transparent outline-none font-medium" />
                    ) : (
                      <span className="block font-body-base font-medium">{structuredData.householdName || '-'}</span>
                    )}
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-border-default">
                    <span className="block font-label-sm text-secondary uppercase tracking-wider mb-1">Child Name</span>
                    {isEditingData ? (
                      <input type="text" value={structuredData.childName || ''} onChange={(e) => setStructuredData({...structuredData, childName: e.target.value})} className="w-full border-b border-primary bg-transparent outline-none font-medium" />
                    ) : (
                      <span className="block font-body-base font-medium">{structuredData.childName || '-'}</span>
                    )}
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-border-default">
                    <span className="block font-label-sm text-secondary uppercase tracking-wider mb-1">Age</span>
                    {isEditingData ? (
                      <input type="text" value={structuredData.childAge || ''} onChange={(e) => setStructuredData({...structuredData, childAge: e.target.value})} className="w-full border-b border-primary bg-transparent outline-none font-medium" />
                    ) : (
                      <span className="block font-body-base font-medium">{structuredData.childAge || '-'}</span>
                    )}
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-border-default">
                    <span className="block font-label-sm text-secondary uppercase tracking-wider mb-1">Weight</span>
                    {isEditingData ? (
                      <input type="text" value={structuredData.weight || ''} onChange={(e) => setStructuredData({...structuredData, weight: e.target.value})} className="w-full border-b border-primary bg-transparent outline-none font-medium" />
                    ) : (
                      <span className="block font-body-base font-medium">{structuredData.weight || '-'}</span>
                    )}
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-border-default">
                    <span className="block font-label-sm text-secondary uppercase tracking-wider mb-1">Condition</span>
                    {isEditingData ? (
                      <select 
                        value={structuredData.status || 'Unknown'} 
                        onChange={(e) => setStructuredData({...structuredData, status: e.target.value as HealthStatus})} 
                        className="w-full border-b border-primary bg-transparent outline-none font-medium"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Underweight">Underweight</option>
                        <option value="Severe Acute Malnutrition">Severe Acute Malnutrition</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    ) : (
                      <div className={`inline-flex items-center px-2 py-1 rounded-md ${structuredData.status === 'Severe Acute Malnutrition' ? 'bg-error-container text-error' : structuredData.status === 'Underweight' ? 'bg-amber-100 text-amber-900' : structuredData.status === 'Normal' ? 'bg-verified-bg text-verified-green' : 'bg-surface-variant text-secondary'}`}>
                        <span className="font-label-sm uppercase font-bold">
                          {structuredData.status || 'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-border-default">
                    <span className="block font-label-sm text-secondary uppercase tracking-wider mb-1">Visit Type</span>
                    {isEditingData ? (
                      <input type="text" value={structuredData.visitType || ''} onChange={(e) => setStructuredData({...structuredData, visitType: e.target.value})} className="w-full border-b border-primary bg-transparent outline-none font-medium" />
                    ) : (
                      <span className="block font-body-base font-medium">{structuredData.visitType || '-'}</span>
                    )}
                  </div>
                </div>

                {/* Professional Report Render (Markdown) */}
                <div className="flex-1 bg-surface rounded-lg border border-border-default p-6 shadow-inner">
                  <span className="block font-label-sm text-secondary uppercase tracking-wider mb-4 border-b border-border-default pb-2">Medical Officer's Assessment</span>
                  {isEditingData ? (
                    <textarea 
                      value={structuredData.professionalReport || ''} 
                      onChange={(e) => setStructuredData({...structuredData, professionalReport: e.target.value})} 
                      className="w-full h-64 border border-border-default bg-transparent outline-none font-body-base p-2 rounded focus:border-primary resize-none"
                    />
                  ) : (
                    <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-headings:font-title-md prose-headings:text-on-surface prose-p:text-on-surface prose-li:text-on-surface prose-strong:text-primary">
                      {structuredData.professionalReport ? (
                        <ReactMarkdown>{structuredData.professionalReport}</ReactMarkdown>
                      ) : (
                        <p className="text-secondary italic">No additional medical assessment generated.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-surface p-6 border-t border-border-default mt-auto">
                <button 
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="w-full bg-primary text-on-primary font-title-md py-4 rounded-lg shadow-md hover:bg-primary-dark transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{isProcessing ? 'Saving...' : (!isOnline ? 'Save Visit Offline' : 'Confirm & Submit to DHIS2')}</span>
                  {!isProcessing && <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>{!isOnline ? 'save' : 'cloud_upload'}</span>}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogVisit;
