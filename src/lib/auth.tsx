import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: 'CLIENT' | 'PROFESSIONAL') => Promise<{ error: any; data: any }>;
  signInWithGoogle: (role: 'CLIENT' | 'PROFESSIONAL', category?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, data: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle post-OAuth role update separately
  useEffect(() => {
    if (!user) return;

    const pendingRole = localStorage.getItem('pendingRole') as 'CLIENT' | 'PROFESSIONAL' | null;
    const pendingCategory = localStorage.getItem('pendingCategory');
    
    if (pendingRole) {
      // Defer Supabase calls using setTimeout(0) to avoid deadlocks
      setTimeout(() => {
        const updateRole = async () => {
          try {
            // Update user metadata
            await supabase.auth.updateUser({
              data: { role: pendingRole }
            });
            
            // Update profiles table
            await supabase
              .from('profiles')
              .update({ role: pendingRole })
              .eq('id', user.id);
            
            // Update user_roles table
            await supabase
              .from('user_roles')
              .delete()
              .eq('user_id', user.id);
            
            await supabase
              .from('user_roles')
              .insert({ user_id: user.id, role: pendingRole });
            
            // Create professional profile if role is PROFESSIONAL
            if (pendingRole === 'PROFESSIONAL' && pendingCategory) {
              const { data: existingProfile } = await supabase
                .from('professional_profiles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
              
              if (!existingProfile) {
                await supabase
                  .from('professional_profiles')
                  .insert([{
                    user_id: user.id,
                    category: pendingCategory as any,
                    city: '',
                    approved: false
                  }]);
              }
              
              // Clear stored values before navigation
              localStorage.removeItem('pendingRole');
              localStorage.removeItem('pendingCategory');
              
              // Navigate to onboarding for professionals
              navigate('/onboarding/profile-photo');
            } else {
              // Clear stored values for clients
              localStorage.removeItem('pendingRole');
              localStorage.removeItem('pendingCategory');
              
              // Refresh to update UI with new role
              window.location.href = '/';
            }
          } catch (error) {
            console.error('Error updating role:', error);
            // Clear stored values even on error
            localStorage.removeItem('pendingRole');
            localStorage.removeItem('pendingCategory');
          }
        };
        
        updateRole();
      }, 0);
    }
  }, [user, navigate]);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };

    // Check if user is suspended
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (!profileError && profile?.status === 'suspended') {
        await supabase.auth.signOut();
        return { 
          error: { 
            message: 'Tavs konts ir bloķēts. Sazinies ar atbalstu.' 
          } 
        };
      }
    }

    return { error };
  };

  const signUp = async (email: string, password: string, name: string, role: 'CLIENT' | 'PROFESSIONAL') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role,
        }
      }
    });
    return { error, data };
  };

  const signInWithGoogle = async (role: 'CLIENT' | 'PROFESSIONAL', category?: string) => {
    // Store role and category in localStorage for retrieval after OAuth redirect
    localStorage.setItem('pendingRole', role);
    if (category) {
      localStorage.setItem('pendingCategory', category);
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};