import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import type { WorkerProfile } from '../types';

interface WorkerData extends WorkerProfile {
  id: string;
}

const WorkersDirectory = () => {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'workers'));
    const unsub = onSnapshot(q, (snapshot) => {
      const workersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkerData));
      // Sort in memory instead of relying on Firestore index
      workersData.sort((a, b) => {
        const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return timeB - timeA; // Descending
      });
      setWorkers(workersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching workers:", error);
      setLoading(false); // Stop loading even on error
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-background-subtle flex">
      {/* Shared Sidebar */}
      <Sidebar role="supervisor" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-shrink-0 px-gutter py-6 border-b border-border-default bg-surface">
          <div className="max-w-max-width mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="font-headline-kpi text-headline-kpi text-on-surface mb-1">Worker Directory</h1>
                <p className="font-body-base text-body-base text-on-surface-variant">Manage and monitor all ASHA workers in your jurisdiction.</p>
              </div>
              <button className="flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg font-label-md text-label-md hover:bg-surface-tint transition-colors whitespace-nowrap shadow-sm">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Add New Worker
              </button>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border-1.5 border-border-strong rounded-lg font-body-base text-body-base text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-shadow placeholder:text-text-muted" placeholder="Search by name, ID, or zone..." type="text" />
              </div>

              <div className="flex gap-3">
                <div className="relative">
                  <select className="appearance-none w-full pl-4 pr-10 py-2 bg-surface-container-lowest border-1.5 border-border-strong rounded-lg font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none cursor-pointer">
                    <option value="">All Zones</option>
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">arrow_drop_down</span>
                </div>
                <div className="relative">
                  <select className="appearance-none w-full pl-4 pr-10 py-2 bg-surface-container-lowest border-1.5 border-border-strong rounded-lg font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none cursor-pointer">
                    <option value="">Performance</option>
                    <option value="high">High (&gt;90%)</option>
                    <option value="medium">Medium (70-90%)</option>
                    <option value="low">Low (&lt;70%)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">arrow_drop_down</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-surface-container-low p-gutter">
          <div className="max-w-max-width mx-auto">
            <div className="bg-surface-container-lowest border border-border-default rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border-default bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider items-center hidden md:grid">
                <div className="col-span-3">Worker Name</div>
                <div className="col-span-2">Assigned Zone</div>
                <div className="col-span-2 text-right">Visits Today</div>
                <div className="col-span-3">Verification Rate</div>
                <div className="col-span-2 text-right">Status</div>
              </div>

              <div className="divide-y divide-border-default">
                {loading ? (
                  <div className="p-8 text-center text-secondary">Loading workers...</div>
                ) : workers.length === 0 ? (
                  <div className="p-8 text-center text-secondary">No workers found. They will appear here when they log in.</div>
                ) : (
                  workers.map(worker => (
                    <div key={worker.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-surface-bright transition-colors cursor-pointer group">
                      <div className="md:col-span-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-title-sm shrink-0 uppercase">
                          {worker.name ? worker.name.substring(0, 2) : 'FW'}
                        </div>
                        <div>
                          <div className="font-title-sm text-title-sm text-on-surface group-hover:text-primary transition-colors">{worker.name}</div>
                          <div className="font-data-mono text-data-mono text-outline">Ph: {worker.phone}</div>
                        </div>
                      </div>
                      <div className="md:col-span-2 font-body-base text-body-base text-on-surface-variant flex items-center gap-1.5 before:content-['Zone:'] md:before:content-none before:text-outline before:font-label-sm before:uppercase md:block flex-row">
                        {worker.location || 'Unknown'}
                      </div>
                      <div className="md:col-span-2 font-data-mono text-data-mono text-on-surface md:text-right flex items-center gap-1.5 before:content-['Active:'] md:before:content-none before:text-outline before:font-label-sm before:uppercase md:block flex-row">
                        {worker.lastActive ? new Date(worker.lastActive).toLocaleDateString() : 'New'}
                      </div>
                      <div className="md:col-span-3 flex items-center gap-3">
                        <div className="hidden md:block flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full bg-verified-green rounded-full" style={{"width": "100%"}}></div>
                        </div>
                        <div className="font-data-mono text-data-mono text-on-surface font-semibold flex items-center gap-1.5 before:content-['Verification:'] md:before:content-none before:text-outline before:font-label-sm before:uppercase flex-row">
                          100%
                        </div>
                      </div>
                      <div className="md:col-span-2 md:text-right flex items-center md:justify-end gap-1.5 before:content-['Status:'] md:before:content-none before:text-outline before:font-label-sm before:uppercase flex-row">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-verified-bg text-verified-green font-label-sm text-label-sm uppercase font-bold tracking-wide">Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-6 py-4 border-t border-border-default bg-surface-container-lowest flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Showing {workers.length} workers</span>
                <div className="flex gap-2">
                  <button className="p-1 rounded text-outline hover:bg-surface-variant hover:text-on-surface disabled:opacity-50 transition-colors" disabled>
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button className="p-1 rounded text-outline hover:bg-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkersDirectory;
