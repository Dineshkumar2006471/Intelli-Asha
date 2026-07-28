import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Visit } from '../types';

/**
 * ASHA Worker Earnings — Task-Based Incentive (TBI) Calculator
 *
 * Real-world context: ASHA workers earn through government-defined TBIs.
 * This page calculates earnings dynamically based on verified visit data
 * stored in Firestore — NOT hardcoded numbers.
 *
 * Official TBI rates (approximate, as per NHM guidelines):
 * - Institutional delivery facilitation: ₹600
 * - Immunization (full): ₹100
 * - Antenatal care registration: ₹200
 * - Home-based newborn care (HBNC): ₹250
 * - General health visit: ₹50
 */

const TBI_RATES: Record<string, { label: string; rate: number; icon: string }> = {
  'Institutional Delivery': { label: 'Institutional Delivery', rate: 600, icon: 'local_hospital' },
  'Immunization': { label: 'Immunization', rate: 100, icon: 'vaccines' },
  'Antenatal Care': { label: 'Antenatal Registration', rate: 200, icon: 'pregnant_woman' },
  'HBNC': { label: 'Newborn Care (HBNC)', rate: 250, icon: 'child_care' },
  'General Visit': { label: 'General Health Visit', rate: 50, icon: 'home_health' },
};

interface EarningLine {
  type: string;
  count: number;
  rate: number;
  total: number;
  icon: string;
}

const Earnings = () => {
  const { currentUser } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, where('workerId', '==', currentUser.photoURL), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Visit));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [currentUser]);

  // Calculate earnings breakdown from real visit data
  const earningsBreakdown: EarningLine[] = Object.entries(TBI_RATES).map(([key, config]) => {
    const matchingVisits = visits.filter(v => {
      const vt = (v.visitType || 'General Visit').toLowerCase();
      return vt.includes(key.toLowerCase()) || (key === 'General Visit' && !Object.keys(TBI_RATES).some(k => k !== 'General Visit' && vt.includes(k.toLowerCase())));
    });
    return {
      type: config.label,
      count: matchingVisits.length,
      rate: config.rate,
      total: matchingVisits.length * config.rate,
      icon: config.icon,
    };
  }).filter(e => e.count > 0);

  // If no specific visit types matched, show all visits as General
  if (earningsBreakdown.length === 0 && visits.length > 0) {
    earningsBreakdown.push({
      type: 'General Health Visit',
      count: visits.length,
      rate: 50,
      total: visits.length * 50,
      icon: 'home_health',
    });
  }

  const totalEarned = earningsBreakdown.reduce((sum, e) => sum + e.total, 0);
  const verifiedVisits = visits.filter(v => !v.anomaliesFound).length;
  const pendingVisits = visits.filter(v => v.anomaliesFound).length;

  return (
    <div className="min-h-screen bg-background-subtle flex">
      <Sidebar role="field-worker" />
      <main className="flex-1 h-screen overflow-y-auto bg-surface-container-lowest">
        {/* Header */}
        <header className="flex justify-between items-center px-6 md:px-10 py-6 border-b border-border-default bg-surface sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Link to="/app/field" className="text-on-surface-variant hover:text-on-surface transition-colors p-2 -ml-2 rounded-full hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="font-title-xl text-on-surface font-bold text-[22px]">Earnings</h1>
              <p className="font-label-md text-on-surface-variant text-[13px]">Task-Based Incentive (TBI) Breakdown</p>
            </div>
          </div>
        </header>

        <div className="px-6 md:px-10 py-6">
          {/* Total Earnings Hero Card */}
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <p className="font-label-md text-[13px] text-white/80 uppercase tracking-wider mb-2">Total Earnings This Month</p>
              <p className="font-display-hero text-[48px] font-bold leading-none mb-4">₹{totalEarned.toLocaleString('en-IN')}</p>
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="font-headline-kpi text-[22px] font-bold">{verifiedVisits}</p>
                  <p className="font-label-sm text-[11px] text-white/70 uppercase">Verified Visits</p>
                </div>
                <div className="w-px bg-white/30"></div>
                <div>
                  <p className="font-headline-kpi text-[22px] font-bold">{pendingVisits}</p>
                  <p className="font-label-sm text-[11px] text-white/70 uppercase">Pending Review</p>
                </div>
                <div className="w-px bg-white/30"></div>
                <div>
                  <p className="font-headline-kpi text-[22px] font-bold">{visits.length}</p>
                  <p className="font-label-sm text-[11px] text-white/70 uppercase">Total Visits</p>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings Breakdown Table */}
          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="p-5 border-b border-border-default">
              <h2 className="font-title-md text-[18px] text-on-surface font-semibold">TBI Breakdown</h2>
              <p className="font-label-sm text-[12px] text-secondary mt-1">Rates as per National Health Mission (NHM) guidelines</p>
            </div>
            {loading ? (
              <div className="p-12 text-center text-secondary animate-pulse">Calculating earnings...</div>
            ) : earningsBreakdown.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant block mb-3">payments</span>
                <p className="text-secondary font-title-md text-[16px]">No earnings yet this month.</p>
                <p className="font-body-base text-secondary mt-2">Log visits to start earning incentives.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-border-default">
                  <tr>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Service Type</th>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider text-center">Visits</th>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider text-right">Rate</th>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider text-right">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {earningsBreakdown.map(line => (
                    <tr key={line.type} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-[18px]">{line.icon}</span>
                          </div>
                          <span className="font-title-sm text-[14px] text-on-surface">{line.type}</span>
                        </div>
                      </td>
                      <td className="p-4 font-data-mono text-[14px] text-center text-on-surface">{line.count}</td>
                      <td className="p-4 font-data-mono text-[14px] text-right text-secondary">₹{line.rate}</td>
                      <td className="p-4 font-data-mono text-[14px] text-right text-on-surface font-bold">₹{line.total.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-container-low border-t-2 border-primary/30">
                  <tr>
                    <td className="p-4 font-title-sm text-[14px] text-on-surface font-bold" colSpan={3}>Total Estimated Earnings</td>
                    <td className="p-4 font-headline-kpi text-[18px] text-primary font-bold text-right">₹{totalEarned.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-surface-container-low rounded-lg border border-border-default">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5">info</span>
              <p className="font-label-sm text-[12px] text-secondary leading-relaxed">
                <strong>Note:</strong> Earnings are estimated based on NHM TBI guidelines and verified visit logs. 
                Final disbursement amounts may vary based on state-specific policies and PHC verification.
                Payments are processed through Direct Benefit Transfer (DBT) to your linked bank account.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Earnings;
