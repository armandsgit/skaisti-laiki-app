import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const t = useTranslation('lv');
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-black rounded-full flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="10" r="4" fill="white"/>
              <path d="M16 16C12 16 8 18 8 22V26H24V22C24 18 20 16 16 16Z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">BeautyOn</h1>
          <p className="text-base" style={{ color: '#9A9A9A' }}>
            Skaistumkopšanas pakalpojumu platforma
          </p>
        </div>

        {/* Custom Tabs */}
        <div className="flex gap-8 mb-8 justify-center">
          <button
            onClick={() => setActiveTab('login')}
            className="relative pb-2 transition-colors"
            style={{
              color: activeTab === 'login' ? '#000000' : '#BFBFBF',
              fontWeight: activeTab === 'login' ? 600 : 400
            }}
          >
            Pieslēgties
            {activeTab === 'login' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className="relative pb-2 transition-colors"
            style={{
              color: activeTab === 'register' ? '#000000' : '#BFBFBF',
              fontWeight: activeTab === 'register' ? 600 : 400
            }}
          >
            Reģistrēties
            {activeTab === 'register' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium text-black">
                {t.email}
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="jusu@epasts.lv"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="h-12 bg-white text-base"
                style={{ 
                  border: '1px solid #E5E5E5',
                  borderRadius: '12px'
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm font-medium text-black">
                {t.password}
              </Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="h-12 bg-white text-base"
                style={{ 
                  border: '1px solid #E5E5E5',
                  borderRadius: '12px'
                }}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-black hover:bg-black/90 text-white font-semibold text-base mt-8"
              style={{ borderRadius: '14px' }}
              disabled={loading}
            >
              {loading ? t.loading : t.login}
            </Button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="register-name" className="text-sm font-medium text-black">
                {t.name}
              </Label>
              <Input
                id="register-name"
                type="text"
                placeholder="Jūsu vārds"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
                className="h-12 bg-white text-base"
                style={{ 
                  border: '1px solid #E5E5E5',
                  borderRadius: '12px'
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-sm font-medium text-black">
                {t.email}
              </Label>
              <Input
                id="register-email"
                type="email"
                placeholder="jusu@epasts.lv"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
                className="h-12 bg-white text-base"
                style={{ 
                  border: '1px solid #E5E5E5',
                  borderRadius: '12px'
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-sm font-medium text-black">
                {t.password}
              </Label>
              <Input
                id="register-password"
                type="password"
                placeholder="••••••••"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 bg-white text-base"
                style={{ 
                  border: '1px solid #E5E5E5',
                  borderRadius: '12px'
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-black">Loma</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRegisterRole('CLIENT')}
                  className="h-12 text-base font-medium transition-all"
                  style={{
                    background: registerRole === 'CLIENT' ? '#000000' : 'white',
                    color: registerRole === 'CLIENT' ? 'white' : '#000000',
                    border: '1px solid #E5E5E5',
                    borderRadius: '12px'
                  }}
                >
                  {t.client}
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('PROFESSIONAL')}
                  className="h-12 text-base font-medium transition-all"
                  style={{
                    background: registerRole === 'PROFESSIONAL' ? '#000000' : 'white',
                    color: registerRole === 'PROFESSIONAL' ? 'white' : '#000000',
                    border: '1px solid #E5E5E5',
                    borderRadius: '12px'
                  }}
                >
                  {t.professional}
                </button>
              </div>
            </div>
            
            {registerRole === 'PROFESSIONAL' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="register-category" className="text-sm font-medium text-black">
                    Kategorija *
                  </Label>
                  <select
                    id="register-category"
                    className="w-full h-12 px-4 text-base bg-white text-black"
                    style={{ 
                      border: '1px solid #E5E5E5',
                      borderRadius: '12px'
                    }}
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
                  <Label htmlFor="register-city" className="text-sm font-medium text-black">
                    Pilsēta *
                  </Label>
                  <Input
                    id="register-city"
                    type="text"
                    placeholder="Piemēram: Rīga"
                    value={registerCity}
                    onChange={(e) => setRegisterCity(e.target.value)}
                    required
                    className="h-12 bg-white text-base"
                    style={{ 
                      border: '1px solid #E5E5E5',
                      borderRadius: '12px'
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-address" className="text-sm font-medium text-black">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-black" />
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
                    className="h-12 bg-white text-base"
                    style={{ 
                      border: '1px solid #E5E5E5',
                      borderRadius: '12px'
                    }}
                  />
                  <p className="text-xs" style={{ color: '#9A9A9A' }}>
                    Ievadiet savu darba vietas adresi
                  </p>
                </div>
              </>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-black hover:bg-black/90 text-white font-semibold text-base mt-8"
              style={{ borderRadius: '14px' }}
              disabled={loading || geocoding}
            >
              {loading || geocoding ? t.loading : t.createAccount}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
