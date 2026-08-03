import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import type { Visit } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('SMART_ROUTE');

const functions = getFunctions(app, 'asia-south1');

/** USP Feature: AI Triage & Smart Routing
 *  Instead of random visit order, the Analytics Agent sorts households by severity.
 *  "Severe Acute Malnutrition" cases surface to the top of the list.
 */

interface TriagedHousehold {
  name: string;
  lastStatus: string;
  lastVisitDate: string;
  priority: 'critical' | 'high' | 'medium' | 'routine';
  reason: string;
  visitType: string;
}

const PRIORITY_CONFIG = {
  critical: { color: 'bg-red-500', border: 'border-red-400', text: 'text-red-500', bg: 'bg-red-50', icon: 'emergency', label: 'CRITICAL' },
  high:     { color: 'bg-flagged-amber', border: 'border-flagged-amber', text: 'text-flagged-amber', bg: 'bg-amber-50', icon: 'priority_high', label: 'HIGH' },
  medium:   { color: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-600', bg: 'bg-blue-50', icon: 'info', label: 'MEDIUM' },
  routine:  { color: 'bg-verified-green', border: 'border-verified-green', text: 'text-verified-green', bg: 'bg-green-50', icon: 'check_circle', label: 'ROUTINE' },
};

const SmartRoute = () => {
  const { currentUser } = useAuth();
  const { locationName, loading: geoLoading } = useGeolocation({ zoom: 14, fallback: 'Unknown Block' });
  const [visits, setVisits] = useState<Visit[]>([]);
  const [triagedList, setTriagedList] = useState<TriagedHousehold[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(false);

  // Real-time listener: fetch worker's past visits
  useEffect(() => {
    if (!currentUser) return;
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, where('workerId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Visit);
      setVisits(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [currentUser]);

  // AI Triage: Once visits are loaded, ask backend Triage Agent to prioritize them
  const runTriage = useCallback(async () => {
    if (visits.length === 0) {
      setTriagedList([]);
      return;
    }
    setAiProcessing(true);
    try {
      const householdSummaries = visits.slice(0, 20).map(v => ({
        household: v.householdName,
        status: v.status,
        visitType: v.visitType,
        date: v.timestamp ? new Date(v.timestamp.seconds * 1000).toISOString().split('T')[0] : 'Unknown',
        flagged: v.anomaliesFound ?? false,
      }));

      const generateSmartRoute = httpsCallable<
        { visits: typeof householdSummaries },
        { success: boolean; data: TriagedHousehold[] }
      >(functions, 'generateSmartRoute');

      const result = await generateSmartRoute({ visits: householdSummaries });

      if (result.data.success && result.data.data) {
        setTriagedList(result.data.data);
        log.info('AI Triage completed via Cloud Function', { count: result.data.data.length });
      } else {
        throw new Error('Triage Agent returned unsuccessful response');
      }
    } catch (err) {
      log.error('AI Triage failed, using fallback sort', err);
      // Fallback: manual severity sort
      const fallback: TriagedHousehold[] = visits.slice(0, 15).map(v => ({
        name: v.householdName,
        lastStatus: v.status,
        lastVisitDate: v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleDateString() : 'Unknown',
        priority: v.status === 'Severe Acute Malnutrition' ? 'critical' as const
          : v.status === 'Underweight' || v.anomaliesFound ? 'high' as const
          : 'routine' as const,
        reason: v.anomaliesFound ? 'Previously flagged by verification agent' : 'Standard follow-up',
        visitType: v.visitType || 'General Visit',
      }));
      fallback.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, routine: 3 };
        return order[a.priority] - order[b.priority];
      });
      setTriagedList(fallback);
    } finally {
      setAiProcessing(false);
    }
  }, [visits]);

  useEffect(() => {
    if (!loading && visits.length > 0) runTriage();
  }, [loading, visits.length, runTriage]);

  const criticalCount = triagedList.filter(h => h.priority === 'critical').length;
  const highCount = triagedList.filter(h => h.priority === 'high').length;

  return (
    <div className="flex flex-col h-full w-full">
            <main className="flex-1 h-full overflow-y-auto bg-surface-container-lowest">
        {/* Header */}
        <header className="flex justify-between items-center px-6 md:px-10 py-6 border-b border-border-default bg-surface sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Link to="/app/field" className="text-on-surface-variant hover:text-on-surface transition-colors p-2 -ml-2 rounded-full hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="font-title-xl text-on-surface font-bold text-[22px]">Smart Route</h1>
              <p className="font-label-md text-on-surface-variant text-[13px]">
                AI-prioritized visits for {geoLoading ? 'Detecting...' : locationName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aiProcessing ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full font-label-sm text-[11px] animate-pulse">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                Triage Agent Running...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-verified-bg text-verified-green rounded-full font-label-sm text-[11px]">
                <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                AI Triage Complete
              </span>
            )}
          </div>
        </header>

        <div className="px-6 md:px-10 py-6">
          {/* Priority Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <span className="font-label-sm text-[11px] text-red-500 uppercase tracking-wider">Critical</span>
              <p className="font-display-kpi text-[28px] text-red-600 font-bold mt-1">{criticalCount}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <span className="font-label-sm text-[11px] text-amber-600 uppercase tracking-wider">High</span>
              <p className="font-display-kpi text-[28px] text-amber-600 font-bold mt-1">{highCount}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <span className="font-label-sm text-[11px] text-blue-600 uppercase tracking-wider">Medium</span>
              <p className="font-display-kpi text-[28px] text-blue-600 font-bold mt-1">{triagedList.filter(h => h.priority === 'medium').length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <span className="font-label-sm text-[11px] text-green-600 uppercase tracking-wider">Routine</span>
              <p className="font-display-kpi text-[28px] text-green-600 font-bold mt-1">{triagedList.filter(h => h.priority === 'routine').length}</p>
            </div>
          </div>

          {/* Prioritized Visit List */}
          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="p-5 border-b border-border-default flex items-center justify-between">
              <h2 className="font-title-md text-[18px] text-on-surface font-semibold">Today's Prioritized Visits</h2>
              <button onClick={runTriage} disabled={aiProcessing} className="text-primary font-label-sm text-[12px] hover:underline disabled:opacity-50 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Re-triage
              </button>
            </div>

            {loading || aiProcessing ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-primary-container border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-secondary font-body-base">{aiProcessing ? 'AI Triage Agent is analyzing visit history...' : 'Loading visits...'}</p>
              </div>
            ) : triagedList.length === 0 ? (
              <div className="p-12 text-center text-secondary">
                <span className="material-symbols-outlined text-[48px] mb-4 block text-on-surface-variant">route</span>
                <p className="font-title-md text-[16px]">No visits to triage yet.</p>
                <p className="font-body-base mt-2">Log a few visits first, then come back to see your AI-optimized route.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-default">
                {triagedList.map((household, idx) => {
                  const config = PRIORITY_CONFIG[household.priority] || PRIORITY_CONFIG.routine;
                  return (
                    <div key={idx} className={`flex items-start gap-4 p-5 hover:bg-surface-container-lowest transition-colors ${idx === 0 ? '' : ''}`}>
                      {/* Priority Order Number */}
                      <div className={`w-10 h-10 rounded-full ${config.color} text-white flex items-center justify-center font-bold text-[14px] shrink-0 shadow-sm`}>
                        {idx + 1}
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-title-sm text-[15px] text-on-surface font-semibold truncate">{household.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text} font-label-sm text-[10px] font-bold uppercase shrink-0`}>
                            <span className="material-symbols-outlined text-[12px]">{config.icon}</span>
                            {config.label}
                          </span>
                        </div>
                        <p className="font-body-base text-[13px] text-secondary leading-relaxed">{household.reason}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="font-label-sm text-[11px] text-on-surface-variant">Last: {household.lastStatus}</span>
                          <span className="font-data-mono text-[11px] text-on-surface-variant">{household.lastVisitDate}</span>
                          <span className="font-label-sm text-[11px] text-on-surface-variant">{household.visitType}</span>
                        </div>
                      </div>
                      {/* Action */}
                      <Link to="/app/log-visit" className="shrink-0 bg-primary/10 text-primary px-4 py-2 rounded-lg font-label-md text-[12px] hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">mic</span>
                        Log Visit
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SmartRoute;
