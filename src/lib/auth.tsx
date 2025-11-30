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
  const oauthProcessedRef = useRef<Set<string>>(new Set()); // Track processed user IDs
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

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
          
          // Reset OAuth processed set on signout
          oauthProcessedRef.current.clear();
          
          // Only show error and redirect if not manual logout and not already on auth page
          if (!isManualLogout && currentPath !== '/auth') {
            toast.error('Tavs konts ir dzēsts vai sesija beigusies.');
            navigate('/auth');
          }
        }
      }
    );

    // Check for existing session ONCE
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      previousUserRef.current = session?.user ?? null;
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      isInitializedRef.current = false;
    };
  }, [navigate]);

  // Handle post-OAuth role update separately
  useEffect(() => {
    if (!user?.id) {
      return;
    }
    
    // Check if we've already processed this user
    if (oauthProcessedRef.current.has(user.id)) {
      return;
    }

    const pendingRole = localStorage.getItem('pendingRole') as 'CLIENT' | 'PROFESSIONAL' | null;
    const pendingCategory = localStorage.getItem('pendingCategory');
    
    // Only process if there's a pending role (OAuth registration flow)
    if (!pendingRole) return;
    
    // Mark this user as processed immediately
    oauthProcessedRef.current.add(user.id);
    
    // Clear storage immediately
    localStorage.removeItem('pendingRole');
    localStorage.removeItem('pendingCategory');
    
    // Defer processing to avoid blocking auth state
    const processOAuthRole = async () => {
      try {
        // Check if user has ADMIN role
        const { data: existingRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        const hasAdminRole = existingRoles?.some(r => r.role === 'ADMIN');
        
        // If user is admin, redirect directly
        if (hasAdminRole) {
          navigate('/admin', { replace: true });
          return;
        }

        // Check if profile exists and is already approved
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('approved, role')
          .eq('id', user.id)
          .maybeSingle();
        
        // Update profiles table with role - only set approved to false for NEW users
        const updateData: any = { role: pendingRole };
        if (!existingProfile || existingProfile.approved === null) {
          updateData.approved = false;
        }
        
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);
        
        // Check if user_role already exists
        const hasRoleEntry = existingRoles && existingRoles.length > 0;
        
        if (!hasRoleEntry) {
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
          
          navigate('/onboarding/profile-photo', { replace: true });
        } else {
          // Check if approved before redirecting
          if (existingProfile?.approved === false) {
            navigate('/waiting-approval', { replace: true });
          } else {
            navigate('/client', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error handling auth role:', error);
        // On error, remove from processed set to allow retry
        oauthProcessedRef.current.delete(user.id);
      }
    };
    
    // Use setTimeout to defer processing
    setTimeout(processOAuthRole, 100);
  }, [user?.id, navigate]);

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
    // Reset OAuth processed set
    oauthProcessedRef.current.clear();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};