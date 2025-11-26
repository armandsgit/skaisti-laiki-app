import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Mail, Zap, Award, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { lv } from 'date-fns/locale';
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
// Plan hierarchy for downgrade detection
const PLAN_ORDER = {
  free: 0,
  starteris: 1,
  pro: 2,
  bizness: 3
};

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
      'Līdz 3 meistariem',
      'Līdz 15 pakalpojumiem',
      '10 galerijas bildes',
      '30 dienu kalendārs',
    ],
    icon: Mail,
    recommended: false,
    stripePrice: 'price_1SWmMTRtOhWJgeVeCxB9RCxm',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '24.99',
    emailCredits: 1000,
    description: 'Profesionāliem meistariem',
    features: [
      'Visi e-pasti',
      'SMS integrācija',
      'Līdz 10 meistariem',
      'Līdz 30 pakalpojumiem',
      '30 galerijas bildes',
      '90 dienu kalendārs',
    ],
    icon: Zap,
    recommended: true,
    stripePrice: 'price_1SWmMtRtOhWJgeVeiKK0m0YL',
  },
  {
    id: 'bizness',
    name: 'Bizness',
    price: '49.99',
    emailCredits: 5000,
    description: 'Biznesa risinājums',
    features: [
      'Visi e-pasti',
      'API piekļuve',
      'Neierobežoti meistari',
      'Neierobežoti pakalpojumi',
      'Neierobežotas bildes',
      'Neierobežots kalendārs',
    ],
    icon: Award,
    recommended: false,
    stripePrice: 'price_1SWmNCRtOhWJgeVekHZDvwzP',
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
  const [pendingTargetPlan, setPendingTargetPlan] = useState<string | null>(null);
  const [pendingStripePrice, setPendingStripePrice] = useState<string | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  // Real-time subscription to professional_profiles changes
  useEffect(() => {
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'professional_profiles',
        },
        (payload) => {
          console.log('Subscription changed:', payload);
          // Force immediate refresh
          loadCurrentPlan();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Detect return from Stripe and force immediate refresh
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionSuccess = urlParams.get('session_success');
    const subscriptionUpdated = urlParams.get('subscription_updated');
    
    if (sessionSuccess === 'true' || subscriptionUpdated === 'true') {
      console.log('Returned from Stripe, forcing refresh...');
      
      // Immediate refresh
      loadCurrentPlan();
      
      // Retry after 2 seconds to catch delayed webhook updates
      setTimeout(() => {
        loadCurrentPlan();
      }, 2000);
      
      // Final retry after 4 seconds
      setTimeout(() => {
        loadCurrentPlan();
      }, 4000);
      
      // Show success message
      toast({
        title: 'Abonements atjaunināts',
        description: 'Jūsu plāns tika veiksmīgi mainīts!',
      });
      
      // Clean up URL
      window.history.replaceState({}, '', '/abonesana');
    }
  }, []);

  const loadCurrentPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Force fresh fetch without cache
      const { data: profile } = await supabase
        .from('professional_profiles')
        .select('id, plan, subscription_status, subscription_end_date, stripe_subscription_id, is_cancelled')
        .eq('user_id', user.id)
        .single();

      console.log('Fetched fresh plan data:', profile);

      if (profile) {
        // Fix inconsistent state: if subscription is "active" but no Stripe ID, reset to inactive
        if (profile.subscription_status === 'active' && !profile.stripe_subscription_id) {
          console.log('Fixing inconsistent subscription state');
          await supabase
            .from('professional_profiles')
            .update({ 
              subscription_status: 'inactive',
              plan: 'free'
            })
            .eq('id', profile.id);
          
          setCurrentPlan('free');
          setHasActiveSubscription(false);
          
          toast({
            title: 'Abonements atjaunināts',
            description: 'Jūsu iepriekšējais abonements vairs nav aktīvs. Lūdzu izvēlieties jaunu plānu.',
            variant: 'default',
          });
        } else {
          setCurrentPlan(profile.plan || 'free');
          setHasActiveSubscription(profile.subscription_status === 'active');
          setSubscriptionEndDate(profile.subscription_end_date);
        }

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

      // Use cancel-subscription function to mark cancellation at period end
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Cancellation error:', error);
        toast({
          title: 'Kļūda',
          description: 'Neizdevās atcelt abonementu',
          variant: 'destructive',
        });
        setLoading(null);
        return;
      }

      toast({
        title: 'Abonements atcelts',
        description: `Jūsu abonements paliks aktīvs līdz: ${data.periodEnd ? new Date(data.periodEnd).toLocaleDateString('lv-LV') : 'perioda beigām'}. Pēc tam tas automātiski pāries uz Free plānu.`,
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
    
    // Check if this is a downgrade
    const currentLevel = PLAN_ORDER[currentPlan as keyof typeof PLAN_ORDER] || 0;
    const targetLevel = PLAN_ORDER[planId as keyof typeof PLAN_ORDER] || 0;
    const isDowngrade = targetLevel < currentLevel;
    
    console.log('Plan comparison:', { currentPlan, planId, currentLevel, targetLevel, isDowngrade });
    
    if (isDowngrade) {
      // Show downgrade warning popup
      setPendingTargetPlan(planId);
      setPendingStripePrice(stripePrice);
      setShowDowngradeDialog(true);
      setLoading(null);
      return;
    }
    
    // If upgrade or same level, proceed immediately
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

  const handleConfirmDowngrade = async () => {
    setShowDowngradeDialog(false);
    
    if (!pendingTargetPlan) return;
    
    // If downgrading to FREE, use the special edge function
    if (pendingTargetPlan === 'free') {
      await handleDowngradeToFree();
      setPendingTargetPlan(null);
      setPendingStripePrice(null);
      return;
    }
    
    // For downgrades to paid plans, proceed with Stripe checkout
    if (pendingStripePrice) {
      setLoading(pendingTargetPlan);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: 'Kļūda',
            description: 'Lūdzu piesakieties, lai turpinātu',
            variant: 'destructive',
          });
          setLoading(null);
          setPendingTargetPlan(null);
          setPendingStripePrice(null);
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
          setPendingTargetPlan(null);
          setPendingStripePrice(null);
          return;
        }

        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
          body: {
            priceId: pendingStripePrice,
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
          setPendingTargetPlan(null);
          setPendingStripePrice(null);
          return;
        }

        if (data?.url) {
          window.location.href = data.url;
        } else {
          setLoading(null);
          setPendingTargetPlan(null);
          setPendingStripePrice(null);
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: 'Kļūda',
          description: 'Radās neparedzēta kļūda',
          variant: 'destructive',
        });
        setLoading(null);
        setPendingTargetPlan(null);
        setPendingStripePrice(null);
      }
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
                <li className="flex items-center gap-2 opacity-50">
                  <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground line-through">Automātiskie e-pasti</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground line-through">Statistika</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground font-semibold">1 meistars</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground font-semibold">5 pakalpojumi</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground font-semibold">3 bildes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground font-semibold">7 dienu kalendārs</span>
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
                  onClick={() => handleSubscribe('free', '')}
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
                <CardFooter className="flex flex-col gap-2">
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
                  {currentPlan === plan.id && hasActiveSubscription && (
                    <Button
                      className="w-full"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/billing')}
                    >
                      Pārvaldīt
                    </Button>
                  )}
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
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              {pendingTargetPlan === 'free' ? 'Atcelt abonementu' : 'Apstiprināt plāna maiņu'}
            </AlertDialogTitle>
            {pendingTargetPlan === 'free' ? (
              <div className="space-y-4 pt-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="font-semibold text-foreground">
                    Jūsu pašreizējais abonements: {plans.find(p => p.id === currentPlan)?.name || currentPlan.toUpperCase()} plāns
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tas tiek automātiski atjaunots katru mēnesi, izmantojot saglabāto maksājumu karti.
                  </p>
                  <div className="flex flex-col gap-2 mt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📅 Nākamā atjaunošanās:</span>
                      <span className="font-medium text-foreground">
                        {subscriptionEndDate ? format(new Date(subscriptionEndDate), 'dd.MM.yyyy', { locale: lv }) : 'Nav pieejams'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">💳 Mēneša maksa:</span>
                      <span className="font-medium text-foreground">€{plans.find(p => p.id === currentPlan)?.price || '0'} / mēnesī</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🕒 Atlikušās dienas:</span>
                      <span className="font-medium text-foreground">
                        {subscriptionEndDate 
                          ? Math.max(0, Math.ceil((new Date(subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                          : 0
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                  <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    ❗ Pirms atcelt abonementu, ņemiet vērā:
                  </p>
                  <ul className="space-y-1.5 text-sm text-amber-800 dark:text-amber-200">
                    <li>• {plans.find(p => p.id === currentPlan)?.name || currentPlan.toUpperCase()} plāns paliks aktīvs līdz perioda beigām – līdz{' '}
                      <strong>
                        {subscriptionEndDate ? format(new Date(subscriptionEndDate), 'dd.MM.yyyy', { locale: lv }) : 'perioda beigām'}
                      </strong>
                    </li>
                    <li>• Līdz šim datumam jūs varēsiet turpināt izmantot visas PRO funkcijas</li>
                    <li>• Atcelšana neizraisīs tūlītēju piekļuves zaudēšanu</li>
                    <li>• Pēc perioda beigām jūsu konts automātiski tiks pārslēgts uz Free plānu</li>
                    <li>• Maksājumi vairs netiks iekasēti</li>
                  </ul>
                </div>

                <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                  <p className="font-semibold text-destructive mb-2">⚠️ Vai tiešām vēlaties atcelt abonementu?</p>
                  <p className="text-sm text-destructive/80 mb-2">Pēc atcelšanas:</p>
                  <ul className="text-sm text-destructive/80 space-y-1">
                    <li>• PRO plāns būs aktīvs tikai līdz:{' '}
                      <strong>
                        {subscriptionEndDate ? format(new Date(subscriptionEndDate), 'dd.MM.yyyy', { locale: lv }) : 'perioda beigām'}
                      </strong>
                    </li>
                    <li>• Atlikušās dienas:{' '}
                      <strong>
                        {subscriptionEndDate 
                          ? Math.max(0, Math.ceil((new Date(subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                          : 0
                        }
                      </strong>
                    </li>
                    <li>• Pēc termiņa beigām → <strong>Free plāns</strong></li>
                  </ul>
                </div>
              </div>
            ) : (
              <AlertDialogDescription className="space-y-3 text-left">
                <p className="font-medium text-foreground">
                  Pārejot uz {plans.find(p => p.id === pendingTargetPlan)?.name} plānu, jūs zaudēsiet:
                </p>
                <ul className="space-y-2 text-sm">
                  {pendingTargetPlan === 'starteris' && currentPlan === 'pro' && (
                    <>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span><strong>SMS integrāciju</strong> - automātiskie SMS paziņojumi</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span><strong>Meistaru limits</strong> - maksimums 3 meistari (bija 10)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span><strong>Pakalpojumu limits</strong> - maksimums 15 pakalpojumi (bija 30)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span><strong>Galerijas limits</strong> - maksimums 10 bildes (bija 30)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span><strong>Kalendāra pieejamība</strong> - 30 dienas (bija 90 dienas)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span><strong>E-pasta kredītus</strong> - 200 kredīti/mēnesī (bija 1000)</span>
                      </li>
                    </>
                  )}
                  {(pendingTargetPlan === 'starteris' || pendingTargetPlan === 'pro') && currentPlan === 'bizness' && (
                    <>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span><strong>API piekļuvi</strong> - iespēju integrēt citas sistēmas</span>
                      </li>
                      {pendingTargetPlan === 'starteris' && (
                        <>
                          <li className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span><strong>SMS integrāciju</strong> - automātiskie SMS paziņojumi</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span><strong>Meistaru limits</strong> - maksimums 3 meistari (bija neierobežoti)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span><strong>Pakalpojumu limits</strong> - maksimums 15 pakalpojumi (bija neierobežoti)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span><strong>E-pasta kredītus</strong> - 200 kredīti/mēnesī (bija 5000)</span>
                          </li>
                        </>
                      )}
                      {pendingTargetPlan === 'pro' && (
                        <>
                          <li className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span><strong>Meistaru limits</strong> - maksimums 10 meistari (bija neierobežoti)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span><strong>Pakalpojumu limits</strong> - maksimums 30 pakalpojumi (bija neierobežoti)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <span><strong>E-pasta kredītus</strong> - 1000 kredīti/mēnesī (bija 5000)</span>
                          </li>
                        </>
                      )}
                    </>
                  )}
                </ul>
                <p className="text-sm text-muted-foreground mt-4">
                  Vai tiešām vēlaties samazināt savu plānu? Daži ierobežojumi stāsies spēkā nekavējoties.
                </p>
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingTargetPlan(null);
              setPendingStripePrice(null);
            }}>Atgriezties</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDowngrade}
              className={pendingTargetPlan === 'free' ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {pendingTargetPlan === 'free' ? 'Atcelt abonementu' : `Jā, pāriet uz ${plans.find(p => p.id === pendingTargetPlan)?.name}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}