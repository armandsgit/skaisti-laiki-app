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
    price: '19.99',
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
    id: 'premium',
    name: 'Premium',
    price: '39.99',
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
      // IMPORTANT: Replace these with your actual Stripe Price IDs from your Stripe Dashboard
      // The Price IDs should contain 'starter', 'pro', or 'premium' in their ID for automatic detection
      // Or update the webhook to match your exact Price IDs
      const stripePriceIds: Record<string, string> = {
        starter: 'price_starter_monthly', // Replace with actual Stripe price ID (e.g., price_1ABC123...)
        pro: 'price_pro_monthly',         // Replace with actual Stripe price ID
        premium: 'price_premium_monthly'  // Replace with actual Stripe price ID
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

        <div className="mt-12 text-center">
          <div className="max-w-3xl mx-auto bg-muted/30 rounded-lg p-6 border border-border/50">
            <h3 className="font-semibold text-lg mb-3">⚙️ Konfigurācijas instrukcijas</h3>
            <div className="text-sm text-muted-foreground space-y-2 text-left">
              <p><strong>1.</strong> Atver Stripe Dashboard → Products → Pricing</p>
              <p><strong>2.</strong> Izveido vai atrodi Price ID katram plānam</p>
              <p><strong>3.</strong> Koda failā <code className="bg-muted px-2 py-0.5 rounded">SubscriptionPlans.tsx</code> aizvieto:</p>
              <ul className="ml-6 mt-2 space-y-1">
                <li>• <code className="bg-muted px-2 py-0.5 rounded">price_starter_monthly</code> ar tavu Starter Price ID</li>
                <li>• <code className="bg-muted px-2 py-0.5 rounded">price_pro_monthly</code> ar tavu Pro Price ID</li>
                <li>• <code className="bg-muted px-2 py-0.5 rounded">price_premium_monthly</code> ar tavu Premium Price ID</li>
              </ul>
              <p className="mt-3"><strong>Piemērs:</strong> <code className="bg-muted px-2 py-0.5 rounded">price_1ABC123xyz456DEF</code></p>
              <p className="mt-3 text-warning">⚠️ Bez pareiziem Price ID maksājumi nedarbosies!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
