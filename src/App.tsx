import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ClientDashboard from "./pages/ClientDashboard";
import ClientSettings from './pages/ClientSettings';
import ClientBookings from './pages/ClientBookings';
import ProfessionalSettings from './pages/ProfessionalSettings';
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import ProfessionalProfile from "./pages/ProfessionalProfile";
import Billing from "./pages/Billing";
import AdminDashboard from "./pages/AdminDashboard";
import AdminReviews from "./pages/AdminReviews";
import MapView from "./pages/MapView";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import Abonesana from "./pages/Abonesana";
import MaksaIzdevusies from "./pages/MaksaIzdevusies";
import Onboarding from "./pages/Onboarding";
import OnboardingProfilePhoto from "./pages/OnboardingProfilePhoto";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNavigation from "./components/BottomNavigation";

import WaitingApproval from "./pages/WaitingApproval";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div 
            className="relative min-h-screen"
            style={{
              paddingBottom: 'max(88px, calc(68px + env(safe-area-inset-bottom, 12px)))',
            }}
          >
            <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route 
            path="/onboarding/profile-photo" 
            element={
              <ProtectedRoute requiredRole="PROFESSIONAL">
                <OnboardingProfilePhoto />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute requiredRole="PROFESSIONAL">
                <Onboarding />
              </ProtectedRoute>
            } 
          />
            <Route path="/" element={<Index />} />
            <Route path="/client" element={<ClientDashboard />} />
            <Route 
              path="/client/settings" 
              element={
                <ProtectedRoute requiredRole="CLIENT">
                  <ClientSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/client/bookings" 
              element={
                <ProtectedRoute requiredRole="CLIENT">
                  <ClientBookings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/professional" 
              element={
                <ProtectedRoute requiredRole="PROFESSIONAL">
                  <ProfessionalDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/professional/settings" 
              element={
                <ProtectedRoute requiredRole="PROFESSIONAL">
                  <ProfessionalSettings />
                </ProtectedRoute>
              } 
            />
            <Route path="/professional/:id" element={<ProfessionalProfile />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reviews" 
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminReviews />
                </ProtectedRoute>
              } 
            />
            <Route path="/map" element={<MapView />} />
            <Route 
              path="/subscription-plans" 
              element={
                <ProtectedRoute requiredRole="PROFESSIONAL">
                  <SubscriptionPlans />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/billing" 
              element={
                <ProtectedRoute requiredRole="PROFESSIONAL">
                  <Billing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/abonesana" 
              element={
                <ProtectedRoute requiredRole="PROFESSIONAL">
                  <Abonesana />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/maksa-izdevusies" 
              element={
                <ProtectedRoute requiredRole="PROFESSIONAL">
                  <MaksaIzdevusies />
                </ProtectedRoute>
              } 
            />
            <Route path="/waiting-approval" element={<WaitingApproval />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNavigation />
        </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
