import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { MapPin, DollarSign, Camera, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CityAutocomplete } from '@/components/CityAutocomplete';

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Workplace info
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  // Step 2: Service info
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('60');
  const [serviceDescription, setServiceDescription] = useState('');
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleGeocodeAddress = async () => {
    if (!address) {
      toast.error('Lūdzu ievadiet adresi');
      return;
    }

    setLoading(true);
    try {
      const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });

      if (geocodeError || !geocodeData || geocodeData.error) {
        toast.error('Nederīga adrese. Lūdzu pārbaudiet ievadīto informāciju.');
        setLoading(false);
        return;
      }
      
      setLatitude(geocodeData.latitude);
      setLongitude(geocodeData.longitude);
      toast.success('Adrese veiksmīgi atrasta!');
    } catch (err) {
      toast.error('Kļūda adreses noteikšanā.');
    }
    setLoading(false);
  };

  const handleStep1Next = async () => {
    if (!city || !address) {
      toast.error('Lūdzu aizpildiet visus laukus');
      return;
    }

    if (!latitude || !longitude) {
      toast.error('Lūdzu apstipriniet adresi');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('professional_profiles')
      .update({
        city,
        address,
        latitude,
        longitude
      })
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Kļūda saglabājot informāciju');
      setLoading(false);
      return;
    }

    setLoading(false);
    setCurrentStep(2);
  };

  const handleStep2Next = async () => {
    if (!serviceName || !servicePrice) {
      toast.error('Lūdzu aizpildiet pakalpojuma nosaukumu un cenu');
      return;
    }

    setLoading(true);
    
    // Get professional profile
    const { data: profile } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (!profile) {
      toast.error('Profils nav atrasts');
      setLoading(false);
      return;
    }

    // Create service
    const { error } = await supabase
      .from('services')
      .insert({
        professional_id: profile.id,
        name: serviceName,
        price: parseFloat(servicePrice),
        duration: parseInt(serviceDuration),
        description: serviceDescription || null
      });

    if (error) {
      toast.error('Kļūda pievienojot pakalpojumu');
      setLoading(false);
      return;
    }

    setLoading(false);
    setCurrentStep(3);
  };

  const handleFinish = async () => {
    setLoading(true);
    
    // Mark profile as ready for approval
    const { error } = await supabase
      .from('professional_profiles')
      .update({
        approved: false
      })
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Kļūda pabeidzot iestatīšanu');
      setLoading(false);
      return;
    }

    toast.success('Jūsu profils ir izveidots un gaida apstiprināšanu!');
    navigate('/professional');
  };

  const steps = [
    { number: 1, title: 'Darba vietas informācija' },
    { number: 2, title: 'Pakalpojumi' },
    { number: 3, title: 'Gatavs!' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-elegant border">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="mx-auto w-20 h-20 bg-black rounded-3xl flex items-center justify-center mb-2 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
            <span className="text-white text-4xl font-bold tracking-tight">B</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Profila iestatīšana
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Solis {currentStep} no {steps.length}
          </CardDescription>
          
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep === step.number
                      ? 'bg-black text-white'
                      : currentStep > step.number
                      ? 'bg-black text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                </div>
                {step.number < steps.length && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      currentStep > step.number ? 'bg-black' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          {/* Step 1: Workplace Info */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Pilsēta *
                </Label>
                <CityAutocomplete
                  value={city}
                  onChange={setCity}
                  placeholder="Piemēram: Rīga"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Precīza adrese *
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Piemēram: Brīvības iela 1"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-12 bg-background border rounded-2xl text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeocodeAddress}
                  disabled={loading || !address}
                  className="w-full h-10 rounded-xl text-sm"
                >
                  {latitude && longitude ? '✓ Adrese apstiprināta' : 'Apstiprināt adresi'}
                </Button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="flex-1 h-12 rounded-2xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atpakaļ
                </Button>
                <Button
                  onClick={handleStep1Next}
                  disabled={loading || !latitude || !longitude}
                  className="flex-1 h-12 bg-black text-white rounded-2xl"
                >
                  Turpināt
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Services */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label htmlFor="serviceName" className="text-sm font-medium">
                  Pakalpojuma nosaukums *
                </Label>
                <Input
                  id="serviceName"
                  type="text"
                  placeholder="Piemēram: Matu griezums"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="h-12 bg-background border rounded-2xl text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="servicePrice" className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Cena (€) *
                  </Label>
                  <Input
                    id="servicePrice"
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="h-12 bg-background border rounded-2xl text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceDuration" className="text-sm font-medium">
                    Ilgums (min)
                  </Label>
                  <select
                    id="serviceDuration"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl border bg-background text-foreground text-base"
                  >
                    <option value="20">20 min</option>
                    <option value="30">30 min</option>
                    <option value="40">40 min</option>
                    <option value="50">50 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                    <option value="120">120 min</option>
                    <option value="150">150 min</option>
                    <option value="180">180 min</option>
                    <option value="240">240 min</option>
                    <option value="300">300 min</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceDescription" className="text-sm font-medium">
                  Apraksts (neobligāti)
                </Label>
                <textarea
                  id="serviceDescription"
                  rows={3}
                  placeholder="Īss pakalpojuma apraksts"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border bg-background text-foreground text-base resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 h-12 rounded-2xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atpakaļ
                </Button>
                <Button
                  onClick={handleStep2Next}
                  disabled={loading}
                  className="flex-1 h-12 bg-black text-white rounded-2xl"
                >
                  Turpināt
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 3 && (
            <div className="space-y-6 text-center animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-white" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Profils ir gatavs!</h3>
                <p className="text-muted-foreground">
                  Jūsu profils ir izveidots un gaida administratora apstiprināšanu.
                  Pēc apstiprināšanas varēsiet sākt pieņemt rezervācijas.
                </p>
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 space-y-2 text-left">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-black mt-0.5" />
                  <div>
                    <p className="font-medium">Darba vietas informācija pievienota</p>
                    <p className="text-sm text-muted-foreground">{city}, {address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-black mt-0.5" />
                  <div>
                    <p className="font-medium">Pakalpojums pievienots</p>
                    <p className="text-sm text-muted-foreground">{serviceName} - €{servicePrice}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 h-12 rounded-2xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atpakaļ
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 h-12 bg-black text-white rounded-2xl"
                >
                  Pabeigt iestatīšanu
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
