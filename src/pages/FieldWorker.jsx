import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const FieldWorker = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    // REAL-TIME LISTENER: Updates the dashboard the instant a new visit is saved to Firestore
    const visitsRef = collection(db, 'visits');
    const q = query(visitsRef, where("workerId", "==", currentUser.photoURL), orderBy("timestamp", "desc"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVisits(data);
      setLoading(false);
    }, (error) => {
      console.error("Real-time field worker visits error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const [locationName, setLocationName] = useState('Detecting location...');

  useEffect(() => {
    const updateLocationInDb = (loc) => {
      setLocationName(loc);
      if (currentUser?.photoURL) {
        import('firebase/firestore').then(({ doc, updateDoc }) => {
          updateDoc(doc(db, 'workers', currentUser.photoURL), { location: loc }).catch(console.error);
        });
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Use proper headers to prevent Nominatim from blocking the request
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14`, {
            headers: {
              'User-Agent': 'IntelliASHA-Agent/1.0 (Contact: contact@intelliasha.gov)'
            }
          })
            .then(r => r.json())
            .then(data => {
              const block = data.address?.suburb || data.address?.village || data.address?.town || data.address?.city || 'Unknown Block';
              const district = data.address?.state_district || data.address?.county || 'Unknown District';
              updateLocationInDb(`${block} PHC, ${district}`);
            })
            .catch((err) => {
              console.error('Nominatim fetch failed:', err);
              updateLocationInDb('GPS Acquired, Location Unknown');
            });
        },
        (err) => {
          console.error('Geolocation failed:', err.message);
          updateLocationInDb('Location Access Denied');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      updateLocationInDb('Geolocation not supported');
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const displayName = currentUser?.displayName || 'ASHA Worker';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background-subtle flex">
      
      {/* Shared Sidebar */}
      <Sidebar role="field-worker" />

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-surface-container-lowest">
        
        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-surface shadow-sm">
          <div>
            <h1 className="font-headline-kpi-mobile text-headline-kpi-mobile text-primary">Good morning, {displayName}</h1>
            <p className="font-label-md text-label-md text-on-surface-variant">Block: {locationName}</p>
          </div>
          <div className="flex gap-4">
            <button className="text-primary active:opacity-80 active:scale-95 transition-transform">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>notifications</span>
            </button>
            <button onClick={handleLogout} className="text-primary active:opacity-80 active:scale-95 transition-transform">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>logout</span>
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-10 py-6 border-b border-border-default bg-surface">
          <div>
            <h1 className="font-title-xl text-title-xl text-on-surface font-bold">Good morning, {displayName}</h1>
            <p className="font-body-base text-body-base text-on-surface-variant mt-1">Block: {locationName} · Field Worker Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-border-default">
              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold font-label-md text-label-md">
                {initials}
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">{displayName}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">ASHA Worker</p>
              </div>
            </div>
          </div>
        </header>

        <div className="pt-[90px] md:pt-0 px-6 md:px-10 pb-24 md:pb-10">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-verified-bg border border-border-default rounded-lg p-5 flex flex-col gap-1 shadow-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Verified Today</span>
              <span className="font-display-kpi text-display-kpi text-on-surface font-bold">{visits.length}</span>
              <span className="font-label-md text-label-md text-verified-green font-medium">↑ Active</span>
            </div>
            <div className="bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-1 shadow-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Pending Visits</span>
              <span className="font-display-kpi text-display-kpi text-on-surface font-bold">{Math.max(0, 10 - visits.length)}</span>
              <span className="font-label-md text-label-md text-flagged-amber font-medium">{visits.length >= 10 ? 'All Done!' : 'Scheduled'}</span>
            </div>
            <div className="bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-1 shadow-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Flagged</span>
              <span className="font-display-kpi text-display-kpi text-on-surface font-bold">{visits.filter(v => v.anomaliesFound).length}</span>
              <span className="font-label-md text-label-md text-error font-medium">Needs Review</span>
            </div>
            <div className="bg-surface border border-border-default rounded-lg p-5 flex flex-col gap-1 shadow-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Earnings (Est.)</span>
              <span className="font-display-kpi text-display-kpi text-on-surface font-bold">₹{visits.length * 250}</span>
              <span className="font-label-md text-label-md text-verified-green font-medium">This Month</span>
            </div>
          </div>

          {/* Main Action + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Log a Visit CTA */}
            <Link to="/app/log-visit" aria-label="Log a Visit" className="lg:col-span-1 bg-surface-container-lowest border-2 border-primary rounded-xl p-8 shadow-[0_4px_12px_rgba(26,115,232,0.15)] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden hover:shadow-lg transition-shadow">
              <div className="absolute inset-0 opacity-5" style={{backgroundImage: "repeating-linear-gradient(45deg, #1A73E8 0, #1A73E8 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px"}}></div>
              <div className="z-10 bg-primary-container rounded-full p-6">
                <span className="material-symbols-outlined text-on-primary text-5xl block" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">mic</span>
              </div>
              <div className="z-10">
                <h2 className="font-title-lg text-title-lg text-primary-container">Log a Visit</h2>
                <p className="font-body-base text-body-base text-on-surface-variant mt-1">Tap to record voice notes</p>
              </div>
            </Link>

            {/* Quick Actions Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4" role="group" aria-label="Quick Actions">
              <a aria-label="View Route" className="bg-surface-container-lowest border border-border-default rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm" href="#">
                <div className="bg-secondary-container p-3 rounded-full">
                  <span className="material-symbols-outlined text-on-secondary-container" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">route</span>
                </div>
                <span className="font-title-sm text-title-sm text-on-surface">Route</span>
              </a>
              <a aria-label="View Records" className="bg-surface-container-lowest border border-border-default rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm" href="#">
                <div className="bg-secondary-container p-3 rounded-full">
                  <span className="material-symbols-outlined text-on-secondary-container" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">folder</span>
                </div>
                <span className="font-title-sm text-title-sm text-on-surface">Records</span>
              </a>
              <a aria-label="View Earnings" className="bg-surface-container-lowest border border-border-default rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm" href="#">
                <div className="bg-secondary-container p-3 rounded-full">
                  <span className="material-symbols-outlined text-on-secondary-container" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">payments</span>
                </div>
                <span className="font-title-sm text-title-sm text-on-surface">Earnings</span>
              </a>
              <a aria-label="View Alerts" className="bg-flagged-bg border border-border-default rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm relative" href="#">
                <div className="absolute top-2 right-2 w-3 h-3 bg-flagged-amber rounded-full" aria-hidden="true"></div>
                <div className="bg-flagged-amber/20 p-3 rounded-full">
                  <span className="material-symbols-outlined text-flagged-amber" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">warning</span>
                </div>
                <span className="font-title-sm text-title-sm text-on-surface">Alerts</span>
              </a>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="mt-8 bg-surface border border-border-default rounded-lg shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border-default bg-surface-container-lowest">
              <h2 className="font-title-md text-title-md text-on-surface font-semibold">Recent Activity</h2>
            </div>
            {loading ? (
              <p className="text-secondary text-center p-6">Loading visits...</p>
            ) : visits.length === 0 ? (
              <p className="text-secondary text-center p-6">No visits logged today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse hidden md:table">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border-default">
                      <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Household</th>
                      <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Time</th>
                      <th className="p-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(visit => (
                      <tr key={visit.id} className="border-b border-border-default hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4 font-body-base text-body-base text-on-surface">{visit.householdName || 'Unknown Household'}</td>
                        <td className="p-4 font-body-base text-body-base text-on-surface-variant">
                          {visit.timestamp?.toDate ? visit.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-1 rounded font-label-sm text-label-sm uppercase ${visit.anomaliesFound ? 'bg-error-container text-error' : 'bg-verified-bg text-verified-green'}`}>
                            {visit.anomaliesFound ? 'Flagged' : 'Synced'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Mobile cards */}
                <div className="md:hidden flex flex-col gap-3 p-4">
                  {visits.map(visit => (
                    <div key={visit.id} className={`bg-surface-container-lowest border border-border-default rounded-lg p-3 flex items-center justify-between ${visit.anomaliesFound ? 'border-l-4 border-l-error' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="bg-surface-container-low p-2 rounded-full">
                          <span className="material-symbols-outlined text-on-surface-variant text-sm">home</span>
                        </div>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface">{visit.householdName || 'Unknown Household'}</p>
                          <p className="font-data-mono text-data-mono text-text-muted text-xs">
                            {visit.timestamp?.toDate ? visit.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                          </p>
                        </div>
                      </div>
                      <span className={`font-label-sm text-label-sm px-2 py-1 rounded-full uppercase ${visit.anomaliesFound ? 'bg-error-container text-error' : 'bg-verified-bg text-verified-green'}`}>
                        {visit.anomaliesFound ? 'Flagged' : 'Synced'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-border-default flex justify-around items-center py-2 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <button className="flex flex-col items-center p-2 text-primary">
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>home</span>
          <span className="font-label-sm text-label-sm mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>calendar_today</span>
          <span className="font-label-sm text-label-sm mt-1">Schedule</span>
        </button>
        <button className="flex flex-col items-center p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>groups</span>
          <span className="font-label-sm text-label-sm mt-1">Community</span>
        </button>
        <button className="flex flex-col items-center p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>person</span>
          <span className="font-label-sm text-label-sm mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default FieldWorker;
