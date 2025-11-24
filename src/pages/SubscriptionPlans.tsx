import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState<string | null>(null);

  const handleActivate = async (planId: string) => {
    setLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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

      if (!profile) {
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
      if (!priceId) {
        toast({
          title: 'Kļūda',
          description: 'Nederīgs plāns',
          variant: 'destructive',
        });
        return;
      }

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId,
          professionalId: profile.id,
          successUrl: `${window.location.origin}/professional?session_success=true`,
          cancelUrl: `${window.location.origin}/subscription-plans?session_canceled=true`
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        toast({
          title: 'Kļūda',
          description: 'Neizdevās izveidot maksājumu sesiju',
          variant: 'destructive',
        });
        return;
      }

      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error activating plan:', error);
      toast({
        title: 'Kļūda',
        description: 'Radās neparedzēta kļūda',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

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
