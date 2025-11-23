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
    id: 'starter',
    name: 'Starter',
    price: '0',
    description: 'Sāc savu biznesu',
    features: [
      'Redzams sarakstā',
      'Pamata profils',
      'Līdz 1 kategorija',
      'Vienkāršs dizains',
    ],
    recommended: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '14.99',
    description: 'Profesionāliem meistariem',
    features: [
      'Verificēts status',
      'Izcelts profils',
      'Neierobežotas kategorijas',
      'Redzams kartē',
      'Prioritāte meklēšanā',
    ],
    recommended: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '24.99',
    description: 'Maksimālā redzamība',
    features: [
      'Visi Pro plus',
      'Augstākā prioritāte',
      'Lielāka profila kartīte',
      'Premium badge',
      'VIP atbalsts',
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

      // Map plan to Stripe price IDs (replace with actual Stripe price IDs from your Stripe dashboard)
      const stripePriceIds: Record<string, string> = {
        starter: 'price_starter_monthly', // Replace with actual Stripe price ID
        pro: 'price_pro_monthly',
        premium: 'price_premium_monthly'
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

        <div className="grid md:grid-cols-3 gap-8">
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
                <Button
                  className="w-full"
                  variant={plan.recommended ? 'default' : 'outline'}
                  onClick={() => handleActivate(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? 'Aktivizē...' : 'Aktivizēt'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>⚠️ Pirms maksājuma, lūdzu pārliecinies, ka Stripe Price ID ir pareizi konfigurēti kodā</p>
          <p>Aizvieto 'price_starter_monthly', 'price_pro_monthly', 'price_premium_monthly' ar taviem faktiskajiem Stripe Price ID</p>
        </div>
      </div>
    </div>
  );
}
