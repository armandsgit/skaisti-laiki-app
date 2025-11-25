import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Sparkles, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const t = useTranslation('lv');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<'CLIENT' | 'PROFESSIONAL'>('CLIENT');
  const [registerCategory, setRegisterCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('categories-changes-auth')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          loadCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast.error(t.loginError);
    } else {
      toast.success(t.loginSuccess);
      navigate('/');
    }
    
    setLoading(false);
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
    } else {
      if (registerRole === 'PROFESSIONAL' && data?.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: existingProfile } = await supabase
          .from('professional_profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        if (existingProfile) {
          const { error: profileError } = await supabase
            .from('professional_profiles')
            .update({
              category: registerCategory as any,
              approved: false
            })
            .eq('user_id', data.user.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
        } else {
          const { error: profileError } = await supabase
            .from('professional_profiles')
            .insert([{
              user_id: data.user.id,
              category: registerCategory as any,
              city: '',
              approved: false
            }]);
          
          if (profileError) {
            console.error('Profile create error:', profileError);
          }
        }
        
        toast.success(t.registerSuccess);
        navigate('/onboarding/profile-photo');
      } else {
        toast.success(t.registerSuccess);
        navigate('/');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant border">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto w-20 h-20 bg-black rounded-3xl flex items-center justify-center mb-2 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
            <span className="text-white text-4xl font-bold tracking-tight">B</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            BeautyOn
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Skaistumkopšanas pakalpojumu platforma
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 h-12">
              <TabsTrigger value="login" className="rounded-xl text-base">{t.login}</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl text-base">{t.register}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">{t.email}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="jusu@epasts.lv"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-12 bg-background border rounded-2xl text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">{t.password}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-12 bg-background border rounded-2xl text-base"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-black text-white hover:opacity-90 transition-opacity font-semibold rounded-2xl shadow-soft mt-6 text-base"
                  disabled={loading}
                >
                  {loading ? t.loading : t.login}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-sm font-medium">{t.name}</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Jūsu vārds"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                    className="h-12 bg-background border rounded-2xl text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm font-medium">{t.email}</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="jusu@epasts.lv"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    className="h-12 bg-background border rounded-2xl text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm font-medium">{t.password}</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 bg-background border rounded-2xl text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Loma</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={registerRole === 'CLIENT' ? 'default' : 'outline'}
                      onClick={() => setRegisterRole('CLIENT')}
                      className={`h-12 rounded-2xl text-base ${registerRole === 'CLIENT' ? 'bg-black text-white' : ''}`}
                    >
                      {t.client}
                    </Button>
                    <Button
                      type="button"
                      variant={registerRole === 'PROFESSIONAL' ? 'default' : 'outline'}
                      onClick={() => setRegisterRole('PROFESSIONAL')}
                      className={`h-12 rounded-2xl text-base ${registerRole === 'PROFESSIONAL' ? 'bg-black text-white' : ''}`}
                    >
                      {t.professional}
                    </Button>
                  </div>
                </div>
                
                {registerRole === 'PROFESSIONAL' && (
                  <div className="space-y-2">
                    <Label htmlFor="register-category" className="text-sm font-medium">Kategorija *</Label>
                    <select
                      id="register-category"
                      className="w-full h-12 px-4 rounded-2xl border bg-background text-foreground text-base"
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
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-black text-white hover:opacity-90 transition-opacity font-semibold rounded-2xl shadow-soft mt-6 text-base"
                  disabled={loading}
                >
                  {loading ? t.loading : t.createAccount}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
