import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Vehicles from '@/pages/Vehicles';
import Journal from '@/pages/Journal';
import FuelManagement from '@/pages/FuelManagement';
import FuelSupplyPage from '@/pages/fuel/FuelSupplyPage';
import MaintenancePage from '@/pages/MaintenancePage';
import Drivers from '@/pages/Drivers';
import Reports from '@/pages/Reports';
import SettingsPage from '@/pages/SettingsPage';
import SpareParts from '@/pages/SpareParts';
import ExpensesPage from '@/pages/ExpensesPage';
import UsersPage from '@/pages/UsersPage';
import CampaignsList from '@/pages/campaigns/CampaignsList';
import CampaignDetail from '@/pages/campaigns/CampaignDetail';
import ClientsPage from '@/pages/campaigns/ClientsPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/fuel" element={<FuelManagement />} />
        <Route path="/fuel-supply" element={<FuelSupplyPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/spare-parts" element={<SpareParts />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/campaigns" element={<CampaignsList />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/clients" element={<ClientsPage />} />
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