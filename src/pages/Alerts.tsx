import { useEffect, useState } from 'react';
import { onAlertsSnapshot } from '../services/db';
import type { Alert } from '../types';
import Sidebar from '../components/Sidebar';

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
    <div className="min-h-screen bg-background-subtle flex">
      {/* Shared Sidebar */}
      <Sidebar role="supervisor" />

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-surface-container-lowest p-0 md:p-6 lg:p-10">
        <header className="mb-8">
          <h1 className="font-title-xl text-title-xl text-on-surface font-bold">Alerts & Notifications</h1>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">Monitor and triage field activity exceptions.</p>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <p className="text-secondary p-4">Loading real-time alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-secondary p-4">No active alerts at this time.</p>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className="bg-surface-container-lowest border border-border-default rounded-xl p-card-padding flex flex-col md:flex-row gap-4 md:items-start relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.severity === 'high' ? 'bg-at-risk-red' : 'bg-flagged-amber'}`}></div>
                <div className={`flex-shrink-0 p-3 rounded-full flex items-center justify-center ${alert.severity === 'high' ? 'bg-at-risk-bg text-at-risk-red' : 'bg-flagged-bg text-flagged-amber'}`}>
                  <span className="material-symbols-outlined" style={{"fontVariationSettings": "'FILL' 1"}}>warning</span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-title-md text-title-md text-on-surface">Verification Agent Alert</h3>
                    <span className="font-data-mono text-data-mono text-text-muted shrink-0">
                      {alert.timestamp ? new Date(alert.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </span>
                  </div>
                  <p className="font-body-base text-body-base text-secondary">{alert.message}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className={`px-2 py-1 rounded-full font-label-sm text-label-sm uppercase tracking-wider ${alert.severity === 'high' ? 'bg-at-risk-bg text-at-risk-red' : 'bg-flagged-bg text-flagged-amber'}`}>
                      {alert.severity} Priority
                    </span>
                    <span className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded-full font-label-sm text-label-sm">
                      Visit #{alert.visitId?.slice(-6) || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="flex md:flex-col gap-2 shrink-0 mt-4 md:mt-0">
                  <button className="flex-1 md:flex-none px-4 py-2 border border-border-strong rounded-lg font-label-md text-label-md text-text-primary hover:bg-surface-container-low transition-colors">Review Visit</button>
                  <button className="flex-1 md:flex-none px-4 py-2 text-secondary hover:text-on-surface transition-colors font-label-md text-label-md">Dismiss</button>
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
