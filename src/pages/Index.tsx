import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/LoadingAnimation';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectUser = async () => {
      if (!user || loading) return;

      // Vispirms pārbauda, vai ir ADMIN loma user_roles tabulā
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'ADMIN')
        .maybeSingle();

      if (adminRole) {
        navigate('/admin');
        return;
      }

      // Ja nav ADMIN, pārbauda parasto profila lomu
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        switch (profile.role) {
          case 'CLIENT':
            navigate('/client');
            break;
          case 'PROFESSIONAL':
            navigate('/professional');
            break;
          case 'ADMIN':
            navigate('/admin');
            break;
          default:
            navigate('/client');
        }
      }
    };

    redirectUser();
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingAnimation size={100} text="Ielāde" />
    </div>
  );
};

export default Index;
