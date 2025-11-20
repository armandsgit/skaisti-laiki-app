import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-6 shadow-soft animate-pulse">
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          BeautyOn
        </h1>
        <p className="text-muted-foreground">Ielādē...</p>
      </div>
    </div>
  );
};

export default Index;
