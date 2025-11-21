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
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-blur border-t border-border pb-safe">
      <div className="max-w-screen-sm mx-auto px-0">
        <div className="flex items-center justify-evenly py-2.5 h-[72px]">
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
                flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative
                ${tab.isMain 
                  ? 'bg-gradient-to-br from-primary to-secondary p-4 rounded-full shadow-elegant -mt-7 scale-110' 
                  : tab.isActive 
                    ? 'text-primary' 
                    : 'text-foreground/60 active:text-primary'
                }
                ${tab.isMain ? '' : 'tap-feedback px-4 py-2'}
                ${tab.isActive && !tab.isMain ? 'glow-effect' : ''}
              `}
            >
              <tab.icon 
                className={`
                  ${tab.isMain ? 'w-7 h-7 text-white' : 'w-6 h-6'}
                  transition-all duration-300
                  ${tab.isActive && !tab.isMain ? 'scale-110 drop-shadow-glow' : ''}
                `}
              />
              {!tab.isMain && (
                <span className={`text-[11px] font-semibold tracking-wide ${tab.isActive ? 'text-primary' : ''}`}>
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
