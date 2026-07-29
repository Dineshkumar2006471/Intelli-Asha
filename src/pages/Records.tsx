import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Visit } from '../types';

const Records = () => {
  const { currentUser } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'verified'>('all');

  useEffect(() => {
    if (!currentUser) return;
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, where('workerId', '==', currentUser.photoURL), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Visit);
      setVisits(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [currentUser]);

  const filtered = filter === 'all' ? visits
    : filter === 'flagged' ? visits.filter(v => v.anomaliesFound)
    : visits.filter(v => !v.anomaliesFound);

  const totalVisits = visits.length;
  const flaggedCount = visits.filter(v => v.anomaliesFound).length;
  const verifiedCount = totalVisits - flaggedCount;

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
              <h1 className="font-title-xl text-on-surface font-bold text-[22px]">Visit Records</h1>
              <p className="font-label-md text-on-surface-variant text-[13px]">
                Complete history of all logged visits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-verified-green animate-pulse"></span>
            <span className="font-label-sm text-secondary text-[11px] uppercase">Live Sync</span>
          </div>
        </header>

        <div className="px-6 md:px-10 py-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-surface border border-border-default rounded-xl p-4 text-center">
              <p className="font-display-kpi text-[28px] text-on-surface font-bold">{totalVisits}</p>
              <p className="font-label-sm text-[11px] text-secondary uppercase tracking-wider mt-1">Total Visits</p>
            </div>
            <div className="bg-verified-bg border border-border-default rounded-xl p-4 text-center">
              <p className="font-display-kpi text-[28px] text-verified-green font-bold">{verifiedCount}</p>
              <p className="font-label-sm text-[11px] text-secondary uppercase tracking-wider mt-1">Verified</p>
            </div>
            <div className="bg-flagged-bg border border-border-default rounded-xl p-4 text-center">
              <p className="font-display-kpi text-[28px] text-flagged-amber font-bold">{flaggedCount}</p>
              <p className="font-label-sm text-[11px] text-secondary uppercase tracking-wider mt-1">Flagged</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            {(['all', 'verified', 'flagged'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-label-md text-[13px] transition-colors border-2 ${
                  filter === f
                    ? 'border-primary text-primary bg-transparent font-bold'
                    : 'border-transparent text-secondary hover:bg-surface-container-low'
                }`}
              >
                {f === 'all' ? 'All' : f === 'verified' ? 'Verified' : 'Flagged'} ({f === 'all' ? totalVisits : f === 'verified' ? verifiedCount : flaggedCount})
              </button>
            ))}
          </div>

          {/* Records Table */}
          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            {loading ? (
              <div className="p-12 text-center animate-pulse text-secondary">Loading records...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant block mb-3">folder_off</span>
                <p className="text-secondary font-title-md text-[16px]">No records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low border-b border-border-default">
                    <tr>
                      <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Household</th>
                      <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Child</th>
                      <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Weight</th>
                      <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Status</th>
                      <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Visit Type</th>
                      <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Verification</th>
                      <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {filtered.map(visit => (
                      <tr key={visit.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4 font-title-sm text-[14px] text-on-surface font-semibold">{visit.householdName || 'Unknown'}</td>
                        <td className="p-4 text-[13px] text-secondary">{visit.childName || '-'}</td>
                        <td className="p-4 font-data-mono text-[13px] text-on-surface">{visit.weight || '-'}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-1 rounded font-label-sm text-[10px] font-bold uppercase ${
                            visit.status === 'Severe Acute Malnutrition' ? 'bg-red-100 text-red-600'
                            : visit.status === 'Underweight' ? 'bg-amber-100 text-amber-600'
                            : visit.status === 'Normal' ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                            {visit.status}
                          </span>
                        </td>
                        <td className="p-4 text-[13px] text-secondary">{visit.visitType || 'General'}</td>
                        <td className="p-4">
                          {visit.anomaliesFound ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-flagged-bg text-flagged-amber font-label-sm text-[10px] font-bold">
                              <span className="material-symbols-outlined text-[12px]">warning</span>Flagged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-verified-bg text-verified-green font-label-sm text-[10px] font-bold">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>Verified
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-data-mono text-[12px] text-secondary">
                          {visit.timestamp ? new Date(visit.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Records;
