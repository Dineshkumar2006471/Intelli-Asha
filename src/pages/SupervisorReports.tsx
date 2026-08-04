import { useEffect, useState, useRef } from 'react';
import { onFlaggedVisitsSnapshot, onVisitsSnapshot, onAgentLogsSnapshot } from '../services/db';
import type { Visit, AgentLog } from '../types';
import ReactMarkdown from 'react-markdown';

const SupervisorReports = () => {
  const [flaggedVisits, setFlaggedVisits] = useState<Visit[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // REAL-TIME LISTENERS: These fire automatically whenever a field worker submits a new visit
    const unsubVisits = onVisitsSnapshot(setAllVisits);
    const unsubFlagged = onFlaggedVisitsSnapshot(setFlaggedVisits);
    const unsubLogs = onAgentLogsSnapshot(logs => setAgentLogs(logs.reverse()));

    return () => {
      unsubVisits();
      unsubFlagged();
      unsubLogs();
    };
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentLogs]);


  const getLogColor = (severity: string) => {
    switch(severity) {
      case 'success': return 'text-[#3FB950]';
      case 'warning': return 'text-[#D29922]';
      case 'error': return 'text-[#F85149]';
      default: return 'text-[#58A6FF]';
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Shared Sidebar */}
      
      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto bg-surface-container-lowest p-0 md:p-6 lg:p-10">
        {/* Mobile Header */}
        <header className="md:hidden flex justify-between items-center px-4 py-3 bg-surface border-b border-border-default shrink-0 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-title-md text-title-md font-bold text-primary">IntelliASHA</span>
          </div>
          <button className="text-on-surface-variant">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex mb-8 justify-between items-start">
          <div>
            <h1 className="font-title-xl text-title-xl text-on-surface font-bold">Supervisor Overview</h1>
            <p className="font-body-base text-body-base text-on-surface-variant mt-1">Live data feed from active field workers</p>
          </div>
          <button className="hidden md:flex bg-surface border border-border-strong hover:bg-surface-variant text-primary font-title-sm text-title-sm py-2 px-4 rounded-lg transition-colors items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Report
          </button>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-0 mb-8">
          <div className="bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-1 shadow-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Verified Today</span>
            <span className="font-display-kpi text-display-kpi text-on-surface font-bold">{allVisits.length}</span>
            <span className="font-label-md text-label-md text-verified-green font-medium">↑ Active</span>
          </div>
          <div className="bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-1 shadow-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Flagged for Review</span>
            <span className="font-display-kpi text-display-kpi text-on-surface font-bold">{flaggedVisits.length}</span>
            <span className="font-label-md text-label-md text-flagged-amber font-medium">Requires Attention</span>
          </div>
          <div className="bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-1 shadow-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Zones at Risk</span>
            <span className="font-display-kpi text-display-kpi text-on-surface font-bold">2</span>
            <span className="font-label-md text-label-md text-error font-medium">↑ 1 High Risk</span>
          </div>
          <div className="bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-1 shadow-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Workers Active</span>
            <span className="font-display-kpi text-display-kpi text-on-surface font-bold">12/47</span>
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Today</span>
          </div>
        </div>

        {/* Tables Grid - 50/50 Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Left Side: Flagged Visits Table (50%) */}
          <div className="bg-surface border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border-default bg-surface-container-lowest">
              <h2 className="font-title-md text-title-md text-on-surface font-semibold">Flagged Visits</h2>
            </div>
            <div className="overflow-x-auto flex-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-border-default">
                  <tr>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Household</th>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Issue</th>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedVisits.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-on-surface-variant font-body-base text-body-base">No flagged visits.</td></tr>
                  ) : (
                    flaggedVisits.map((visit) => (
                      <tr key={visit.id} className="border-b border-border-default hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4 font-body-base text-body-base text-on-surface">{visit.householdName}</td>
                        <td className="p-4">
                          <span className="inline-block px-2 py-1 rounded bg-flagged-bg text-flagged-amber font-label-sm text-label-sm uppercase">{visit.flaggedReason || 'Anomaly'}</span>
                        </td>
                        <td className="p-4">
                          <button onClick={() => setSelectedVisit(visit)} className="text-primary font-label-md text-label-md hover:underline font-semibold">Review</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Side: Recent Visits Table (50%) */}
          <div className="bg-surface border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border-default bg-surface-container-lowest">
              <h2 className="font-title-md text-title-md text-on-surface font-semibold">Recent Verified Visits</h2>
            </div>
            <div className="overflow-x-auto flex-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-border-default">
                  <tr>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Household</th>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Time</th>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allVisits.filter(v => !v.anomaliesFound).length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-on-surface-variant font-body-base text-body-base">No recent verified visits.</td></tr>
                  ) : (
                    allVisits.filter(v => !v.anomaliesFound).slice(0, 50).map((visit) => (
                      <tr key={visit.id} className="border-b border-border-default hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4 font-body-base text-body-base text-on-surface">{visit.householdName}</td>
                        <td className="p-4 font-body-base text-body-base text-on-surface-variant">
                          {visit.timestamp ? new Date(visit.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-2 py-1 rounded bg-verified-bg text-verified-green font-label-sm text-label-sm uppercase">Verified</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Full-width Agent Activity Terminal Below Tables */}
        <div className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg shadow-sm overflow-hidden flex flex-col h-[500px] mb-8">
          <div className="p-3 border-b border-[#30363D] bg-[#161B22] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8B949E] text-[16px]" style={{fontVariationSettings: "'FILL' 0"}}>terminal</span>
              <h2 className="font-data-mono text-sm text-[#C9D1D9]">Agentic Orchestration Log (Live)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-verified-green animate-pulse"></span>
              <span className="font-data-mono text-[10px] text-[#8B949E]">A2A Network Active</span>
            </div>
          </div>
          <div className="p-4 font-data-mono text-xs overflow-y-auto space-y-3 flex-1 flex flex-col justify-start custom-scrollbar">
            {agentLogs.length === 0 ? (
              <p className="text-[#8B949E] animate-pulse">Waiting for agent activity...</p>
            ) : (
              agentLogs
                .filter(log => !log.details?.includes('Lightning dunning decision'))
                .map((log) => {
                  let prettyAction = log.action;
                  let prettyDetails = log.details || '';
                  
                  const uidRegex = /2u8ILxiXLWdXJiXWnrn9rqf8e9g1/g;
                  prettyAction = prettyAction.replace(uidRegex, 'kaveri');
                  prettyDetails = prettyDetails.replace(uidRegex, 'kaveri');

                  return (
                    <div key={log.id} className={`${getLogColor(log.severity)} animate-fade-in flex flex-col gap-1 border-b border-[#30363D]/30 pb-2`}>
                      <div className="flex gap-2 items-start">
                        <span className="text-[#8B949E] shrink-0 text-[10px] mt-[3px]">
                          {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : '...'}
                        </span>
                        <span className="leading-snug break-words">
                          <span className="font-bold">[{ (log.agentName || 'SYSTEM').toUpperCase() }]</span> {prettyAction}
                        </span>
                      </div>
                      {prettyDetails && (
                        <div className="text-[10px] text-[#A5D6FF] ml-[68px] bg-[#161B22] p-2 rounded border border-[#30363D] whitespace-pre-wrap break-words">
                          {prettyDetails}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl shadow-xl border border-border-default max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-default bg-surface-container-lowest flex justify-between items-start">
              <div>
                <h2 className="font-title-lg text-title-lg text-on-surface font-bold">Medical Case Review: {selectedVisit.householdName}</h2>
                <div className="flex gap-2 mt-2">
                  <span className="inline-block px-2 py-1 rounded bg-flagged-bg text-flagged-amber font-label-sm font-bold uppercase">
                    {selectedVisit.flaggedReason || 'Flagged for Review'}
                  </span>
                  <span className="inline-block px-2 py-1 rounded bg-surface-variant text-secondary font-label-sm uppercase">
                    {selectedVisit.timestamp ? new Date(selectedVisit.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVisit(null)}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-variant p-2 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-surface-container-lowest">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface p-3 rounded border border-border-default">
                  <span className="block text-[10px] uppercase text-secondary font-bold">Child</span>
                  <span className="font-medium text-sm">{selectedVisit.childName || '-'} ({selectedVisit.childAge || '-'})</span>
                </div>
                <div className="bg-surface p-3 rounded border border-border-default">
                  <span className="block text-[10px] uppercase text-secondary font-bold">Weight</span>
                  <span className="font-medium text-sm">{selectedVisit.weight || '-'}</span>
                </div>
                <div className="bg-surface p-3 rounded border border-border-default">
                  <span className="block text-[10px] uppercase text-secondary font-bold">Status</span>
                  <span className="font-medium text-sm">{selectedVisit.status || '-'}</span>
                </div>
                <div className="bg-surface p-3 rounded border border-border-default">
                  <span className="block text-[10px] uppercase text-secondary font-bold">Visit Type</span>
                  <span className="font-medium text-sm">{selectedVisit.visitType || '-'}</span>
                </div>
              </div>

              <div className="border border-border-default rounded-lg p-6 bg-surface">
                <h3 className="font-title-sm text-secondary uppercase tracking-wide mb-4 border-b border-border-default pb-2">Medical Officer's Assessment</h3>
                <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-headings:font-title-md prose-headings:text-on-surface prose-p:text-on-surface prose-li:text-on-surface prose-strong:text-primary">
                  {selectedVisit.professionalReport ? (
                    <ReactMarkdown>{selectedVisit.professionalReport}</ReactMarkdown>
                  ) : selectedVisit.observations && selectedVisit.observations.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {selectedVisit.observations.map((obs, i) => <li key={i}>{obs}</li>)}
                    </ul>
                  ) : (
                    <p className="text-secondary italic">No detailed report available for this visit.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-border-default bg-surface-container-low flex justify-end gap-3">
              <button 
                onClick={() => setSelectedVisit(null)}
                className="px-4 py-2 rounded-lg font-title-sm text-secondary hover:bg-surface-variant transition-colors"
              >
                Close
              </button>
              <button className="px-6 py-2 rounded-lg font-title-sm bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm">
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SupervisorReports;
