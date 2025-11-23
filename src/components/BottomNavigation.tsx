import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, Calendar, User, Search, CheckCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

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

  // Don't show on auth page or when not logged in
  if (location.pathname === '/auth' || !user) return null;

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  
  // Determine navigation based on user role - Admin takes absolute priority
  const isAdminPanel = userRole === 'ADMIN';
  
  // Only check professional/client logic if NOT admin
  const isViewingOthersProfile = !isAdminPanel && 
                                 location.pathname.startsWith('/professional/') && 
                                 location.pathname !== '/professional' && 
                                 location.pathname !== '/professional/settings';
  
  const isProfessionalUser = !isAdminPanel && userRole === 'PROFESSIONAL' && !isViewingOthersProfile;
  const isClientUser = !isAdminPanel && (userRole === 'CLIENT' || isViewingOthersProfile);
  
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
      isActive: location.pathname === '/admin' && currentTab === 'pending'
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
  ] : [
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
      isActive: location.pathname === '/client/bookings' 
    },
    { 
      icon: User, 
      label: 'Konts', 
      path: '/client/settings', 
      isActive: location.pathname === '/client/settings' 
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 nav-blur border-t border-border"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}
    >
      <div className="w-full max-w-screen-sm mx-auto">
        <div 
          className="flex items-end justify-evenly px-2 pt-2"
          style={{
            minHeight: '68px',
            height: 'calc(68px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => {
                navigate(tab.path);
                // Always scroll to top for admin navigation
                if (isAdminPanel) {
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                }
              }}
              className={`
                flex flex-col items-center justify-center transition-all duration-300 relative flex-1 max-w-[80px]
                tap-feedback py-2
                ${tab.isActive ? 'text-primary' : 'text-foreground/60 active:text-primary'}
                ${tab.isActive ? 'glow-effect' : ''}
              `}
              style={{
                minHeight: '52px',
                minWidth: '44px',
              }}
            >
              <tab.icon 
                className="w-[22px] h-[22px] transition-all duration-300 flex-shrink-0"
                strokeWidth={2.5}
              />
              <span 
                className={`text-[10px] font-semibold tracking-wide mt-1 whitespace-nowrap ${tab.isActive ? 'text-primary' : ''}`}
                style={{ lineHeight: '1.2' }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
