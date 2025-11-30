import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (user) {
        // Ja meklē ADMIN lomu, pārbauda user_roles tabulu
        if (requiredRole === 'ADMIN') {
          const { data: adminRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'ADMIN')
            .maybeSingle();
          
          setUserRole(adminRole ? 'ADMIN' : null);
          setIsApproved(true); // Admins are always approved
        } else {
          // Citām lomām izmanto profiles tabulu
          const { data } = await supabase
            .from('profiles')
            .select('role, approved')
            .eq('id', user.id)
            .single();
          
          setUserRole(data?.role || null);
          setIsApproved(data?.approved ?? true);
        }
      }
      setChecking(false);
    };

    if (!loading) {
      checkRole();
    }

    // Subscribe to real-time profile updates for current user
    if (user) {
      const channel = supabase
        .channel('profile-approval-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            // When current user's approval status changes, re-check immediately
            if (payload.old?.approved !== payload.new?.approved) {
              checkRole();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loading, requiredRole]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Ielādē...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is not approved (and not admin)
  if (!isApproved && userRole !== 'ADMIN') {
    return <Navigate to="/waiting-approval" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;