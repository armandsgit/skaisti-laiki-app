import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
    </g>
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  message?: string;
}

const AuthModal = ({ isOpen, onClose, onSuccess, message }: AuthModalProps) => {
  const t = useTranslation('lv');
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<'CLIENT' | 'PROFESSIONAL'>('CLIENT');
  const [registerCategory, setRegisterCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (!error && data) {
        const categoryNames = data.map(cat => cat.name);
        setCategories(categoryNames);
        if (categoryNames.length > 0 && !registerCategory) {
          setRegisterCategory(categoryNames[0]);
        }
      }
    };
    
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Handle visibility animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setHasRedirected(false);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Watch for user login and redirect based on role
  useEffect(() => {
    if (user && isOpen && !hasRedirected) {
      setHasRedirected(true);
      redirectBasedOnRole();
    }
  }, [user, isOpen, hasRedirected]);

  const redirectBasedOnRole = async () => {
    if (!user) return;
    
    try {
      // Check if user is ADMIN
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'ADMIN')
        .maybeSingle();

      if (adminRole) {
        onClose();
        navigate('/admin', { replace: true });
        return;
      }

      // Check regular profile role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      onClose();
      
      if (profile) {
        switch (profile.role) {
          case 'PROFESSIONAL':
            navigate('/professional', { replace: true });
            break;
          case 'ADMIN':
            navigate('/admin', { replace: true });
            break;
          default:
            onSuccess();
        }
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Redirect error:', error);
      onSuccess();
      onClose();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast.error(t.loginError);
      setLoading(false);
      return;
    }
    
    toast.success(t.loginSuccess);
    setLoading(false);
    // onSuccess will be triggered by useEffect when user state updates
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (registerRole === 'PROFESSIONAL' && !registerCategory) {
      toast.error('Lūdzu izvēlieties kategoriju');
      setLoading(false);
      return;
    }
    
    const { error, data } = await signUp(registerEmail, registerPassword, registerName, registerRole);
    
    if (error) {
      toast.error(t.registerError);
      setLoading(false);
      return;
    }
    
    if (registerRole === 'PROFESSIONAL' && data?.user) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: existingProfile } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      if (existingProfile) {
        await supabase
          .from('professional_profiles')
          .update({
            category: registerCategory as any,
            approved: false
          })
          .eq('user_id', data.user.id);
      } else {
        await supabase
          .from('professional_profiles')
          .insert([{
            user_id: data.user.id,
            category: registerCategory as any,
            city: '',
            approved: false
          }]);
      }
      
      toast.success(t.registerSuccess);
      onClose();
      navigate('/onboarding/profile-photo');
    } else {
      toast.success(t.registerSuccess);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (registerRole === 'PROFESSIONAL' && !registerCategory) {
      toast.error('Lūdzu izvēlieties kategoriju');
      return;
    }
    
    setLoading(true);
    
    // Store that we're in booking flow to handle OAuth return
    sessionStorage.setItem('pendingBookingAction', 'true');
    
    const { error } = await signInWithGoogle(registerRole, registerCategory);
    
    if (error) {
      toast.error('Neizdevās autorizēties ar Google');
      setLoading(false);
    }
    // No need to set loading false on success as OAuth redirect will happen
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal - fixed positioning with proper mobile scroll */}
      <div 
        className={`fixed inset-x-4 top-4 bottom-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[95%] sm:max-w-md sm:max-h-[90vh] bg-card rounded-3xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Content - scrollable */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain p-6 pt-12">
          {/* Close button - positioned inside the card */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <span className="text-white text-3xl font-bold">B</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Pieslēgties</h2>
            <p className="text-muted-foreground text-sm">
              {message || 'Lai turpinātu, lūdzu pieslēdzieties vai reģistrējieties'}
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5 bg-muted/50 h-11">
              <TabsTrigger value="login" className="rounded-xl text-sm">{t.login}</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl text-sm">{t.register}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-login-email" className="text-sm font-medium">{t.email}</Label>
                  <Input
                    id="modal-login-email"
                    type="email"
                    placeholder="jusu@epasts.lv"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-11 bg-background border rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="modal-login-password" className="text-sm font-medium">{t.password}</Label>
                  <Input
                    id="modal-login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-11 bg-background border rounded-xl text-sm"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-black text-white hover:opacity-90 transition-opacity font-semibold rounded-xl shadow-sm mt-4 text-sm"
                  disabled={loading}
                >
                  {loading ? t.loading : t.login}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Vai</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signInWithGoogle()}
                  disabled={loading}
                  className="w-full h-11 border-2 hover:bg-secondary transition-all font-medium rounded-xl text-sm flex items-center justify-center gap-3"
                >
                  <GoogleIcon />
                  Turpināt ar Google
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-register-name" className="text-sm font-medium">{t.name}</Label>
                  <Input
                    id="modal-register-name"
                    type="text"
                    placeholder="Jūsu vārds"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                    className="h-11 bg-background border rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="modal-register-email" className="text-sm font-medium">{t.email}</Label>
                  <Input
                    id="modal-register-email"
                    type="email"
                    placeholder="jusu@epasts.lv"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    className="h-11 bg-background border rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="modal-register-password" className="text-sm font-medium">{t.password}</Label>
                  <Input
                    id="modal-register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 bg-background border rounded-xl text-sm"
                  />
                </div>

                {/* Role selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Loma</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={registerRole === 'CLIENT' ? 'default' : 'outline'}
                      onClick={() => setRegisterRole('CLIENT')}
                      className={`h-11 rounded-xl text-sm ${registerRole === 'CLIENT' ? 'bg-black text-white' : ''}`}
                    >
                      {t.client}
                    </Button>
                    <Button
                      type="button"
                      variant={registerRole === 'PROFESSIONAL' ? 'default' : 'outline'}
                      onClick={() => setRegisterRole('PROFESSIONAL')}
                      className={`h-11 rounded-xl text-sm ${registerRole === 'PROFESSIONAL' ? 'bg-black text-white' : ''}`}
                    >
                      {t.professional}
                    </Button>
                  </div>
                </div>
                
                {/* Category selection for professionals */}
                {registerRole === 'PROFESSIONAL' && (
                  <div className="space-y-2">
                    <Label htmlFor="modal-register-category" className="text-sm font-medium">Kategorija *</Label>
                    <select
                      id="modal-register-category"
                      className="w-full h-11 px-4 rounded-xl border bg-background text-foreground text-sm"
                      value={registerCategory}
                      onChange={(e) => setRegisterCategory(e.target.value)}
                      required
                    >
                      {categories.length === 0 ? (
                        <option value="">Ielādē kategorijas...</option>
                      ) : (
                        categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {registerRole === 'PROFESSIONAL' 
                    ? 'Reģistrējoties jūs izveidosiet meistara kontu'
                    : 'Reģistrējoties jūs izveidosiet klienta kontu'
                  }
                </p>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-black text-white hover:opacity-90 transition-opacity font-semibold rounded-xl shadow-sm mt-4 text-sm"
                  disabled={loading}
                >
                  {loading ? t.loading : t.createAccount}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Vai</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-11 border-2 hover:bg-secondary transition-all font-medium rounded-xl text-sm flex items-center justify-center gap-3"
                >
                  <GoogleIcon />
                  Turpināt ar Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AuthModal;
