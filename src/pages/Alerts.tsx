import { useEffect, useState } from 'react';
import { onAlertsSnapshot } from '../services/db';
import type { Alert } from '../types';

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // REAL-TIME LISTENER: Fires every time a new alert is created (e.g. when a field worker flags an anomaly)
    const unsub = onAlertsSnapshot((liveAlerts) => {
      setAlerts(liveAlerts);
      setLoading(false);
    });

    // Safety timeout: if no alerts arrive in 2 seconds, stop the spinner
    const timeout = setTimeout(() => setLoading(false), 2000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Shared Sidebar */}
      
      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-surface-container-lowest p-4 md:p-6 lg:p-10">
        <header className="mb-6 md:mb-8">
          <h1 className="font-display-landing text-2xl md:text-3xl text-on-surface font-bold">Alerts & Notifications</h1>
          <p className="font-body-base text-sm md:text-base text-on-surface-variant mt-1">Monitor and triage field activity exceptions.</p>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <p className="text-secondary p-4">Loading real-time alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-secondary p-4">No active alerts at this time.</p>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className={`bg-surface-container-lowest rounded-xl p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-start relative overflow-hidden group border-2 ${alert.severity === 'high' ? 'border-at-risk-red' : 'border-flagged-amber'} shadow-sm`}>
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center self-start ${alert.severity === 'high' ? 'bg-at-risk-bg text-at-risk-red' : 'bg-flagged-bg text-flagged-amber'}`}>
                  <span className="material-symbols-outlined" style={{"fontVariationSettings": "'FILL' 1"}}>warning</span>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-1 sm:gap-4">
                    <h3 className="font-title-md text-lg md:text-title-md text-on-surface font-semibold">{alert.title || 'Verification Agent Alert'}</h3>
                    <span className="font-data-mono text-xs md:text-data-mono text-text-muted shrink-0">
                      {alert.timestamp ? new Date(alert.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </span>
                  </div>
                  <p className="font-body-base text-sm md:text-base text-secondary leading-relaxed">{alert.message}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className={`px-2.5 py-1 rounded-full font-label-sm text-[10px] md:text-label-sm uppercase tracking-wider font-bold ${alert.severity === 'high' ? 'bg-at-risk-bg text-at-risk-red' : 'bg-flagged-bg text-flagged-amber'}`}>
                      {alert.severity} Priority
                    </span>
                    <span className="bg-surface-container-low text-on-surface-variant px-2.5 py-1 rounded-full font-label-sm text-[10px] md:text-label-sm font-semibold">
                      Visit #{alert.visitId?.slice(-6) || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0 border-t md:border-t-0 border-border-default pt-4 md:pt-0">
                  <button className="w-full md:w-auto px-5 py-2.5 border border-border-strong rounded-lg font-label-md text-sm md:text-label-md text-text-primary hover:bg-surface-container-low transition-colors shadow-sm font-medium">Review Visit</button>
                  <button className="w-full md:w-auto px-5 py-2.5 text-secondary hover:bg-surface-container-low rounded-lg transition-colors font-label-md text-sm md:text-label-md font-medium">Dismiss</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Alerts;
