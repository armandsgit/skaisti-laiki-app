import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, Calendar, User, Search, CheckCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
      label: 'Profils', 
      path: '/client/settings', 
      isActive: location.pathname === '/client/settings' 
    },
  ];

  // Find active tab index for indicator animation
  const activeIndex = tabs.findIndex(tab => tab.isActive);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white">
      <div className="relative flex items-center justify-around h-20 max-w-lg mx-auto px-4">
        {/* Animated indicator pill */}
        <motion.div
          className="absolute bottom-6 h-8 bg-black/5 rounded-full"
          initial={false}
          animate={{
            x: activeIndex * (100 / tabs.length) + '%',
            width: `${60 / tabs.length}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          style={{
            left: `${(100 / tabs.length) * 0.2}%`,
          }}
        />

        {/* Navigation buttons */}
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.isActive;
          
          return (
            <motion.button
              key={index}
              onClick={() => {
                navigate(tab.path);
                if (isAdminPanel) {
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                }
              }}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.15 }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  opacity: isActive ? 1 : 0.5,
                }}
                transition={{
                  duration: 0.18,
                  ease: "easeOut",
                }}
              >
                <Icon 
                  className="h-6 w-6"
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{
                    color: isActive ? '#000000' : '#A7A7A7',
                  }}
                />
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
