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
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNavigation from "./components/BottomNavigation";

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
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/client" 
              element={
                <ProtectedRoute requiredRole="CLIENT">
                  <ClientDashboard />
                </ProtectedRoute>
              } 
            />
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
            <Route 
              path="/professional/:id" 
              element={
                <ProtectedRoute>
                  <ProfessionalProfile />
                </ProtectedRoute>
              } 
            />
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
            <Route 
              path="/map" 
              element={
                <ProtectedRoute>
                  <MapView />
                </ProtectedRoute>
              } 
            />
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
