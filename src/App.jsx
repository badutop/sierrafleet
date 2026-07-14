import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Vehicles from '@/pages/Vehicles';
import Journal from '@/pages/Journal';
import FuelSupplyPage from '@/pages/fuel/FuelSupplyPage';
import FuelManagementV2 from '@/pages/FuelManagementV2';
import MaintenancePage from '@/pages/MaintenancePage';
import RepairsPage from '@/pages/RepairsPage';
import Drivers from '@/pages/Drivers';
import Reports from '@/pages/Reports';
import SettingsPage from '@/pages/SettingsPage';
import SpareParts from '@/pages/SpareParts';
import Suppliers from '@/pages/Suppliers';
import ExpensesPage from '@/pages/ExpensesPage';
import UsersPage from '@/pages/UsersPage';
import CampaignsList from '@/pages/campaigns/CampaignsList';
import CampaignDetail from '@/pages/campaigns/CampaignDetail';
import ClientsPage from '@/pages/campaigns/ClientsPage';
import RotationsCalendar from '@/pages/campaigns/RotationsCalendar';
import DriverRefuelPage from '@/pages/DriverRefuelPage';
import AuditLogPage from '@/pages/AuditLogPage';
import LandingPage from '@/pages/LandingPage';

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Publiques — /reset-password doit rester accessible même si une
                session de récupération temporaire fait passer isAuthenticated
                à true (Supabase authentifie brièvement l'utilisateur quand il
                clique le lien reçu par email). */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Racine — landing page publique pour les visiteurs non connectés,
                Dashboard pour les utilisateurs authentifiés. */}
            <Route element={<ProtectedRoute unauthenticatedElement={<LandingPage />} />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route element={<AppLayout />}>
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/fuel" element={<FuelManagementV2 />} />
                <Route path="/fuel-supply" element={<FuelSupplyPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/repairs" element={<RepairsPage />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/spare-parts" element={<SpareParts />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/campaigns" element={<CampaignsList />} />
                <Route path="/campaigns/calendar" element={<RotationsCalendar />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/refuel" element={<DriverRefuelPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
              </Route>
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
