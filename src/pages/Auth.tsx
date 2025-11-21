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
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerCategory, setRegisterCategory] = useState('');
  const [registerCity, setRegisterCity] = useState('');
  const [geocoding, setGeocoding] = useState(false);
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
    
    if (registerRole === 'PROFESSIONAL') {
      if (!registerAddress || !registerCity) {
        toast.error('Lūdzu aizpildiet visus obligātos laukus');
        setLoading(false);
        return;
      }
    }
    
    let latitude = null;
    let longitude = null;
    
    if (registerRole === 'PROFESSIONAL' && registerAddress) {
      setGeocoding(true);
      toast.loading('Notiek adreses noteikšana...');
      
      try {
        const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode-address', {
          body: { address: registerAddress }
        });

        setGeocoding(false);
        toast.dismiss();
        
        if (geocodeError || !geocodeData) {
          toast.error('Nederīga adrese. Lūdzu pārbaudiet ievadīto informāciju.');
          setLoading(false);
          return;
        }
        
        if (geocodeData.error) {
          toast.error(geocodeData.error);
          setLoading(false);
          return;
        }
        
        latitude = geocodeData.latitude;
        longitude = geocodeData.longitude;
      } catch (err) {
        setGeocoding(false);
        toast.dismiss();
        toast.error('Kļūda adreses noteikšanā. Lūdzu mēģiniet vēlreiz.');
        setLoading(false);
        return;
      }
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
              address: registerAddress,
              latitude,
              longitude,
              category: registerCategory as any,
              city: registerCity,
              approved: false
            })
            .eq('user_id', data.user.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
        } else {
          const { error: profileError } = await supabase
            .from('professional_profiles')
            .insert({
              user_id: data.user.id,
              address: registerAddress,
              latitude,
              longitude,
              category: registerCategory as any,
              city: registerCity,
              approved: false
            });
          
          if (profileError) {
            console.error('Profile create error:', profileError);
          }
        }
      }
      
      toast.success(t.registerSuccess);
      navigate('/');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant border-border/50 bg-card">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center mb-2 shadow-elegant">
            <Sparkles className="w-10 h-10 text-black" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            BeautyOn
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Skaistumkopšanas pakalpojumu platforma
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/30 h-12">
              <TabsTrigger value="login" className="rounded-xl">{t.login}</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl">{t.register}</TabsTrigger>
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
                    className="h-12 bg-muted/30 border-border/50 rounded-2xl"
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
                    className="h-12 bg-muted/30 border-border/50 rounded-2xl"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-black font-semibold rounded-2xl shadow-soft mt-6"
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
                    className="h-12 bg-muted/30 border-border/50 rounded-2xl"
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
                    className="h-12 bg-muted/30 border-border/50 rounded-2xl"
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
                    className="h-12 bg-muted/30 border-border/50 rounded-2xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Loma</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={registerRole === 'CLIENT' ? 'default' : 'outline'}
                      onClick={() => setRegisterRole('CLIENT')}
                      className={`h-12 rounded-2xl ${registerRole === 'CLIENT' ? 'bg-primary text-black' : 'border-border/50'}`}
                    >
                      {t.client}
                    </Button>
                    <Button
                      type="button"
                      variant={registerRole === 'PROFESSIONAL' ? 'default' : 'outline'}
                      onClick={() => setRegisterRole('PROFESSIONAL')}
                      className={`h-12 rounded-2xl ${registerRole === 'PROFESSIONAL' ? 'bg-primary text-black' : 'border-border/50'}`}
                    >
                      {t.professional}
                    </Button>
                  </div>
                </div>
                
                {registerRole === 'PROFESSIONAL' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="register-category" className="text-sm font-medium">Kategorija *</Label>
                      <select
                        id="register-category"
                        className="w-full h-12 px-4 rounded-2xl border border-border/50 bg-muted/30 text-foreground"
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-city" className="text-sm font-medium">Pilsēta *</Label>
                      <Input
                        id="register-city"
                        type="text"
                        placeholder="Piemēram: Rīga"
                        value={registerCity}
                        onChange={(e) => setRegisterCity(e.target.value)}
                        required
                        className="h-12 bg-muted/30 border-border/50 rounded-2xl"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-address" className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          Adrese *
                        </div>
                      </Label>
                      <Input
                        id="register-address"
                        type="text"
                        placeholder="Piemēram: Brīvības iela 1, Rīga"
                        value={registerAddress}
                        onChange={(e) => setRegisterAddress(e.target.value)}
                        disabled={geocoding}
                        required
                        className="h-12 bg-muted/30 border-border/50 rounded-2xl"
                      />
                      <p className="text-xs text-muted-foreground">
                        Ievadiet savu darba vietas adresi
                      </p>
                    </div>
                  </>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-black font-semibold rounded-2xl shadow-soft mt-6"
                  disabled={loading || geocoding}
                >
                  {loading || geocoding ? t.loading : t.createAccount}
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
