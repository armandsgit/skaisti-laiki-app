import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Mail, Zap, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// TODO: Replace these placeholder Price IDs with real ones from your Stripe Dashboard
// Go to: https://dashboard.stripe.com/products
// Create 3 recurring subscription products and copy their Price IDs here
const plans = [
  {
    id: 'starteris',
    name: 'Starteris',
    price: '9.99',
    emailCredits: 200,
    description: 'Ideāli sākumam',
    features: [
      'Rezervāciju e-pasti',
      'Apstiprinājumi',
      'Atgādinājumi',
      '200 e-pasta kredīti/mēn',
    ],
    icon: Mail,
    recommended: false,
    stripePrice: 'price_XXXXXXXXXXXXXX', // ← Paste your Starteris Price ID here
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '24.99',
    emailCredits: 1000,
    description: 'Profesionāliem meistariem',
    features: [
      'Rezervāciju e-pasti',
      'Atgādinājumi',
      'SMS integrācijas pieejamība',
      '1000 e-pasta kredīti/mēn',
      'Prioritāte meklēšanā',
    ],
    icon: Zap,
    recommended: true,
    stripePrice: 'price_XXXXXXXXXXXXXX', // ← Paste your Pro Price ID here
  },
  {
    id: 'bizness',
    name: 'Bizness',
    price: '49.99',
    emailCredits: 5000,
    description: 'Biznesa risinājums',
    features: [
      'Visi e-pasti',
      'SMS',
      'Prioritārais atbalsts',
      '5000 e-pasta kredīti/mēn',
      'Analītikas rīki',
      'API piekļuve',
    ],
    icon: Award,
    recommended: false,
    stripePrice: 'price_XXXXXXXXXXXXXX', // ← Paste your Bizness Price ID here
  },
];

export default function Abonesana() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, stripePrice: string) => {
    setLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Kļūda',
          description: 'Lūdzu piesakieties, lai turpinātu',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

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

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId: stripePrice,
          professionalId: profile.id,
          successUrl: `${window.location.origin}/maksa-izdevusies`,
          cancelUrl: `${window.location.origin}/abonesana`
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

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error:', error);
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
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Izvēlies savu abonēšanas plānu</h1>
          <p className="text-xl text-muted-foreground">
            Paplašini savas iespējas ar e-pasta kredītiem un papildus funkcijām
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <Card
                key={plan.id}
                className={`relative transition-all hover:shadow-lg ${
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
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className="w-6 h-6 text-primary" />
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">€{plan.price}</span>
                    <span className="text-muted-foreground">/mēn</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{plan.emailCredits} e-pasta kredīti iekļauti</span>
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
                    onClick={() => handleSubscribe(plan.id, plan.stripePrice)}
                    disabled={loading !== null}
                  >
                    {loading === plan.id ? 'Apstrādā...' : 'Abonēt'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>💳 Droši maksājumi caur Stripe</p>
          <p className="mt-2">✉️ E-pasta kredīti atjaunojas automātiski katru mēnesi</p>
        </div>
      </div>
    </div>
  );
}