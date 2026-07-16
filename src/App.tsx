import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkipToContent } from './components/SkipToContent';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import FieldWorker from './pages/FieldWorker';
import LogVisit from './pages/LogVisit';
import SupervisorReports from './pages/SupervisorReports';
import DHODashboard from './pages/DHODashboard';
import Alerts from './pages/Alerts';
import WorkersDirectory from './pages/WorkersDirectory';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SkipToContent />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/app/field" element={<ProtectedRoute><FieldWorker /></ProtectedRoute>} />
          <Route path="/app/log-visit" element={<ProtectedRoute><LogVisit /></ProtectedRoute>} />
          <Route path="/dashboard/supervisor" element={<ProtectedRoute><SupervisorReports /></ProtectedRoute>} />
          <Route path="/dashboard/supervisor/directory" element={<ProtectedRoute><WorkersDirectory /></ProtectedRoute>} />
          <Route path="/dashboard/supervisor/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/dashboard/dho" element={<ProtectedRoute><DHODashboard /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
