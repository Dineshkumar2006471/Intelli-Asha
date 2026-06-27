import React, { useEffect, useState } from 'react';
import { generateFullDashboardData } from '../services/aiAgent';
import { onVisitsSnapshot, onFlaggedVisitsSnapshot } from '../services/db';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import Sidebar from '../components/Sidebar';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon issue with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DHODashboard = () => {
  const [metrics, setMetrics] = useState({
    total_ashas: '-',
    total_beneficiaries: '-',
    surveys_completed: '-',
    high_risk_cases: '-',
    data_quality_score: '-',
    disbursement_ready: '-'
  });

  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Your District');
  const [aiBrief, setAiBrief] = useState(null);
  const [phcs, setPhcs] = useState([]);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [liveVisitCount, setLiveVisitCount] = useState(0);
  const [liveFlaggedCount, setLiveFlaggedCount] = useState(0);

  // REAL-TIME FIRESTORE LISTENERS: These update KPIs the instant a field worker submits a visit
  useEffect(() => {
    const unsubVisits = onVisitsSnapshot((visits) => {
      setLiveVisitCount(visits.length);
    });
    const unsubFlagged = onFlaggedVisitsSnapshot((flagged) => {
      setLiveFlaggedCount(flagged.length);
    });
    return () => {
      unsubVisits();
      unsubFlagged();
    };
  }, []);

  const handleManualLocationSubmit = (e) => {
    e.preventDefault();
    if (!manualLocation.trim()) return;
    setIsEditingLocation(false);
    setLocationName(manualLocation);
    setLoading(true);
    setAiBrief(null);
    setPhcs([]);

    // Forward geocode to get coordinates for the map
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualLocation)}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setMapCenter([lat, lng]);
          setWorkers([
            { id: 1, name: "Sunita (Block A)", pos: [lat + 0.005, lng - 0.008], status: "active", offset: 0 },
            { id: 2, name: "Geeta (Block B)", pos: [lat - 0.006, lng + 0.010], status: "flagged", offset: 1 },
            { id: 3, name: "Pooja (Block C)", pos: [lat + 0.010, lng + 0.005], status: "active", offset: 2 },
            { id: 4, name: "Meena (Block D)", pos: [lat - 0.003, lng - 0.012], status: "active", offset: 3 },
          ]);
        }
      })
      .catch(err => console.error("Geocoding failed", err));

    generateFullDashboardData(manualLocation).then(payload => {
      setAiBrief(payload.aiBrief);
      setMetrics(payload.metrics);
      setPhcs(payload.phcs);
      setLoading(false);
    });
  };
  // Default fallback (Mathura), overridden by real geolocation
  const [mapCenter, setMapCenter] = useState([27.4924, 77.6737]);
  const [workers, setWorkers] = useState([
    { id: 1, name: "Sunita (Block A)", pos: [27.49, 77.67], status: "active", offset: 0 },
    { id: 2, name: "Geeta (Block B)", pos: [27.51, 77.68], status: "flagged", offset: 1 },
    { id: 3, name: "Pooja (Block C)", pos: [27.48, 77.65], status: "active", offset: 2 },
    { id: 4, name: "Meena (Block D)", pos: [27.50, 77.66], status: "active", offset: 3 },
  ]);

  // Detect user's real location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMapCenter([lat, lng]);
          // Scatter workers around the user's real location
          setWorkers([
            { id: 1, name: "Sunita (Block A)", pos: [lat + 0.005, lng - 0.008], status: "active", offset: 0 },
            { id: 2, name: "Geeta (Block B)", pos: [lat - 0.006, lng + 0.010], status: "flagged", offset: 1 },
            { id: 3, name: "Pooja (Block C)", pos: [lat + 0.010, lng + 0.005], status: "active", offset: 2 },
            { id: 4, name: "Meena (Block D)", pos: [lat - 0.003, lng - 0.012], status: "active", offset: 3 },
          ]);
          // Reverse geocode to get city name from coordinates
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`)
            .then(r => r.json())
            .then(data => {
              const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state_district || 'Your District';
              setLocationName(city);
              // Fetch full dashboard data
              generateFullDashboardData(city).then(payload => {
                setAiBrief(payload.aiBrief);
                setMetrics(payload.metrics);
                setPhcs(payload.phcs);
                setLoading(false);
              });
            })
            .catch(() => {
               generateFullDashboardData('Your District').then(payload => {
                 setAiBrief(payload.aiBrief);
                 setMetrics(payload.metrics);
                 setPhcs(payload.phcs);
                 setLoading(false);
               });
            });
        },
        () => {
          // Geolocation denied — keep defaults
          setLocationName('Mathura District');
          generateFullDashboardData('Mathura District').then(payload => {
            setAiBrief(payload.aiBrief);
            setMetrics(payload.metrics);
            setPhcs(payload.phcs);
            setLoading(false);
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      generateFullDashboardData('Mathura District').then(payload => {
        setAiBrief(payload.aiBrief);
        setMetrics(payload.metrics);
        setPhcs(payload.phcs);
        setLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    // Simulate real-time GPS movement
    const interval = setInterval(() => {
      setWorkers(prev => prev.map(w => {
        const time = Date.now() / 5000 + w.offset;
        return {
          ...w,
          pos: [w.pos[0] + Math.sin(time) * 0.0002, w.pos[1] + Math.cos(time) * 0.0002]
        };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  const formatCurrency = (value) => {
    if (value === '-') return '-';
    if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${value}`;
  };

  const formatNumber = (value) => {
    if (value === '-') return '-';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toString();
  };

  const averageReadiness = phcs.length > 0 ? Math.round(phcs.reduce((acc, p) => acc + parseInt(p.readiness.replace('%', '')), 0) / phcs.length) : 0;
  const strokeDashoffset = 251.2 - (251.2 * (averageReadiness / 100));

  const handleExportCSV = () => {
    if (phcs.length === 0) return;
    const headers = "PHC Name,Block,Active ASHAs,Surveys (WTD),Status,Readiness\n";
    const csvData = phcs.map(p => `"${p.name}","${p.block}",${p.active_ashas},${p.surveys_wtd},${p.status},${p.readiness}`).join("\n");
    const blob = new Blob([headers + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PHC_Breakdown_${locationName.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewReport = () => {
    if (!aiBrief) return alert("Report is still generating...");
    const content = `IntelliASHA Analytics Agent - Full District Report\nLocation: ${locationName}\nDate: ${new Date().toLocaleDateString()}\n\n-- AI Brief --\n${aiBrief.anomaly}\n${aiBrief.recommendation}\n${aiBrief.alert}\n\n-- Metrics --\nTotal ASHAs: ${metrics.total_ashas}\nTotal Beneficiaries: ${metrics.total_beneficiaries}\nSurveys Completed: ${metrics.surveys_completed}\nHigh Risk Cases: ${metrics.high_risk_cases}\nData Quality Score: ${metrics.data_quality_score}%\nDisbursement Ready: ${formatCurrency(metrics.disbursement_ready)}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `District_Report_${locationName.replace(/\s+/g, '_')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background-subtle flex">
      {/* Shared Sidebar */}
      <Sidebar role="supervisor" />

      <main className="flex-1 h-screen overflow-y-auto bg-surface-container-lowest p-0 md:p-6 lg:p-10 space-y-8">
        {/* Dashboard Header */}
        <div className="relative w-full rounded-lg overflow-hidden border border-border-default h-[280px]">
          <img alt="Health Center Briefing Context" className="w-full h-full object-cover object-top" src="https://lh3.googleusercontent.com/aida/AP1WRLsjzD35p6Y4msSwEgK3s2kMXtF0gaPcD2WB5S372FsHONKpxLbo8nCn0sigm22t5MHwX_U9rvgDwajiTOxjGprbgbNmFSoj_CjGMofmk4sYNsg1EWuIXMK2ESggaCCTmXB7E-gJ3m43SXwbSTvaRrY1XdhlEAbJjz8N2XjNv0_ulg5wqVXe9HGOhGztPru_AYJd9iOdnNG3g0_DiYdUv1iTVk81YRWEdNrLWI7sx2qXGzo-1fFQPlrmMg" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent flex flex-col justify-end p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full max-w-max-width mx-auto">
              <div>
                <h1 className="font-display-landing text-display-landing text-on-surface drop-shadow-sm">{locationName} Overview</h1>
                <p className="font-body-base text-body-base text-on-surface-variant mt-2 font-medium">DHO Analytics Dashboard powered by BigQuery</p>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-lowest/90 backdrop-blur px-3 py-1.5 rounded-full border border-border-default">
                <span className="material-symbols-outlined text-outline" style={{fontVariationSettings: "'FILL' 0"}}>calendar_month</span>
                <span className="font-label-md text-label-md text-on-surface-variant">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Column KPIs */}
        <section className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
          {/* KPI 1 */}
          <div className="bg-surface-container-lowest border border-border-default rounded-lg p-4">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Total ASHAs</div>
            <div className="font-headline-kpi text-headline-kpi text-on-surface">{metrics.total_ashas !== '-' ? metrics.total_ashas.toLocaleString() : '-'}</div>
            <div className="flex items-center gap-1 mt-2 text-verified-green">
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 0"}}>trending_up</span>
              <span className="font-label-sm text-label-sm">98% Active</span>
            </div>
          </div>
          {/* KPI 2 */}
          <div className="bg-surface-container-lowest border border-border-default rounded-lg p-4">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Total Beneficiaries</div>
            <div className="font-headline-kpi text-headline-kpi text-on-surface">{formatNumber(metrics.total_beneficiaries)}</div>
            <div className="flex items-center gap-1 mt-2 text-on-surface-variant">
              <span className="font-label-sm text-label-sm">Registered</span>
            </div>
          </div>
          {/* KPI 3 */}
          <div className="bg-surface-container-lowest border border-border-default rounded-lg p-4">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Surveys Completed</div>
            <div className="font-headline-kpi text-headline-kpi text-on-surface">{liveVisitCount > 0 ? formatNumber(metrics.surveys_completed !== '-' ? metrics.surveys_completed + liveVisitCount : liveVisitCount) : formatNumber(metrics.surveys_completed)}</div>
            <div className="flex items-center gap-1 mt-2 text-verified-green">
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 0"}}>trending_up</span>
              <span className="font-label-sm text-label-sm">{liveVisitCount > 0 ? `+${liveVisitCount} live today` : '+15% vs Last Wk'}</span>
            </div>
          </div>
          {/* KPI 4 */}
          <div className="bg-surface-container-lowest border border-border-default rounded-lg p-4">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">High Risk Cases</div>
            <div className="font-headline-kpi text-headline-kpi text-at-risk-red">{liveFlaggedCount > 0 ? (metrics.high_risk_cases !== '-' ? metrics.high_risk_cases + liveFlaggedCount : liveFlaggedCount) : metrics.high_risk_cases}</div>
            <div className="flex items-center gap-1 mt-2 text-at-risk-red bg-at-risk-bg px-2 py-0.5 rounded-full w-fit">
              <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 0"}}>warning</span>
              <span className="font-label-sm text-label-sm">{liveFlaggedCount > 0 ? `${liveFlaggedCount} flagged live` : 'Needs Review'}</span>
            </div>
          </div>
          {/* KPI 5 */}
          <div className="bg-surface-container-lowest border border-border-default rounded-lg p-4">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Data Quality Score</div>
            <div className="font-headline-kpi text-headline-kpi text-on-surface">{metrics.data_quality_score}{metrics.data_quality_score !== '-' ? '%' : ''}</div>
            <div className="flex items-center gap-1 mt-2 text-verified-green">
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 0"}}>check_circle</span>
              <span className="font-label-sm text-label-sm">Excellent</span>
            </div>
          </div>
          {/* KPI 6 */}
          <div className="bg-surface-container-lowest border border-border-default rounded-lg p-4">
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Disbursement Ready</div>
            <div className="font-headline-kpi text-headline-kpi text-on-surface">{formatCurrency(metrics.disbursement_ready)}</div>
            <div className="flex items-center gap-1 mt-2 text-primary">
              <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 0"}}>account_balance_wallet</span>
              <span className="font-label-sm text-label-sm">Pending Approval</span>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Map */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-border-default rounded-lg overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-border-default flex justify-between items-center bg-surface-bright">
              {isEditingLocation ? (
                <form onSubmit={handleManualLocationSubmit} className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="border border-border-default rounded px-3 py-1 font-body-base text-body-base text-on-surface bg-surface-container-lowest outline-none focus:border-primary"
                    placeholder="Enter district name..."
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="bg-primary text-on-primary rounded px-3 py-1 font-label-sm text-label-sm flex items-center">
                    Go
                  </button>
                  <button type="button" onClick={() => setIsEditingLocation(false)} className="text-secondary hover:text-on-surface">
                    <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 0"}}>close</span>
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-title-md text-title-md text-on-surface">{locationName} Coverage</h2>
                  <button onClick={() => { setManualLocation(locationName); setIsEditingLocation(true); }} className="text-primary hover:text-primary-container transition-colors" title="Edit Location">
                    <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 0"}}>edit</span>
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button className="bg-surface-container border border-border-default rounded px-3 py-1 font-label-sm text-label-sm text-on-surface flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 0"}}>filter_list</span> Filter
                </button>
              </div>
            </div>
            <div className="flex-grow bg-surface-variant relative min-h-[450px]">
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} key={mapCenter.join(',')}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Circle center={mapCenter} radius={2000} pathOptions={{ color: '#005bbf', fillColor: '#005bbf', fillOpacity: 0.1 }} />
                {workers.map(w => (
                  <Marker key={w.id} position={w.pos}>
                    <Popup>
                      <strong>{w.name}</strong><br />
                      Status: {w.status === 'active' ? 'Verified Visits' : 'Needs Review'}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <div className="absolute bottom-4 right-4 bg-surface-container-lowest p-2 rounded shadow-sm border border-border-default flex flex-col gap-2 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-verified-green"></div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">High Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-flagged-amber"></div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-at-risk-red"></div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Low/Critical</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: AI Brief & Readiness */}
          <div className="space-y-8">
            {/* AI Brief Card */}
            <div className="bg-surface-container-lowest border border-primary-fixed-dim rounded-lg p-6 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary-container"></div>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary-container" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
                <h2 className="font-title-sm text-title-sm text-on-surface font-bold">AI Brief — Week of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
              </div>
              <div className="font-body-base text-body-base text-on-surface-variant space-y-4">
                {aiBrief ? (
                  <>
                    <p><strong>{aiBrief.anomaly.split(':')[0]}:</strong> {aiBrief.anomaly.split(':').slice(1).join(':')}</p>
                    <p><strong>{aiBrief.recommendation.split(':')[0]}:</strong> {aiBrief.recommendation.split(':').slice(1).join(':')}</p>
                    <p><strong>{aiBrief.alert.split(':')[0]}:</strong> {aiBrief.alert.split(':').slice(1).join(':')}</p>
                  </>
                ) : (
                  <div className="animate-pulse flex flex-col gap-4">
                    <div className="h-4 bg-surface-container-high rounded w-3/4"></div>
                    <div className="h-4 bg-surface-container-high rounded w-5/6"></div>
                    <div className="h-4 bg-surface-container-high rounded w-2/3"></div>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-border-default font-label-sm text-label-sm text-outline flex justify-between items-center">
                <span>Generated by IntelliASHA Analytics Agent</span>
                <button onClick={handleViewReport} className="text-primary hover:underline">View Full Report</button>
              </div>
            </div>
            
            {/* Disbursement Readiness */}
            <div className="bg-surface-container-lowest border border-border-default rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <h2 className="font-title-md text-title-md text-on-surface mb-6 w-full text-left">Disbursement Readiness</h2>
              <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-surface-container-high" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                  <circle className="text-verified-green transition-all duration-1000 ease-in-out" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeWidth="8"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline-kpi text-headline-kpi text-on-surface">{averageReadiness}%</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Ready to Disburse</span>
                </div>
              </div>
              <button className="w-full bg-primary-container text-on-primary-container font-title-sm text-title-sm py-3 rounded-lg hover:bg-surface-tint transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>payments</span>
                Initiate Disbursement
              </button>
              <p className="font-label-sm text-label-sm text-outline mt-3">{formatCurrency(metrics.disbursement_ready)} cleared across {phcs.length} PHCs</p>
            </div>
          </div>
        </div>

        {/* PHC Breakdown Table */}
        <section className="bg-surface-container-lowest border border-border-default rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border-default flex justify-between items-center bg-surface-bright">
            <h2 className="font-title-md text-title-md text-on-surface">PHC Breakdown</h2>
            <button onClick={handleExportCSV} className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1">
              Export CSV <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 0"}}>download</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  <th className="p-4 font-semibold">PHC Name</th>
                  <th className="p-4 font-semibold">Block</th>
                  <th className="p-4 font-semibold text-right">Active ASHAs</th>
                  <th className="p-4 font-semibold text-right">Surveys (WTD)</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-right">Readiness</th>
                </tr>
              </thead>
              <tbody className="font-body-base text-body-base text-on-surface divide-y divide-border-default">
                {phcs.length > 0 ? phcs.map((phc, i) => (
                  <tr key={i} className="hover:bg-surface-bright transition-colors">
                    <td className="p-4 font-medium">{phc.name}</td>
                    <td className="p-4 text-on-surface-variant">{phc.block}</td>
                    <td className="p-4 text-right font-data-mono text-data-mono">{phc.active_ashas}</td>
                    <td className="p-4 text-right font-data-mono text-data-mono">{phc.surveys_wtd}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full font-label-sm text-label-sm font-bold ${
                        phc.status === 'Optimal' ? 'bg-verified-bg text-verified-green' :
                        phc.status === 'Delayed' ? 'bg-flagged-bg text-flagged-amber' :
                        'bg-at-risk-bg text-at-risk-red'
                      }`}>{phc.status}</span>
                    </td>
                    <td className={`p-4 text-right font-data-mono text-data-mono ${phc.status === 'Delayed' ? 'text-flagged-amber' : phc.status === 'Critical' ? 'text-at-risk-red' : ''}`}>{phc.readiness}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-on-surface-variant animate-pulse">Loading localized PHC data...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DHODashboard;
