import { useEffect, useState } from 'react';
import { onVisitsSnapshot } from '../services/db';
import type { Visit } from '../types';

const Reports = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onVisitsSnapshot((data) => {
      setVisits(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
            <main className="flex-1 p-6 md:p-10 h-screen overflow-y-auto bg-surface-container-lowest">
        <header className="mb-8">
          <h1 className="font-display-landing text-[32px] text-on-surface">Reports</h1>
          <p className="font-body-base text-secondary mt-2">Real-time health reporting data.</p>
        </header>

        <section className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="p-4 border-b border-border-default bg-surface-bright flex justify-between items-center">
            <h2 className="font-title-md text-[18px]">Recent Visits</h2>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-verified-green animate-pulse"></span>
               <span className="font-label-sm text-secondary uppercase">Live Sync</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-border-default">
                <tr>
                  <th className="p-4 font-label-sm uppercase text-secondary">Household</th>
                  <th className="p-4 font-label-sm uppercase text-secondary">Worker ID</th>
                  <th className="p-4 font-label-sm uppercase text-secondary">Type</th>
                  <th className="p-4 font-label-sm uppercase text-secondary">Status</th>
                  <th className="p-4 font-label-sm uppercase text-secondary">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-secondary animate-pulse">Loading reports...</td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-secondary">No visits recorded yet.</td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-surface-bright transition-colors">
                      <td className="p-4 font-title-sm text-[15px]">{visit.householdName}</td>
                      <td className="p-4 font-data-mono text-[13px] text-secondary">{visit.workerId.slice(0, 8)}...</td>
                      <td className="p-4 text-[14px]">{visit.visitType || 'General'}</td>
                      <td className="p-4">
                        {visit.anomaliesFound ? (
                          <span className="inline-block px-2 py-1 rounded bg-flagged-bg text-flagged-amber font-label-sm text-[11px] font-bold">Flagged</span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded bg-verified-bg text-verified-green font-label-sm text-[11px] font-bold">Verified</span>
                        )}
                      </td>
                      <td className="p-4 font-data-mono text-[13px] text-secondary">
                        {visit.timestamp ? new Date(visit.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Reports;
