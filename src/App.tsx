import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Layouts
import { ClientLayout } from "@/components/layout/ClientLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Auth Pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

// Client Pages
import Dashboard from "./pages/Dashboard";
import Senders from "./pages/Senders";
import SenderDetails from "./pages/SenderDetails";
import Library from "./pages/Library";
import Funnels from "./pages/Funnels";
import Reports from "./pages/Reports";
import NewReport from "./pages/NewReport";
import NewTracking from "./pages/NewTracking";
import Settings from "./pages/Settings";
import CapturedNewsletters from "./pages/CapturedNewsletters";
import Analytics from "./pages/Analytics";
import ClientAlerts from "./pages/app/ClientAlerts";
import Acompanhamentos from "./pages/Acompanhamentos";

// Admin SaaS Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPlans from "./pages/admin/Plans";
import AdminPayments from "./pages/admin/Payments";
import AdminIntegrations from "./pages/admin/Integrations";
import AdminClients from "./pages/admin/Clients";
import AdminClientDetails from "./pages/admin/ClientDetails";
import AdminSaasMetrics from "./pages/admin/SaasMetrics";
import AdminDataLeakAlerts from "./pages/admin/DataLeakAlerts";
import AdminEmailProviderSetup from "./pages/admin/EmailProviderSetup";
import AdminPlatformDomains from "./pages/admin/PlatformDomains";
import AdminEmailLogs from "./pages/admin/EmailLogs";
import AdminSystemHealth from "./pages/admin/SystemHealth";
import AdminMailerooSetup from "./pages/admin/MailerooSetup";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Onboarding */}
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/app" replace />} />

            {/* Client Routes - /app/* */}
            <Route path="/app" element={
              <ProtectedRoute>
                <ClientLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              
              {/* Acompanhamentos routes */}
              <Route path="acompanhamentos" element={<Acompanhamentos />} />
              <Route path="acompanhamentos/novo" element={<NewTracking />} />
              <Route path="acompanhamentos/remetentes" element={<Senders />} />
              <Route path="acompanhamentos/remetentes/:email" element={<SenderDetails />} />
              <Route path="acompanhamentos/newsletters" element={<CapturedNewsletters />} />
              <Route path="acompanhamentos/funis" element={<Funnels />} />
              <Route path="acompanhamentos/analytics" element={<Analytics />} />
              
              {/* Relatórios */}
              <Route path="relatorios" element={<Reports />} />
              <Route path="relatorios/novo" element={<NewReport />} />
              
              {/* Alertas e Configurações */}
              <Route path="alertas" element={<ClientAlerts />} />
              <Route path="configuracoes" element={<Settings />} />

              {/* Legacy redirects */}
              <Route path="senders" element={<Navigate to="/app/acompanhamentos/remetentes" replace />} />
              <Route path="senders/:email" element={<Navigate to="/app/acompanhamentos/remetentes" replace />} />
              <Route path="library" element={<Navigate to="/app/acompanhamentos/newsletters" replace />} />
              <Route path="newsletters" element={<Navigate to="/app/acompanhamentos/newsletters" replace />} />
              <Route path="analytics" element={<Navigate to="/app/acompanhamentos/analytics" replace />} />
              <Route path="funnels" element={<Navigate to="/app/acompanhamentos/funis" replace />} />
              <Route path="reports" element={<Navigate to="/app/relatorios" replace />} />
              <Route path="reports/new" element={<Navigate to="/app/relatorios/novo" replace />} />
              <Route path="tracking/new" element={<Navigate to="/app/acompanhamentos/novo" replace />} />
              <Route path="alerts" element={<Navigate to="/app/alertas" replace />} />
              <Route path="settings" element={<Navigate to="/app/configuracoes" replace />} />
            </Route>

            {/* Admin SaaS Routes - /admin/* */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="metrics" element={<AdminSaasMetrics />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="clients/:userId" element={<AdminClientDetails />} />
              <Route path="alerts" element={<AdminDataLeakAlerts />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="integrations" element={<AdminIntegrations />} />
              <Route path="domains" element={<AdminPlatformDomains />} />
              <Route path="logs" element={<AdminEmailLogs />} />
              <Route path="health" element={<AdminSystemHealth />} />
              <Route path="email-setup" element={<AdminEmailProviderSetup />} />
              <Route path="maileroo" element={<AdminMailerooSetup />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
