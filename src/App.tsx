import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkipToContent } from './components/SkipToContent';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-loaded pages — code-split for optimal initial bundle size
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const FieldWorker = lazy(() => import('./pages/FieldWorker'));
const LogVisit = lazy(() => import('./pages/LogVisit'));
const SmartRoute = lazy(() => import('./pages/SmartRoute'));
const Records = lazy(() => import('./pages/Records'));
const Earnings = lazy(() => import('./pages/Earnings'));
const Schedule = lazy(() => import('./pages/Schedule'));
const SupervisorReports = lazy(() => import('./pages/SupervisorReports'));
const Reports = lazy(() => import('./pages/Reports'));
const DHODashboard = lazy(() => import('./pages/DHODashboard'));
const Alerts = lazy(() => import('./pages/Alerts'));
const WorkersDirectory = lazy(() => import('./pages/WorkersDirectory'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Full-screen loading spinner shown while lazy-loaded routes are fetched. */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary-container border-t-primary rounded-full animate-spin" />
        <span className="text-on-surface-variant text-sm font-medium">Loading…</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SkipToContent />
        <Suspense fallback={<PageLoader />}>
          <div id="main-content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route path="/app/field" element={<ProtectedRoute><FieldWorker /></ProtectedRoute>} />
              <Route path="/app/log-visit" element={<ProtectedRoute><LogVisit /></ProtectedRoute>} />
              <Route path="/app/route" element={<ProtectedRoute><SmartRoute /></ProtectedRoute>} />
              <Route path="/app/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
              <Route path="/app/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
              <Route path="/app/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
              <Route path="/dashboard/supervisor" element={<ProtectedRoute><SupervisorReports /></ProtectedRoute>} />
              <Route path="/dashboard/supervisor/directory" element={<ProtectedRoute><WorkersDirectory /></ProtectedRoute>} />
              <Route path="/dashboard/supervisor/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/dashboard/supervisor/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/dashboard/dho" element={<ProtectedRoute><DHODashboard /></ProtectedRoute>} />

              {/* 404 Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
