import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, Calendar, User, Search, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Don't show on auth page or when not logged in
  if (location.pathname === '/auth' || !user) return null;

  // Check if viewing a professional profile (not dashboard)
  const isViewingProfile = location.pathname.startsWith('/professional/') && 
                          location.pathname !== '/professional/dashboard' && 
                          location.pathname !== '/professional/settings';
  
  // Determine user role route prefix
  const isAdminPanel = location.pathname.startsWith('/admin');
  const isProfessionalDashboard = location.pathname === '/professional/dashboard' || 
                                  location.pathname === '/professional/settings';
  const isClient = !isProfessionalDashboard && !isViewingProfile && !isAdminPanel;
  
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  
  const tabs = isAdminPanel ? [
    { icon: Home, label: 'Sākums', path: '/admin', isActive: !currentTab, isMain: false, scrollToTop: true },
    { icon: CheckCircle, label: 'Gaida', path: '/admin?tab=pending', isActive: currentTab === 'pending' },
    { icon: User, label: 'Meistari', path: '/admin?tab=professionals', isActive: currentTab === 'professionals' },
    { icon: Calendar, label: 'Rezervācijas', path: '/admin?tab=bookings', isActive: currentTab === 'bookings' },
    { icon: Search, label: 'Klienti', path: '/admin?tab=clients', isActive: currentTab === 'clients' },
  ] : isProfessionalDashboard ? [
    { icon: Home, label: 'Sākums', path: '/professional/dashboard', isActive: location.pathname === '/professional/dashboard' },
    { icon: Calendar, label: 'Rezervācijas', path: '/professional/dashboard', isActive: false },
    { icon: Map, label: 'Karte', path: '/map', isActive: location.pathname === '/map', isMain: true },
    { icon: User, label: 'Profils', path: '/professional/settings', isActive: location.pathname === '/professional/settings' },
  ] : [
    { icon: Home, label: 'Sākums', path: '/client', isActive: location.pathname === '/client' || location.pathname === '/' },
    { icon: Search, label: 'Meklēt', path: '/client', isActive: false },
    { icon: Map, label: 'Karte', path: '/map', isActive: location.pathname === '/map', isMain: true },
    { icon: Calendar, label: 'Rezervācijas', path: '/bookings', isActive: location.pathname === '/bookings' },
    { icon: User, label: 'Konts', path: '/client/settings', isActive: location.pathname === '/client/settings' },
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
                }
              }}
              className={`
                flex flex-col items-center justify-center transition-all duration-300 relative flex-1 max-w-[80px]
                ${tab.isMain 
                  ? 'bg-gradient-to-br from-primary to-secondary rounded-full shadow-elegant -mb-4' 
                  : 'mb-0'
                }
                ${!tab.isMain && tab.isActive ? 'text-primary' : ''}
                ${!tab.isMain && !tab.isActive ? 'text-foreground/60 active:text-primary' : ''}
                ${!tab.isMain ? 'tap-feedback py-2' : ''}
                ${tab.isActive && !tab.isMain ? 'glow-effect' : ''}
              `}
              style={{
                minHeight: tab.isMain ? '56px' : '52px',
                minWidth: tab.isMain ? '56px' : '44px',
                width: tab.isMain ? '56px' : 'auto',
                height: tab.isMain ? '56px' : 'auto',
              }}
            >
              <tab.icon 
                className={`
                  ${tab.isMain ? 'w-7 h-7 text-white' : 'w-[22px] h-[22px]'}
                  transition-all duration-300 flex-shrink-0
                  ${tab.isActive && !tab.isMain ? 'scale-110 drop-shadow-glow' : ''}
                `}
                strokeWidth={2.5}
              />
              {!tab.isMain && (
                <span 
                  className={`text-[10px] font-semibold tracking-wide mt-1 whitespace-nowrap ${tab.isActive ? 'text-primary' : ''}`}
                  style={{ lineHeight: '1.2' }}
                >
                  {tab.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
