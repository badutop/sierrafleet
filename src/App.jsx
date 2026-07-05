import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Login from '@/pages/Login';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Vehicles from '@/pages/Vehicles';
import Journal from '@/pages/Journal';
import FuelManagement from '@/pages/FuelManagement';
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
import LandingPage from '@/pages/LandingPage';
import { base44 } from '@/api/base44Client';
import CampaignsList from '@/pages/campaigns/CampaignsList';
import CampaignDetail from '@/pages/campaigns/CampaignDetail';
import ClientsPage from '@/pages/campaigns/ClientsPage';
import RotationsCalendar from '@/pages/campaigns/RotationsCalendar';
import MigrationPage from '@/pages/MigrationPage';
import GpsTracking from '@/pages/GpsTracking';
import DriverRefuelPage from '@/pages/DriverRefuelPage';
import AuditLogPage from '@/pages/AuditLogPage';

const AuthenticatedApp = () => {
  // Render the main app without any authentication gating
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
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
        <Route path="/migration" element={<MigrationPage />} />
        <Route path="/gps" element={<GpsTracking />} />
        <Route path="/refuel" element={<DriverRefuelPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App