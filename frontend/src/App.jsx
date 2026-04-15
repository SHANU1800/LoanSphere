import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import ApplicationDetail from './pages/ApplicationDetail';
import NewApplication from './pages/NewApplication';
import Underwriting from './pages/Underwriting';
import FeeReconciliation from './pages/FeeReconciliation';
import EMICalculator from './pages/EMICalculator';
import AgentManagement from './pages/AgentManagement';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import DisbursalChecklist from './pages/DisbursalChecklist';
import AccessDenied from './pages/AccessDenied';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import { ROUTE_ROLES } from './constants/rolePolicy';
import './index.css';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<ProtectedRoute allowedRoles={ROUTE_ROLES.dashboard}><Dashboard /></ProtectedRoute>} />
              <Route path="applications" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.applications}><Applications /></ProtectedRoute>} />
              <Route path="applications/new" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.applicationsNew}><NewApplication /></ProtectedRoute>} />
              <Route path="applications/:id" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.applicationDetail}><ApplicationDetail /></ProtectedRoute>} />
              <Route path="underwriting" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.underwriting}><Underwriting /></ProtectedRoute>} />
              <Route path="disbursal" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.disbursal}><DisbursalChecklist /></ProtectedRoute>} />
              <Route path="fees" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.fees}><FeeReconciliation /></ProtectedRoute>} />
              <Route path="emi-calculator" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.emiCalculator}><EMICalculator /></ProtectedRoute>} />
              <Route path="agents" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.agents}><AgentManagement /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.notifications}><Notifications /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.reports}><Reports /></ProtectedRoute>} />
              <Route path="audit" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.audit}><AuditLogs /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={ROUTE_ROLES.settings}><Settings /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
