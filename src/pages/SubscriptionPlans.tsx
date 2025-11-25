import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const plans = [
  {
    id: 'free',
    name: 'Bezmaksas',
    price: '0',
    description: 'Pamata funkcijas',
    features: [
      '0 e-pasta kredīti',
      'Pamata profils',
      'Līdz 1 pakalpojums',
      'Ierobežota redzamība',
    ],
    recommended: false,
    isFree: true,
  },
  {
    id: 'starteris',
    name: 'Starteris',
    price: '9.99',
    description: 'Sāc savu biznesu',
    features: [
      '200 e-pasta kredīti/mēnesī',
      'Redzams sarakstā',
      'Pamata profils',
      'Līdz 5 pakalpojumi',
      'Rezervāciju pārvaldība',
    ],
    recommended: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '24.99',
    description: 'Profesionāliem meistariem',
    features: [
      '1000 e-pasta kredīti/mēnesī',
      'Verificēts status',
      'Izcelts profils',
      'Neierobežoti pakalpojumi',
      'Redzams kartē',
      'Prioritāte meklēšanā',
      'Detalizēta statistika',
    ],
    recommended: true,
  },
  {
    id: 'bizness',
    name: 'Bizness',
    price: '49.99',
    description: 'Maksimālā redzamība',
    features: [
      '5000 e-pasta kredīti/mēnesī',
      'Visi Pro plus',
      'Augstākā prioritāte',
      'Lielāka profila kartīte',
      'Premium badge',
      'VIP atbalsts 24/7',
      'Mārketinga rīki',
    ],
    recommended: false,
  },
];

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const verifySubscription = async () => {
      console.log('=== SUBSCRIPTION VERIFICATION START ===');
      console.log('Current URL:', window.location.href);
      console.log('Search params:', Object.fromEntries(searchParams.entries()));
      
      const sessionId = searchParams.get('session_id');
      const sessionSuccess = searchParams.get('session_success');

      console.log('sessionId:', sessionId);
      console.log('sessionSuccess:', sessionSuccess);

      if (sessionSuccess === 'true' && sessionId) {
        console.log('✅ Conditions met, starting verification...');
        setVerifying(true);
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          console.log('User:', user?.id);
          if (!user) {
            console.log('❌ No user found');
            return;
          }

          const { data: profile } = await supabase
            .from('professional_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          console.log('Professional profile:', profile?.id);
          if (!profile) {
            console.log('❌ No professional profile found');
            return;
          }

          console.log('🔄 Calling verify-subscription edge function...');
          const { data, error } = await supabase.functions.invoke('verify-subscription', {
            body: { sessionId, professionalId: profile.id }
          });

          console.log('Edge function response:', { data, error });

          if (error) {
            console.error('❌ Verification error:', error);
            toast({
              title: 'Kļūda',
              description: 'Neizdevās aktivizēt abonementu. Lūdzu sazinies ar atbalstu.',
              variant: 'destructive',
            });
          } else if (data?.success) {
            console.log('✅ Verification successful!');
            toast({
              title: 'Veiksmīgi!',
              description: `${data.plan} plāns tika aktivizēts ar ${data.credits} e-pasta kredītiem.`,
            });
            setTimeout(() => {
              navigate('/professional');
            }, 2000);
          }
        } catch (error) {
          console.error('❌ Verification failed:', error);
        } finally {
          setVerifying(false);
        }
      } else {
        console.log('❌ Conditions NOT met for verification');
        console.log('Missing:', !sessionSuccess ? 'sessionSuccess' : '', !sessionId ? 'sessionId' : '');
      }
    };

    verifySubscription();
  }, [searchParams, navigate, toast]);

  const handleActivate = async (planId: string) => {
    console.log('🚀 === SUBSCRIPTION ACTIVATION START ===');
    console.log('Plan ID:', planId);
    setLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('✅ User authenticated:', user?.id);
      if (!user) {
        console.log('❌ No user found');
        toast({
          title: 'Kļūda',
          description: 'Lietotājs nav autentificēts',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Get professional profile
      const { data: profile } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('✅ Professional profile:', profile?.id);
      if (!profile) {
        console.log('❌ No professional profile found');
        toast({
          title: 'Kļūda',
          description: 'Profesionāla profila nav atrasts',
          variant: 'destructive',
        });
        return;
      }

      // Map plan to Stripe price IDs
      const stripePriceIds: Record<string, string> = {
        starteris: 'price_1SWmMTRtOhWJgeVeCxB9RCxm',
        pro: 'price_1SWmMtRtOhWJgeVeiKK0m0YL',
        bizness: 'price_1SWmNCRtOhWJgeVekHZDvwzP'
      };

      const priceId = stripePriceIds[planId];
      console.log('✅ Price ID:', priceId);
      if (!priceId) {
        console.log('❌ Invalid plan ID');
        toast({
          title: 'Kļūda',
          description: 'Nederīgs plāns',
          variant: 'destructive',
        });
        return;
      }

      console.log('🔄 Calling stripe-checkout edge function...');
      console.log('Body:', {
        priceId,
        professionalId: profile.id,
        successUrl: `${window.location.origin}/abonesana`,
        cancelUrl: `${window.location.origin}/abonesana?session_canceled=true`
      });

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId,
          professionalId: profile.id,
          successUrl: `${window.location.origin}/abonesana`,
          cancelUrl: `${window.location.origin}/abonesana?session_canceled=true`
        }
      });

      console.log('📦 Edge function response:', { data, error });

      if (error) {
        console.error('❌ Checkout error:', error);
        toast({
          title: 'Kļūda',
          description: 'Neizdevās izveidot maksājumu sesiju',
          variant: 'destructive',
        });
        return;
      }

      // Check if subscription was updated (paid to paid switch)
      if (data?.subscriptionUpdated) {
        console.log('✅ Subscription updated successfully');
        toast({
          title: 'Veiksmīgi!',
          description: 'Tavs abonements tika atjaunināts. Izmaiņas būs redzamas pēc dažām sekundēm.',
        });
        
        // Wait 2 seconds for webhook to process, then redirect
        setTimeout(() => {
          navigate('/professional');
        }, 2000);
        return;
      }

      // Redirect to Stripe Checkout for new subscriptions
      console.log('🔗 Checking redirect URL:', data?.url);
      if (data?.url) {
        console.log('✅ Redirecting to Stripe:', data.url);
        window.location.href = data.url;
      } else {
        console.log('❌ No URL in response!');
        console.log('Full data object:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('❌ Error activating plan:', error);
      toast({
        title: 'Kļūda',
        description: 'Radās neparedzēta kļūda',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Aktivizē abonementu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Izvēlies savu abonēšanas plānu</h1>
          <p className="text-xl text-muted-foreground">
            Lai turpinātu un kļūtu redzams klientiem, izvēlies piemērotu plānu
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.recommended
                  ? 'border-primary shadow-lg scale-105'
                  : ''
              }`}
            >
              {plan.recommended && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Rekomendēts
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">€{plan.price}</span>
                  <span className="text-muted-foreground">/mēn</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.isFree ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled
                  >
                    Pašreizējais plāns
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.recommended ? 'default' : 'outline'}
                    onClick={() => handleActivate(plan.id)}
                    disabled={loading !== null}
                  >
                    {loading === plan.id ? 'Aktivizē...' : 'Aktivizēt'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
