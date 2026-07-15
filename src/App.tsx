import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { AppLayout } from './components/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Overview } from './pages/Overview';
import { Tickets } from './pages/Tickets';
import { TicketDetail } from './pages/TicketDetail';
import { Organizations } from './pages/Organizations';
import { ReportBuilder } from './pages/ReportBuilder';
import { AgingReport } from './pages/admin/AgingReport';
import { TicketLifecycle } from './pages/admin/TicketLifecycle';
import ResolutionApprovals from './pages/ResolutionApprovals';
import Users from './pages/Users';
import { Unauthorized } from './pages/Unauthorized';
import { RecommendationRulesManager } from './pages/admin/RecommendationRulesManager';
import { DiagnosticBuilder } from './pages/admin/DiagnosticBuilder';
import { SLAConfiguration } from './pages/admin/SLAConfiguration';
import { EmailLogs } from './pages/admin/EmailLogs';
import { DataAssistant } from './pages/admin/DataAssistant';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Role-Based Router Redirect Component
const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roleCodeUpper = user.role_code?.toUpperCase() || '';
  if (['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(roleCodeUpper)) {
    return <Navigate to="/admin/overview" replace />;
  }
  if (['AGENT', 'SUPPORT_OFFICER', 'SUPPORT_ENGINEER', 'TEAM_LEAD', 'TEAM_MEMBER'].includes(roleCodeUpper)) {
    return <Navigate to="/agent/dashboard" replace />;
  }
  return <Navigate to="/portal/dashboard" replace />;
};

// Protected Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-2" />
        <span className="text-xs font-semibold">Validating secure workspace session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Support match with any compatible set of roles
  if (allowedRoles && !allowedRoles.includes(user.role_code as any) && !allowedRoles.includes(user.role_name as any)) {
    // Gracefully handle mapping check
    const isMatched = allowedRoles.some(role => {
      const roleUpper = role.toUpperCase();
      const userRoleUpper = user.role_code?.toUpperCase() || '';
      if (['ADMIN', 'ADMINISTRATOR', 'CEO', 'SUPPORT_MANAGER', 'SYS_ADMIN'].includes(roleUpper)) {
        return ['ADMIN', 'ADMINISTRATOR', 'CEO', 'SUPPORT_MANAGER', 'SYS_ADMIN'].includes(userRoleUpper);
      }
      if (['AGENT', 'SUPPORT_OFFICER', 'SUPPORT_ENGINEER', 'TEAM_LEAD', 'TEAM_MEMBER'].includes(roleUpper)) {
        return ['AGENT', 'SUPPORT_OFFICER', 'SUPPORT_ENGINEER', 'TEAM_LEAD', 'TEAM_MEMBER'].includes(userRoleUpper);
      }
      if (['CLIENT', 'CAB_USER', 'BANK_USER', 'BANK_MANAGER', 'BANK_ADMIN'].includes(roleUpper)) {
        return ['CLIENT', 'CAB_USER', 'BANK_USER', 'BANK_MANAGER', 'BANK_ADMIN'].includes(userRoleUpper);
      }
      return userRoleUpper === roleUpper;
    });
    
    if (!isMatched) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <AppLayout>{children}</AppLayout>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes & Redirections */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <RoleBasedRedirect />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/overview" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                    <Overview />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                    <Navigate to="/admin/overview" replace />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/analytics" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                    <Navigate to="/admin/overview" replace />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/agent/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['agent', 'SUPPORT_OFFICER']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/portal/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['client', 'cab_user', 'BANK_USER']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tickets" 
                element={
                  <ProtectedRoute>
                    <Tickets />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tickets/:id" 
                element={
                  <ProtectedRoute>
                    <TicketDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                    <Organizations />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/reports" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                    <ReportBuilder />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/aging-report" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER', 'SYS_ADMIN']}>
                    <AgingReport />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/ticket-lifecycle" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER', 'SYS_ADMIN']}>
                    <TicketLifecycle />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/data-assistant" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                    <DataAssistant />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER', 'SUPPORT_OFFICER']}>
                    <Users />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/resolution-approvals" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'agent', 'CEO', 'SUPPORT_MANAGER', 'SUPPORT_OFFICER']}>
                    <ResolutionApprovals />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/rules" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                    <RecommendationRulesManager />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/diagnostics" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                    <DiagnosticBuilder />
                  </ProtectedRoute>
                } 
              />
              
              {/* Configuration Routes */}
              <Route path="/diagnostic-builder" element={
                <ProtectedRoute allowedRoles={['admin', 'administrator']}>
                  <DiagnosticBuilder />
                </ProtectedRoute>
              } />

              <Route path="/recommendation-rules" element={
                <ProtectedRoute allowedRoles={['admin', 'administrator']}>
                  <RecommendationRulesManager />
                </ProtectedRoute>
              } />

              <Route path="/admin/sla" element={
                <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                  <SLAConfiguration />
                </ProtectedRoute>
              } />

              <Route path="/admin/emails" element={
                <ProtectedRoute allowedRoles={['admin', 'administrator', 'CEO', 'SUPPORT_MANAGER']}>
                  <EmailLogs />
                </ProtectedRoute>
              } />

              {/* Default Fallbacks */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
