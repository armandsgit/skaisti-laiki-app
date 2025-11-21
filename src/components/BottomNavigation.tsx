import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, Calendar, User, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Don't show on auth page or when viewing someone else's profile
  if (location.pathname === '/auth' || !user) return null;

  // Check if viewing a professional profile (not dashboard)
  const isViewingProfile = location.pathname.startsWith('/professional/') && 
                          location.pathname !== '/professional/dashboard' && 
                          location.pathname !== '/professional/settings';
  
  // Determine user role route prefix
  const isProfessionalDashboard = location.pathname === '/professional/dashboard' || 
                                  location.pathname === '/professional/settings';
  const isClient = !isProfessionalDashboard && !isViewingProfile;
  
  const tabs = isProfessionalDashboard ? [
    { icon: Home, label: 'Sākums', path: '/professional/dashboard', isActive: location.pathname === '/professional/dashboard' },
    { icon: Calendar, label: 'Rezervācijas', path: '/professional/dashboard', isActive: false },
    { icon: Map, label: 'Karte', path: '/map', isActive: location.pathname === '/map', isMain: true },
    { icon: User, label: 'Profils', path: '/professional/settings', isActive: location.pathname === '/professional/settings' },
  ] : [
    { icon: Home, label: 'Sākums', path: '/', isActive: location.pathname === '/' },
    { icon: Search, label: 'Meklēt', path: '/', isActive: false },
    { icon: Map, label: 'Karte', path: '/map', isActive: location.pathname === '/map', isMain: true },
    { icon: Calendar, label: 'Rezervācijas', path: '/', isActive: false },
    { icon: User, label: 'Konts', path: '/client/settings', isActive: location.pathname === '/client/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-blur border-t border-border/50 pb-safe">
      <div className="max-w-screen-sm mx-auto px-2">
        <div className="flex items-end justify-around py-2 min-h-[64px]">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => navigate(tab.path)}
              className={`
                flex flex-col items-center gap-1 transition-all duration-200
                ${tab.isMain 
                  ? 'bg-gradient-to-br from-primary to-secondary p-3 rounded-full shadow-elegant -mb-4' 
                  : tab.isActive 
                    ? 'text-primary px-3 py-2 rounded-2xl' 
                    : 'text-muted-foreground active:text-primary px-3 py-2 rounded-2xl'
                }
                ${tab.isMain ? '' : 'tap-feedback'}
              `}
            >
              <tab.icon 
                className={`
                  ${tab.isMain ? 'w-7 h-7 text-black' : 'w-5 h-5'}
                  transition-transform duration-200
                  ${tab.isActive && !tab.isMain ? 'scale-110' : ''}
                `}
              />
              {!tab.isMain && (
                <span className={`text-[10px] font-medium ${tab.isActive ? 'text-primary' : ''}`}>
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
