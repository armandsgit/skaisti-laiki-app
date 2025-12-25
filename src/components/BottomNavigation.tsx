import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, Calendar, User, Search, CheckCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [confirmedBookingsCount, setConfirmedBookingsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Load user role from both user_roles (for ADMIN) and profiles (for other roles)
  useEffect(() => {
    const loadUserRole = async () => {
      if (!user?.id) return;
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      // First check if user has ADMIN role in user_roles table
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'ADMIN')
        .maybeSingle();
      
      if (adminRole) {
        setUserRole('ADMIN');
        return;
      }
      
      // If not admin, check profiles table for other roles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setUserRole(profileData.role);
      }
    };
    
    loadUserRole();
  }, [user?.id]);

  // Load pending and confirmed bookings count separately for clients
  useEffect(() => {
    const loadBookingsCounts = async () => {
      if (!user?.id || userRole !== 'CLIENT') {
        setPendingBookingsCount(0);
        setConfirmedBookingsCount(0);
        return;
      }
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Count pending bookings
      const { count: pendingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .eq('status', 'pending');
      
      // Count confirmed bookings
      const { count: confirmedCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .eq('status', 'confirmed');
      
      setPendingBookingsCount(pendingCount || 0);
      setConfirmedBookingsCount(confirmedCount || 0);

      // Debounce timer
      let bookingTimer: NodeJS.Timeout;

      // Subscribe to realtime changes - only for status changes
      const channel = supabase
        .channel('client-bookings-count-nav')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `client_id=eq.${user.id}`
          },
          async (payload) => {
            // Only update if status changed or new booking
            const isStatusChange = 
              payload.eventType === 'INSERT' ||
              (payload.eventType === 'UPDATE' && payload.old?.status !== payload.new?.status) ||
              payload.eventType === 'DELETE';
            
            if (!isStatusChange) return;

            // Debounce count reload - immediately recount both pending and confirmed
            clearTimeout(bookingTimer);
            bookingTimer = setTimeout(async () => {
              const { count: newPendingCount } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', user.id)
                .eq('status', 'pending');
              
              const { count: newConfirmedCount } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', user.id)
                .eq('status', 'confirmed');
              
              setPendingBookingsCount(newPendingCount || 0);
              setConfirmedBookingsCount(newConfirmedCount || 0);
            }, 100);
          }
        )
        .subscribe();

      return () => {
        clearTimeout(bookingTimer);
        supabase.removeChannel(channel);
      };
    };
    
    loadBookingsCounts();
  }, [user?.id, userRole]);

  // Load pending approvals count for admins
  useEffect(() => {
    const loadPendingApprovalsCount = async () => {
      if (!user?.id || userRole !== 'ADMIN') {
        setPendingApprovalsCount(0);
        return;
      }
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { count } = await supabase
        .from('professional_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);
      
      setPendingApprovalsCount(count || 0);

      // Debounce timer
      let countTimer: NodeJS.Timeout;

      // Subscribe to realtime changes - only for approval status changes
      const channel = supabase
        .channel('admin-pending-approvals-nav')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'professional_profiles'
          },
          async (payload) => {
            // Only update if approved status changed
            const isApprovalChange = 
              payload.eventType === 'INSERT' ||
              (payload.eventType === 'UPDATE' && payload.old?.approved !== payload.new?.approved) ||
              payload.eventType === 'DELETE';
            
            if (!isApprovalChange) return;

            // Debounce count reload
            clearTimeout(countTimer);
            countTimer = setTimeout(async () => {
              const { count: newCount } = await supabase
                .from('professional_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('approved', false);
              
              setPendingApprovalsCount(newCount || 0);
            }, 300);
          }
        )
        .subscribe();

      return () => {
        clearTimeout(countTimer);
        supabase.removeChannel(channel);
      };
    };
    
    loadPendingApprovalsCount();
  }, [user?.id, userRole]);

  // Don't show on auth page
  if (location.pathname === '/auth') return null;

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  
  // Determine navigation based on user role - Admin takes absolute priority
  const isAdminPanel = user && userRole === 'ADMIN';
  
  // Professional users ALWAYS see professional navigation, even when viewing other profiles
  const isProfessionalUser = user && !isAdminPanel && userRole === 'PROFESSIONAL';
  const isClientUser = user && !isAdminPanel && userRole === 'CLIENT';
  const isGuest = !user;
  
  const tabs = isAdminPanel ? [
    { 
      icon: Home, 
      label: 'Sākums', 
      path: '/admin', 
      isActive: location.pathname === '/admin' && !currentTab
    },
    { 
      icon: CheckCircle, 
      label: 'Gaida', 
      path: '/admin?tab=pending', 
      isActive: location.pathname === '/admin' && currentTab === 'pending',
      badge: pendingApprovalsCount
    },
    { 
      icon: MessageSquare, 
      label: 'Atsauksmes', 
      path: '/admin/reviews', 
      isActive: location.pathname === '/admin/reviews'
    },
    { 
      icon: User, 
      label: 'Meistari', 
      path: '/admin?tab=professionals', 
      isActive: location.pathname === '/admin' && currentTab === 'professionals'
    },
    { 
      icon: Calendar, 
      label: 'Rezervācijas', 
      path: '/admin?tab=bookings', 
      isActive: location.pathname === '/admin' && currentTab === 'bookings'
    },
  ] : isProfessionalUser ? [
    { 
      icon: Home, 
      label: 'Sākums', 
      path: '/professional', 
      isActive: location.pathname === '/professional' && !currentTab 
    },
    { 
      icon: Calendar, 
      label: 'Rezervācijas', 
      path: '/professional?tab=bookings', 
      isActive: location.pathname === '/professional' && currentTab === 'bookings' 
    },
    { 
      icon: Map, 
      label: 'Karte', 
      path: '/map', 
      isActive: location.pathname === '/map' 
    },
    { 
      icon: User, 
      label: 'Profils', 
      path: '/professional/settings', 
      isActive: location.pathname === '/professional/settings' 
    },
  ] : isGuest ? [
    // Guest navigation - limited options
    { 
      icon: Home, 
      label: 'Sākums', 
      path: '/client', 
      isActive: location.pathname === '/client' || location.pathname === '/' 
    },
    { 
      icon: Search, 
      label: 'Meklēt', 
      path: '/map', 
      isActive: location.pathname === '/map' 
    },
    { 
      icon: User, 
      label: 'Ieiet', 
      path: '/auth', 
      isActive: location.pathname === '/auth' 
    },
  ] : [
    // Client navigation
    { 
      icon: Home, 
      label: 'Sākums', 
      path: '/client', 
      isActive: location.pathname === '/client' || location.pathname === '/' 
    },
    { 
      icon: Search, 
      label: 'Meklēt', 
      path: '/map', 
      isActive: location.pathname === '/map' 
    },
    { 
      icon: Calendar, 
      label: 'Rezervācijas', 
      path: '/client/bookings', 
      isActive: location.pathname === '/client/bookings',
      badge: pendingBookingsCount > 0 ? pendingBookingsCount : (confirmedBookingsCount > 0 ? confirmedBookingsCount : 0),
      badgeColor: pendingBookingsCount > 0 ? 'red' : 'green'
    },
    { 
      icon: User, 
      label: 'Profils', 
      path: '/client/settings', 
      isActive: location.pathname === '/client/settings' 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border/30">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const showBadge = 'badge' in tab && typeof tab.badge === 'number' && tab.badge > 0;
          const badgeColor = 'badgeColor' in tab ? tab.badgeColor : 'red';
          
          return (
            <button
              key={index}
              onClick={() => {
                navigate(tab.path);
                if (isAdminPanel) {
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                }
              }}
              className={`
                relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[60px] active:scale-95
                ${tab.isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <div className="relative">
                <Icon 
                  className={`h-[22px] w-[22px] transition-all duration-200 ${tab.isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} 
                  strokeWidth={tab.isActive ? 2.5 : 1.5}
                />
                {showBadge && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 ${badgeColor === 'green' ? 'bg-green-500' : 'bg-red-500'} text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-all duration-200 ${tab.isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
