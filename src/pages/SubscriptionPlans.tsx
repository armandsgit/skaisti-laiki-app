import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertTriangle } from 'lucide-react';
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

const plans = [
  {
    id: 'free',
    name: 'Bezmaksas',
    price: '0',
    tier: 1,
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
    tier: 2,
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
    tier: 3,
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
    tier: 4,
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

// Plan hierarchy for comparison
const planHierarchy = {
  'free': 1,
  'starteris': 2,
  'pro': 3,
  'bizness': 4
};

// Plan features and limits
const PLAN_LIMITS = {
  free: {
    services: 1,
    masters: 1,
    gallery: 3,
    calendar_days: 7,
    email_credits: 0,
    email_automation: false,
    statistics: false,
    sms: false,
    api: false
  },
  starteris: {
    services: 5,
    masters: 3,
    gallery: 5,
    calendar_days: 30,
    email_credits: 200,
    email_automation: true,
    statistics: false,
    sms: false,
    api: false
  },
  pro: {
    services: 15,
    masters: 10,
    gallery: 10,
    calendar_days: 90,
    email_credits: 1000,
    email_automation: true,
    statistics: true,
    sms: true,
    api: false
  },
  bizness: {
    services: 999,
    masters: 999,
    gallery: 30,
    calendar_days: 365,
    email_credits: 5000,
    email_automation: true,
    statistics: true,
    sms: true,
    api: true
  }
};

// Generate dynamic downgrade warnings
const getDowngradeWarnings = (fromPlan: string, toPlan: string) => {
  const from = PLAN_LIMITS[fromPlan as keyof typeof PLAN_LIMITS];
  const to = PLAN_LIMITS[toPlan as keyof typeof PLAN_LIMITS];
  
  if (!from || !to) return { features: [], credits: '' };
  
  const warnings: string[] = [];
  
  // Email automation
  if (from.email_automation && !to.email_automation) {
    warnings.push('E-pasta automātiku - automātiskie rezervāciju apstiprināšumi un atgādinājumi');
  }
  
  // Statistics
  if (from.statistics && !to.statistics) {
    warnings.push('Statistiku - detalizēta analītika par rezervācijām un ieņēmumiem');
  }
  
  // SMS
  if (from.sms && !to.sms) {
    warnings.push('SMS integrāciju - automātiskie SMS paziņojumi');
  }
  
  // API
  if (from.api && !to.api) {
    warnings.push('API piekļuvi - iespēju integrēt citas sistēmas');
  }
  
  // Services limit
  if (from.services > to.services) {
    warnings.push(`Pakalpojumu limitu - maksimums ${to.services} pakalpojumi (bija ${from.services === 999 ? 'neierobežoti' : from.services})`);
  }
  
  // Gallery limit
  if (from.gallery > to.gallery) {
    warnings.push(`Galerijas limitu - maksimums ${to.gallery} bildes (bija ${from.gallery})`);
  }
  
  // Calendar days
  if (from.calendar_days > to.calendar_days) {
    warnings.push(`Kalendāra pieejamību - tikai ${to.calendar_days} dienas (bija ${from.calendar_days}+ dienas)`);
  }
  
  // Masters limit
  if (from.masters > to.masters) {
    warnings.push(`Meistaru limitu - maksimums ${to.masters} ${to.masters === 1 ? 'meistars' : 'meistari'} (bija ${from.masters === 999 ? 'neierobežoti' : from.masters})`);
  }
  
  // Email credits
  const creditsText = `pašreizējie ${from.email_credits} kredīti tiks atiestatīti uz ${to.email_credits}`;
  
  return { features: warnings, credits: creditsText };
};

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);
  const [targetPlan, setTargetPlan] = useState<string | null>(null);

  // Fetch current user's plan
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      setLoadingPlan(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('🔍 Fetching plan for user:', user?.id);
        if (!user) {
          console.log('❌ No user logged in');
          setLoadingPlan(false);
          return;
        }

        const { data: profile } = await supabase
          .from('professional_profiles')
          .select('plan')
          .eq('user_id', user.id)
          .single();

        console.log('📊 Current plan from DB:', profile?.plan);
        
        if (profile?.plan) {
          console.log('✅ Setting current plan to:', profile.plan);
          setCurrentPlan(profile.plan);
        } else {
          console.log('⚠️ No plan found, defaulting to free');
          setCurrentPlan('free');
        }
      } catch (error) {
        console.error('❌ Error fetching current plan:', error);
        setCurrentPlan('free');
      } finally {
        setLoadingPlan(false);
        console.log('✅ Plan loading complete');
      }
    };

    fetchCurrentPlan();
  }, []);

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

  const isDowngrade = (fromPlan: string | null, toPlan: string) => {
    if (!fromPlan) return false;
    const fromPlanObj = plans.find(p => p.id === fromPlan);
    const toPlanObj = plans.find(p => p.id === toPlan);
    if (!fromPlanObj || !toPlanObj) return false;
    const result = fromPlanObj.tier > toPlanObj.tier;
    console.log('🔽 Downgrade check:', { fromPlan, toPlan, fromTier: fromPlanObj.tier, toTier: toPlanObj.tier, isDowngrade: result });
    return result;
  };

  const isUpgrade = (fromPlan: string | null, toPlan: string) => {
    if (!fromPlan) return false;
    const fromPlanObj = plans.find(p => p.id === fromPlan);
    const toPlanObj = plans.find(p => p.id === toPlan);
    if (!fromPlanObj || !toPlanObj) return false;
    const result = toPlanObj.tier > fromPlanObj.tier;
    console.log('🔼 Upgrade check:', { fromPlan, toPlan, fromTier: fromPlanObj.tier, toTier: toPlanObj.tier, isUpgrade: result });
    return result;
  };

  const handlePlanClick = (planId: string) => {
    console.log('=== PLAN CLICK DEBUG ===');
    console.log('Plan clicked:', planId);
    console.log('Current plan:', currentPlan);
    console.log('Loading plan:', loadingPlan);
    
    // Don't proceed if plan is still loading
    if (loadingPlan || !currentPlan) {
      console.log('❌ Plan still loading or not set, blocking action');
      toast({
        title: 'Lūdzu uzgaidi',
        description: 'Ielādē pašreizējo plānu...',
        variant: 'default',
      });
      return;
    }
    
    // If it's an upgrade, proceed immediately without warning
    if (isUpgrade(currentPlan, planId)) {
      console.log('✅ Upgrade detected, proceeding without warning');
      proceedWithStripeCheckout(planId);
      return;
    }
    
    // If it's a downgrade, show warning
    if (isDowngrade(currentPlan, planId)) {
      console.log('⚠️ Downgrade detected, showing warning');
      setTargetPlan(planId);
      setShowDowngradeWarning(true);
      return;
    }
    
    // If same plan, do nothing
    console.log('Same plan, no action');
  };

  const handleActivate = (planId: string) => {
    handlePlanClick(planId);
  };

  const handleConfirmDowngrade = () => {
    if (targetPlan) {
      setShowDowngradeWarning(false);
      const planToActivate = targetPlan;
      setTargetPlan(null);
      
      // Now actually proceed with the activation
      setLoading(planToActivate);
      proceedWithStripeCheckout(planToActivate);
    }
  };

  const proceedWithStripeCheckout = async (planId: string) => {
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
        .select('id, stripe_subscription_id')
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

      // SPECIAL HANDLING FOR FREE PLAN DOWNGRADE
      if (planId === 'free') {
        console.log('🔄 Downgrading to FREE plan - calling cancel-subscription...');
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: 'Kļūda',
            description: 'Nav autentificēts',
            variant: 'destructive',
          });
          return;
        }

        const { data, error } = await supabase.functions.invoke('cancel-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        console.log('📦 Cancel subscription response:', { data, error });

        if (error) {
          console.error('❌ Cancel subscription error:', error);
          toast({
            title: 'Kļūda',
            description: 'Neizdevās atcelt abonementu',
            variant: 'destructive',
          });
          return;
        }

        if (data?.success) {
          console.log('✅ Subscription cancelled successfully');
          toast({
            title: 'Veiksmīgi!',
            description: data.message || 'Abonements tiks atcelts perioda beigās',
          });
          
          // Refresh current plan
          const { data: updatedProfile } = await supabase
            .from('professional_profiles')
            .select('plan')
            .eq('user_id', user.id)
            .single();
          
          if (updatedProfile?.plan) {
            setCurrentPlan(updatedProfile.plan);
          }
          
          // Redirect to professional dashboard after a short delay
          setTimeout(() => {
            navigate('/professional');
          }, 1500);
        }
        
        return;
      }

      // PAID PLAN HANDLING - Go through Stripe Checkout
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

      // Redirect to Stripe Checkout
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
                    disabled={loadingPlan || currentPlan === 'free'}
                    onClick={() => handleActivate(plan.id)}
                  >
                    {loadingPlan ? 'Ielādē...' : currentPlan === 'free' ? 'Pašreizējais plāns' : 'Pāriet uz FREE'}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.recommended ? 'default' : 'outline'}
                    onClick={() => handleActivate(plan.id)}
                    disabled={loadingPlan || loading !== null || currentPlan === plan.id}
                  >
                    {loadingPlan ? 'Ielādē...' : loading === plan.id ? 'Aktivizē...' : currentPlan === plan.id ? 'Pašreizējais plāns' : 'Aktivizēt'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Downgrade Warning Modal */}
        <AlertDialog open={showDowngradeWarning} onOpenChange={setShowDowngradeWarning}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <AlertDialogTitle className="text-xl font-semibold">
                  Pāriet uz {plans.find(p => p.id === targetPlan)?.name} plānu?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-left space-y-4 pt-4">
                <p className="font-medium text-base text-foreground">
                  Pārejot uz {plans.find(p => p.id === targetPlan)?.name} plānu, jūs zaudēsiet:
                </p>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {targetPlan && currentPlan && getDowngradeWarnings(currentPlan, targetPlan).features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 flex-shrink-0 mt-0.5">
                        <X className="h-3.5 w-3.5 text-red-600" />
                      </div>
                      <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">
                    Vai tiešām vēlaties turpināt?
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Jūsu dati netiks dzēsti, bet funkcionalitāte būs ierobežota līdz plāna atjaunošanai.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel className="mt-0">Atcelt</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDowngrade}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Jā, pāriet uz {plans.find(p => p.id === targetPlan)?.name}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
