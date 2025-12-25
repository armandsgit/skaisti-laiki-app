import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/LoadingAnimation';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const redirectUser = async () => {
      // Wait for auth loading to complete
      if (loading) return;
      
      // If not logged in, redirect to client page (public browsing)
      if (!user) {
        navigate('/client', { replace: true });
        return;
      }

      // Prevent multiple redirects for logged in users
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;

      try {
        // Check if user is ADMIN
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'ADMIN')
          .maybeSingle();

        if (adminRole) {
          navigate('/admin', { replace: true });
          return;
        }

        // Check regular profile role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          switch (profile.role) {
            case 'CLIENT':
              navigate('/client', { replace: true });
              break;
            case 'PROFESSIONAL':
              navigate('/professional', { replace: true });
              break;
            case 'ADMIN':
              navigate('/admin', { replace: true });
              break;
            default:
              navigate('/client', { replace: true });
          }
        } else {
          // No profile yet, go to client
          navigate('/client', { replace: true });
        }
      } catch (error) {
        console.error('Redirect error:', error);
        hasRedirectedRef.current = false;
        navigate('/client', { replace: true });
      }
    };

    redirectUser();
  }, [user?.id, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingAnimation size={100} text="Ielāde" />
    </div>
  );
};

export default Index;
