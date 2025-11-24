import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Mail, Zap, Award, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
    stripePrice: 'price_1SWmMTRtOhWJgeVeCxB9RCxm', // ← Paste your Starteris Price ID here
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
    stripePrice: 'price_1SWmMtRtOhWJgeVeiKK0m0YL', // ← Paste your Pro Price ID here
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
    stripePrice: 'price_1SWmNCRtOhWJgeVekHZDvwzP', // ← Paste your Bizness Price ID here
  },
];

export default function Abonesana() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [emailCredits, setEmailCredits] = useState(0);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('professional_profiles')
        .select('id, plan, subscription_status')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentPlan(profile.plan || 'free');
        setHasActiveSubscription(profile.subscription_status === 'active');

        // Get email credits
        const { data: credits } = await supabase
          .from('email_credits')
          .select('credits')
          .eq('master_id', profile.id)
          .single();

        setEmailCredits(credits?.credits || 0);
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  const handleDowngradeToFree = async () => {
    setShowDowngradeDialog(false);
    setLoading('free');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Kļūda',
          description: 'Lūdzu piesakieties, lai turpinātu',
          variant: 'destructive',
        });
        navigate('/auth');
        setLoading(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('downgrade-to-free', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Downgrade error:', error);
        toast({
          title: 'Kļūda',
          description: 'Neizdevās pāriet uz FREE plānu',
          variant: 'destructive',
        });
        setLoading(null);
        return;
      }

      toast({
        title: 'Veiksmīgi!',
        description: 'Jūsu abonements tika atcelts. Tagad izmantojat FREE plānu.',
      });

      // Reload current plan
      await loadCurrentPlan();
      setLoading(null);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Kļūda',
        description: 'Radās neparedzēta kļūda',
        variant: 'destructive',
      });
      setLoading(null);
    }
  };

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
        setLoading(null);
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('professional_profiles')
        .select('id, stripe_subscription_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        toast({
          title: 'Kļūda',
          description: 'Profesionāla profila nav atrasts',
          variant: 'destructive',
        });
        setLoading(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId: stripePrice,
          professionalId: profile.id,
          existingSubscriptionId: profile.stripe_subscription_id,
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
        setLoading(null);
        return;
      }

      if (data?.url) {
        // Don't reset loading here - page will redirect
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Kļūda',
        description: 'Radās neparedzēta kļūda',
        variant: 'destructive',
      });
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

        <div className="grid md:grid-cols-4 gap-8">
          {/* FREE Plan Card */}
          <Card className="relative transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-6 h-6 text-muted-foreground" />
                <CardTitle className="text-2xl">Free</CardTitle>
              </div>
              <CardDescription>Pamata funkcijas</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€0</span>
                <span className="text-muted-foreground">/mēn</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>0 e-pasta kredīti</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Pamata profils</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Līdz 3 pakalpojumiem</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground line-through">E-pasta automātika</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground line-through">Statistika</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {currentPlan === 'free' || !hasActiveSubscription ? (
                <Button className="w-full" variant="outline" disabled>
                  Jūsu pašreizējais plāns
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowDowngradeDialog(true)}
                  disabled={loading !== null}
                >
                  {loading === 'free' ? 'Apstrādā...' : 'Pāriet uz FREE'}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Paid Plans */}
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
                    disabled={loading !== null || (currentPlan === plan.id && hasActiveSubscription)}
                  >
                    {currentPlan === plan.id && hasActiveSubscription 
                      ? 'Jūsu pašreizējais plāns'
                      : loading === plan.id 
                        ? 'Apstrādā...' 
                        : 'Abonēt'}
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

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Pāriet uz FREE plānu?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p className="font-medium text-foreground">
                Pārejot uz FREE plānu, jūs zaudēsiet:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span><strong>E-pasta automātiku</strong> - automātiskie rezervāciju apstiprinājumi un atgādinājumi</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span><strong>Statistiku</strong> - detalizēta analītika par rezervācijām un ieņēmumiem</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span><strong>Papildus pakalpojumus</strong> - maksimums 3 pakalpojumi</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span><strong>Esošos e-pasta kredītus</strong> - pašreizējie {emailCredits} kredīti tiks atiestatīti uz 0</span>
                </li>
              </ul>
              <p className="text-warning font-medium mt-4">
                Vai tiešām vēlaties turpināt?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atcelt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDowngradeToFree}
              className="bg-destructive hover:bg-destructive/90"
            >
              Jā, pāriet uz FREE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}