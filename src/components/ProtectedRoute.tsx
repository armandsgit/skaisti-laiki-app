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
        } else {
          // Citām lomām izmanto profiles tabulu
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          setUserRole(data?.role || null);
        }
      }
      setChecking(false);
    };

    if (!loading) {
      checkRole();
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

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;