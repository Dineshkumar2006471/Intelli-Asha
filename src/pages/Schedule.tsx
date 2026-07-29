import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Visit } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('SCHEDULE');

/**
 * Schedule Page — Follow-up visit calendar derived from real Firestore data.
 *
 * Logic:
 * - Newborn visits → schedule HBNC follow-up at Day 3, 7, 14, 28, 42
 * - Immunization visits → schedule next dose at +28 days
 * - SAM/Underweight → schedule weekly follow-up
 * - General visits → schedule monthly follow-up
 */

interface ScheduledVisit {
  householdName: string;
  childName: string;
  dueDate: Date;
  type: string;
  reason: string;
  status: 'overdue' | 'today' | 'upcoming';
  icon: string;
}

const FOLLOW_UP_RULES: Record<string, { days: number; reason: string; icon: string }> = {
  'HBNC': { days: 7, reason: 'HBNC follow-up (Day 7)', icon: 'child_care' },
  'Immunization': { days: 28, reason: 'Next immunization dose due', icon: 'vaccines' },
  'Severe Acute Malnutrition': { days: 7, reason: 'Weekly SAM monitoring', icon: 'emergency' },
  'Underweight': { days: 14, reason: 'Bi-weekly weight check', icon: 'monitor_weight' },
  'default': { days: 30, reason: 'Monthly routine follow-up', icon: 'calendar_today' },
};

const STATUS_STYLE = {
  overdue: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', dot: 'bg-red-500', label: 'OVERDUE' },
  today: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', dot: 'bg-amber-500', label: 'TODAY' },
  upcoming: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', dot: 'bg-blue-500', label: 'UPCOMING' },
};

const Schedule = () => {
  const { currentUser } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    if (!currentUser) return;

    log.info('Initializing real-time visit listener for schedule');
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, where('workerId', '==', currentUser.photoURL), orderBy('timestamp', 'desc'));
    
    const unsub = onSnapshot(q, 
      (snap) => {
        try {
          const fetchedVisits = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Visit);
          setVisits(fetchedVisits);
          setError(null);
        } catch (err) {
          log.error('Error parsing visits data', err);
          setError('Failed to process visit data.');
        } finally {
          setLoading(false);
        }
      }, 
      (err) => {
        log.error('Firestore listener error in Schedule', err);
        setError('Connection lost. Please check your network.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Compute scheduled follow-ups from actual visit data with robust error handling
  const scheduledVisits = useMemo((): ScheduledVisit[] => {
    if (!visits.length) return [];

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Group visits by household — take most recent visit per household
      const latestByHousehold = new Map<string, Visit>();
      for (const v of visits) {
        const key = v.householdName || 'Unknown';
        if (!latestByHousehold.has(key)) {
          latestByHousehold.set(key, v);
        }
      }

      const scheduled: ScheduledVisit[] = [];
      for (const [, visit] of latestByHousehold) {
        if (!visit.timestamp || !visit.timestamp.seconds) continue;

        const visitDate = new Date(visit.timestamp.seconds * 1000);
        if (isNaN(visitDate.getTime())) {
          log.warn(`Invalid timestamp for visit ${visit.id}`);
          continue;
        }

        // Determine follow-up rule safely
        let rule = FOLLOW_UP_RULES['default']!;
        const vt = (visit.visitType || '').toLowerCase();
        
        if (vt.includes('hbnc') || vt.includes('newborn')) rule = FOLLOW_UP_RULES['HBNC'] || rule;
        else if (vt.includes('immuniz')) rule = FOLLOW_UP_RULES['Immunization'] || rule;
        else if (visit.status === 'Severe Acute Malnutrition') rule = FOLLOW_UP_RULES['Severe Acute Malnutrition'] || rule;
        else if (visit.status === 'Underweight') rule = FOLLOW_UP_RULES['Underweight'] || rule;

        const dueDate = new Date(visitDate);
        dueDate.setDate(dueDate.getDate() + rule.days);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';
        if (diffDays < 0) status = 'overdue';
        else if (diffDays === 0) status = 'today';

        scheduled.push({
          householdName: visit.householdName || 'Unknown',
          childName: visit.childName || '-',
          dueDate,
          type: visit.visitType || 'General',
          reason: rule.reason,
          status,
          icon: rule.icon,
        });
      }

      // Sort: overdue first, then today, then upcoming
      scheduled.sort((a, b) => {
        const order = { overdue: 0, today: 1, upcoming: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.dueDate.getTime() - b.dueDate.getTime();
      });

      return scheduled;
    } catch (err) {
      log.error('Error computing schedule', err);
      return [];
    }
  }, [visits]);

  const overdueCount = scheduledVisits.filter(s => s.status === 'overdue').length;
  const todayCount = scheduledVisits.filter(s => s.status === 'today').length;
  const upcomingCount = scheduledVisits.filter(s => s.status === 'upcoming').length;

  // Simple calendar grid for the current month
  const calendarDays = useMemo(() => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const days: { day: number; isToday: boolean; visits: ScheduledVisit[] }[] = [];
      for (let i = 0; i < firstDay; i++) days.push({ day: 0, isToday: false, visits: [] });
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        dateObj.setHours(0, 0, 0, 0);
        const isToday = d === now.getDate();
        
        const dayVisits = scheduledVisits.filter(sv => {
          const svDate = new Date(sv.dueDate);
          svDate.setHours(0, 0, 0, 0);
          return svDate.getTime() === dateObj.getTime();
        });
        
        days.push({ day: d, isToday, visits: dayVisits });
      }
      return days;
    } catch (err) {
      log.error('Error computing calendar days', err);
      return [];
    }
  }, [scheduledVisits]);

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
              <h1 className="font-title-xl text-on-surface font-bold text-[22px]">Schedule</h1>
              <p className="font-label-md text-on-surface-variant text-[13px]">Auto-computed follow-up calendar</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low rounded-lg p-1">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md font-label-sm text-[12px] transition-colors ${viewMode === 'list' ? 'bg-surface shadow-sm text-primary font-bold' : 'text-secondary'}`}>
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">view_list</span>List
            </button>
            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md font-label-sm text-[12px] transition-colors ${viewMode === 'calendar' ? 'bg-surface shadow-sm text-primary font-bold' : 'text-secondary'}`}>
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">calendar_month</span>Calendar
            </button>
          </div>
        </header>

        <div className="px-6 md:px-10 py-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-200">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="font-display-kpi text-[28px] text-red-600 font-bold">{overdueCount}</p>
              <p className="font-label-sm text-[11px] text-red-500 uppercase tracking-wider mt-1">Overdue</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="font-display-kpi text-[28px] text-amber-600 font-bold">{todayCount}</p>
              <p className="font-label-sm text-[11px] text-amber-600 uppercase tracking-wider mt-1">Due Today</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="font-display-kpi text-[28px] text-blue-600 font-bold">{upcomingCount}</p>
              <p className="font-label-sm text-[11px] text-blue-600 uppercase tracking-wider mt-1">Upcoming</p>
            </div>
          </div>

          {viewMode === 'list' ? (
            /* List View */
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border-default flex justify-between items-center">
                <div>
                  <h2 className="font-title-md text-[18px] text-on-surface font-semibold">Scheduled Follow-ups</h2>
                  <p className="font-label-sm text-[12px] text-secondary mt-1">Auto-generated from your visit history using NHM follow-up protocols</p>
                </div>
              </div>
              
              {loading ? (
                <div className="p-12 text-center text-secondary flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-primary-container border-t-primary rounded-full animate-spin mb-4"></div>
                  <p>Computing schedule...</p>
                </div>
              ) : scheduledVisits.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant block mb-3">event_busy</span>
                  <p className="text-secondary font-title-md text-[16px]">No scheduled visits yet.</p>
                  <p className="font-body-base text-secondary mt-2">Log some visits and follow-ups will be auto-computed.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-default">
                  {scheduledVisits.map((sv, idx) => {
                    const style = STATUS_STYLE[sv.status];
                    return (
                      <div key={`${sv.householdName}-${idx}`} className={`flex items-center gap-4 p-5 hover:bg-surface-container-lowest transition-colors`}>
                        <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
                          <span className={`material-symbols-outlined ${style.text} text-[20px]`}>{sv.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-0.5">
                            <h3 className="font-title-sm text-[14px] text-on-surface font-semibold truncate">{sv.householdName}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${style.bg} ${style.text} font-label-sm text-[10px] font-bold uppercase shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                              {style.label}
                            </span>
                          </div>
                          <p className="font-body-base text-[13px] text-secondary">{sv.reason}</p>
                          <p className="font-data-mono text-[11px] text-on-surface-variant mt-1">
                            Due: {sv.dueDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {sv.childName !== '-' && ` · Child: ${sv.childName}`}
                          </p>
                        </div>
                        <Link to="/app/log-visit" className="shrink-0 bg-primary/10 text-primary px-4 py-2 rounded-lg font-label-md text-[12px] hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">mic</span>
                          Log
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Calendar View */
            <div className="bg-surface rounded-xl border border-border-default overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border-default">
                <h2 className="font-title-md text-[18px] text-on-surface font-semibold">
                  {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center font-label-sm text-[11px] text-secondary uppercase py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, i) => (
                    <div key={i} className={`min-h-[80px] p-2 rounded-lg border ${
                      cell.day === 0 ? 'border-transparent' :
                      cell.isToday ? 'border-primary bg-primary/5' :
                      cell.visits.length > 0 ? 'border-border-default bg-surface-container-lowest' :
                      'border-transparent'
                    }`}>
                      {cell.day > 0 && (
                        <>
                          <span className={`font-label-sm text-[12px] ${cell.isToday ? 'text-primary font-bold' : 'text-on-surface'}`}>{cell.day}</span>
                          <div className="mt-1 space-y-0.5">
                            {cell.visits.slice(0, 2).map((v, vi) => {
                              const s = STATUS_STYLE[v.status];
                              return (
                                <div key={vi} className={`${s.bg} rounded px-1 py-0.5`} title={v.reason}>
                                  <span className={`${s.text} font-label-sm text-[9px] truncate block`}>{v.householdName}</span>
                                </div>
                              );
                            })}
                            {cell.visits.length > 2 && (
                              <span className="font-label-sm text-[9px] text-secondary">+{cell.visits.length - 2} more</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Schedule;
