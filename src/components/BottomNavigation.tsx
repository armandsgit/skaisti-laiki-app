import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, Calendar, User, Search, CheckCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Load user role from profiles table
  useEffect(() => {
    const loadUserRole = async () => {
      if (!user?.id) return;
      
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUserRole(data.role);
      }
    };
    
    loadUserRole();
  }, [user?.id]);

  // Don't show on auth page or when not logged in
  if (location.pathname === '/auth' || !user) return null;

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  
  // CRITICAL: Admin role ALWAYS gets admin navigation, no matter what page they're on
  const isAdminPanel = userRole === 'ADMIN';
  
  // Only check these if NOT an admin
  const isViewingOthersProfile = !isAdminPanel && 
                                 location.pathname.startsWith('/professional/') && 
                                 location.pathname !== '/professional' && 
                                 location.pathname !== '/professional/settings';
  
  const isProfessionalUser = !isAdminPanel && userRole === 'PROFESSIONAL' && !isViewingOthersProfile;
  const isClientUser = !isAdminPanel && (userRole === 'CLIENT' || isViewingOthersProfile);
  
  const tabs = isAdminPanel ? [
    { icon: Home, label: 'Sākums', path: '/admin', isActive: location.pathname === '/admin' && !currentTab, scrollToTop: true },
    { icon: CheckCircle, label: 'Gaida', path: '/admin?tab=pending', isActive: location.pathname === '/admin' && currentTab === 'pending' },
    { icon: MessageSquare, label: 'Atsauksmes', path: '/admin/reviews', isActive: location.pathname === '/admin/reviews' },
    { icon: Map, label: 'Karte', path: '/map', isActive: location.pathname === '/map' },
    { icon: User, label: 'Meistari', path: '/admin?tab=professionals', isActive: location.pathname === '/admin' && currentTab === 'professionals' },
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
                if (tab.scrollToTop) {
                  navigate(tab.path);
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                } else {
                  navigate(tab.path);
                  // If navigating to professional dashboard with tab param, scroll to top
                  if (tab.path.includes('/professional?tab=')) {
                    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                  }
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
