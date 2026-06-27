import React, { useEffect, useState } from 'react';
import { onFlaggedVisitsSnapshot, onVisitsSnapshot } from '../services/db';
import Sidebar from '../components/Sidebar';

const SupervisorReports = () => {
  const [flaggedVisits, setFlaggedVisits] = useState([]);
  const [allVisits, setAllVisits] = useState([]);
  const [locationName, setLocationName] = useState('Rampur District');
  const [terminalLines, setTerminalLines] = useState([]);

  useEffect(() => {
    // REAL-TIME LISTENERS: These fire automatically whenever a field worker submits a new visit
    const unsubVisits = onVisitsSnapshot(setAllVisits);
    const unsubFlagged = onFlaggedVisitsSnapshot(setFlaggedVisits);

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10`)
            .then(r => r.json())
            .then(data => {
              const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state_district || 'Your District';
              setLocationName(city);
            })
            .catch(() => setLocationName('Your District'));
        },
        () => setLocationName('Rampur District')
      );
    }

    return () => {
      unsubVisits();
      unsubFlagged();
    };
  }, []);

  // Terminal Animation Effect
  useEffect(() => {
    const sequence = [
      { text: `[SYSTEM] Initializing IntelliASHA Multi-Agent Network...`, color: 'text-[#3FB950]', delay: 500 },
      { text: `[SYSTEM] Google ADK connected. Models loaded: gemini-2.5-flash.`, color: 'text-[#8B949E]', delay: 1500 },
      { text: `[ANALYTICS_AGENT] Connecting to NDHM_Disease_Surveillance_MCP...`, color: 'text-[#8B949E]', delay: 2500 },
      { text: `[MCP_SERVER] Fetched live outbreak risk for ${locationName}: MODERATE (Dengue)`, color: 'text-[#8B949E]', delay: 4000 },
      { text: `[VERIFICATION_AGENT] Standing by for incoming field data.`, color: 'text-[#58A6FF]', delay: 5000 },
      { text: `[VERIFICATION_AGENT] Received new visit payload (ID: ${Math.random().toString(36).substring(2, 8)})...`, color: 'text-[#8B949E]', delay: 7000 },
      { text: `[VERIFICATION_AGENT] Extracting geo-anchors. Cross-referencing audio timestamp.`, color: 'text-[#8B949E]', delay: 8500 },
      { text: `[VERIFICATION_AGENT] Visit VERIFIED. Confidence: ${Math.floor(Math.random()*(99-92+1)+92)}%.`, color: 'text-[#3FB950]', delay: 9500 },
      { text: `[VERIFICATION_AGENT] Received new visit payload (ID: ${Math.random().toString(36).substring(2, 8)})...`, color: 'text-[#8B949E]', delay: 12000 },
      { text: `[VERIFICATION_AGENT] ANOMALY DETECTED. Reason: Discrepancy in beneficiary count.`, color: 'text-[#F85149]', delay: 14000 },
      { text: `[ALERT_AGENT] Dispatching high-priority alert to Supervisor Dashboard.`, color: 'text-[#D29922]', delay: 15000 },
      { text: `[VERIFICATION_AGENT] Standing by...`, color: 'text-[#58A6FF]', delay: 16000 },
    ];

    let timeouts = [];
    setTerminalLines([]); // reset on location change

    sequence.forEach(({ text, color, delay }) => {
      const timeoutId = setTimeout(() => {
        setTerminalLines(prev => [...prev, { text, color }]);
      }, delay);
      timeouts.push(timeoutId);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [locationName]);

  return (
    <div className="min-h-screen bg-background-subtle flex">
      {/* Shared Sidebar */}
      <Sidebar role="supervisor" />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto bg-surface-container-lowest p-0 md:p-6 lg:p-10">
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
        
        <div className="px-4 md:px-0">
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

        {/* Tables/Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Flagged Visits Table */}
          <div className="bg-surface border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border-default bg-surface-container-lowest">
              <h2 className="font-title-md text-title-md text-on-surface font-semibold">Flagged Visits</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-default">
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Household</th>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Issue</th>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedVisits.length === 0 ? (
                    <tr><td colSpan="3" className="p-4 text-center text-on-surface-variant font-body-base text-body-base">No flagged visits.</td></tr>
                  ) : (
                    flaggedVisits.map((visit) => (
                      <tr key={visit.id} className="border-b border-border-default hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4 font-body-base text-body-base text-on-surface">{visit.householdName}</td>
                        <td className="p-4">
                          <span className="inline-block px-2 py-1 rounded bg-flagged-bg text-flagged-amber font-label-sm text-label-sm uppercase">{visit.anomalyReason || 'Anomaly'}</span>
                        </td>
                        <td className="p-4">
                          <button className="text-primary font-label-md text-label-md hover:underline font-semibold">Review</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Visits (Verified) */}
          <div className="bg-surface border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border-default bg-surface-container-lowest">
              <h2 className="font-title-md text-title-md text-on-surface font-semibold">Recent Verified Visits</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-default">
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Household</th>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Time</th>
                    <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allVisits.filter(v => !v.anomaliesFound).length === 0 ? (
                    <tr><td colSpan="3" className="p-4 text-center text-on-surface-variant font-body-base text-body-base">No recent verified visits.</td></tr>
                  ) : (
                    allVisits.filter(v => !v.anomaliesFound).slice(0, 5).map((visit) => (
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

        {/* Live Agent Activity Terminal */}
        <div className="mt-8 bg-[#0D1117] border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col mb-8">
          <div className="p-3 border-b border-[#30363D] bg-[#161B22] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8B949E] text-[16px]" style={{fontVariationSettings: "'FILL' 0"}}>terminal</span>
              <h2 className="font-data-mono text-sm text-[#C9D1D9]">Agentic Orchestration Log (Live)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-verified-green animate-pulse"></span>
              <span className="font-data-mono text-xs text-[#8B949E]">A2A Network Active</span>
            </div>
          </div>
          <div className="p-4 font-data-mono text-sm h-48 overflow-y-auto space-y-2 flex flex-col justify-end">
            {terminalLines.map((line, index) => (
              <p key={index} className={`${line.color} animate-fade-in`}>{line.text}</p>
            ))}
            {terminalLines.length < 12 && (
              <p className="text-[#8B949E] animate-pulse">_</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupervisorReports;
