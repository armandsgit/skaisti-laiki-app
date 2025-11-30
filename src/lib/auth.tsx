import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  const previousUserRef = useRef<User | null>(null);
  const oauthProcessedRef = useRef<boolean>(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Track previous user state using ref
        const previousUser = previousUserRef.current;
        
        // Update state
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update ref for next state change
        previousUserRef.current = session?.user ?? null;
        
        // If user was logged in but now session is null (account deleted/invalidated)
        if (event === 'SIGNED_OUT' && previousUser && !session) {
          const currentPath = window.location.pathname;
          const isManualLogout = sessionStorage.getItem('manualLogout') === 'true';
          
          // Clear manual logout flag
          sessionStorage.removeItem('manualLogout');
          
          // Reset OAuth processed flag on signout
          oauthProcessedRef.current = false;
          
          // Only show error and redirect if not manual logout and not already on auth page
          if (!isManualLogout && currentPath !== '/auth') {
            toast.error('Tavs konts ir dzēsts vai sesija beigusies.');
            navigate('/auth');
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      previousUserRef.current = session?.user ?? null;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Handle post-OAuth role update separately
  useEffect(() => {
    if (!user) return;
    
    // Prevent re-processing if already handled
    if (oauthProcessedRef.current) return;

    const pendingRole = localStorage.getItem('pendingRole') as 'CLIENT' | 'PROFESSIONAL' | null;
    const pendingCategory = localStorage.getItem('pendingCategory');
    
    // Only process if there's a pending role (OAuth registration flow)
    if (!pendingRole) return;
    
    // Mark as processed immediately
    oauthProcessedRef.current = true;
    
    // Clear immediately to prevent re-processing
    localStorage.removeItem('pendingRole');
    localStorage.removeItem('pendingCategory');
    
    // Defer Supabase calls using setTimeout(0) to avoid deadlocks
    setTimeout(() => {
      const handleAuthRole = async () => {
        try {
          // Check if user has ADMIN role
          const { data: existingRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          const hasAdminRole = existingRoles?.some(r => r.role === 'ADMIN');
          
          // If user is admin, don't override
          if (hasAdminRole) {
            navigate('/admin');
            return;
          }

          // Update user metadata
          await supabase.auth.updateUser({
            data: { role: pendingRole }
          });
          
          // Check if profile exists and is already approved
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('approved')
            .eq('id', user.id)
            .single();
          
          // Update profiles table with role - only set approved to false for NEW users
          const updateData: any = { role: pendingRole };
          if (!existingProfile || existingProfile.approved === null) {
            // Only set approved to false if this is a new user or approval status is not set
            updateData.approved = false;
          }
          
          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id);
          
          // Check if user_role already exists
          const hasRoleEntry = existingRoles && existingRoles.length > 0;
          
          if (!hasRoleEntry) {
            // Only insert if no role exists
            await supabase
              .from('user_roles')
              .insert({ user_id: user.id, role: pendingRole });
          }
          
          // Create professional profile if role is PROFESSIONAL
          if (pendingRole === 'PROFESSIONAL' && pendingCategory) {
            const { data: existingProfProfile } = await supabase
              .from('professional_profiles')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!existingProfProfile) {
              await supabase
                .from('professional_profiles')
                .insert([{
                  user_id: user.id,
                  category: pendingCategory as any,
                  city: '',
                  approved: false
                }]);
            }
            
            // Navigate to onboarding for professionals
            navigate('/onboarding/profile-photo');
          } else {
            // Check if approved before redirecting
            if (existingProfile?.approved === false) {
              navigate('/waiting-approval');
            } else {
              // Navigate directly to client dashboard
              navigate('/client');
            }
          }
        } catch (error) {
          console.error('Error handling auth role:', error);
        }
      };
      
      handleAuthRole();
    }, 0);
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
    // Set flag to prevent "account deleted" message on manual logout
    sessionStorage.setItem('manualLogout', 'true');
    // Clear any pending auth data
    localStorage.removeItem('pendingRole');
    localStorage.removeItem('pendingCategory');
    // Reset OAuth processed flag
    oauthProcessedRef.current = false;
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};