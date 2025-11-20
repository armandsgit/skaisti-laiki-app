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

      // Update subscription
      const { error } = await supabase
        .from('professional_profiles')
        .update({
          plan: planId,
          subscription_status: 'active',
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Veiksmīgi!',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} plāns aktivizēts`,
      });

      // Mock Stripe subscription (placeholder for future)
      console.log('subscribeWithStripe:', planId);

      navigate('/professional');
    } catch (error) {
      console.error('Error activating plan:', error);
      toast({
        title: 'Kļūda',
        description: 'Neizdevās aktivizēt plānu',
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
          <p>* Pagaidām plāni ir bez maksājuma (mock versija)</p>
          <p>Stripe integrācija tiks pievienota nākotnē</p>
        </div>
      </div>
    </div>
  );
}
