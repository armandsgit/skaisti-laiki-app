import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, CreditCard, Calendar, TrendingUp } from 'lucide-react';
import { daysLeft, formatSubscriptionDate, getPlanDisplayName } from '@/lib/subscription-utils';

export default function Billing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [professionalData, setProfessionalData] = useState<any>(null);
  const [emailCredits, setEmailCredits] = useState(0);
  const [emailUsage, setEmailUsage] = useState<any[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);

  useEffect(() => {
    loadBillingData();
  }, []);

  // Real-time subscription to professional_profiles changes
  useEffect(() => {
    const channel = supabase
      .channel('billing-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'professional_profiles',
        },
        (payload) => {
          console.log('Billing data changed:', payload);
          // Force immediate refresh
          loadBillingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get professional profile - force fresh fetch
      const { data: profile } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Fetched fresh billing data:', profile);

      if (profile) {
        setProfessionalData(profile);

        // Get email credits
        const { data: credits } = await supabase
          .from('email_credits')
          .select('credits')
          .eq('master_id', profile.id)
          .single();

        setEmailCredits(credits?.credits || 0);

        // Get email usage (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: usage } = await supabase
          .from('email_logs')
          .select('*')
          .eq('professional_id', profile.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        setEmailUsage(usage || []);

        // Get subscription history
        const { data: history } = await supabase
          .from('subscription_history')
          .select('*')
          .eq('professional_id', profile.id)
          .order('started_at', { ascending: false })
          .limit(5);

        setSubscriptionHistory(history || []);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast({
        title: 'Kļūda',
        description: 'Neizdevās ielādēt norēķinu datus',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const getPlanBadge = (plan: string) => {
    const colors = {
      free: 'bg-muted text-muted-foreground',
      starteris: 'bg-primary text-primary-foreground',
      pro: 'bg-gradient-to-r from-primary to-accent text-white',
      bizness: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
    };
    return colors[plan as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const getStatusBadge = (status: string, isCancelled: boolean) => {
    if (status === 'active' && !isCancelled) {
      return <Badge variant="default" className="bg-green-500 text-white">Aktīvs</Badge>;
    }
    if (status === 'active' && isCancelled) {
      return <Badge variant="secondary" className="bg-amber-500 text-white">Atcelts (līdz perioda beigām)</Badge>;
    }
    if (status === 'past_due') {
      return <Badge variant="destructive">Maksājums neizdevās</Badge>;
    }
    if (status === 'inactive' || !status) {
      return <Badge variant="secondary">Neaktīvs</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const remainingDays = daysLeft(professionalData?.subscription_end_date);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Norēķini un abonements</h1>
          <p className="text-muted-foreground">Pārvaldi savu abonementu un e-pasta kredītus</p>
        </div>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Abonements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pašreizējais plāns</p>
                <Badge className={`${getPlanBadge(professionalData?.plan || 'free')} mt-1`}>
                  {getPlanDisplayName(professionalData?.plan)}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Statuss</p>
                <div className="mt-1">
                  {getStatusBadge(professionalData?.subscription_status, professionalData?.is_cancelled)}
                </div>
              </div>
            </div>

            {professionalData?.subscription_end_date && professionalData?.subscription_status !== 'inactive' && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">📅 Derīgs līdz:</span>
                  <span className="font-medium">{formatSubscriptionDate(professionalData.subscription_end_date)}</span>
                </div>
                {remainingDays > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">🕒 Atlikušās dienas:</span>
                    <Badge variant="secondary">{remainingDays}</Badge>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Button onClick={() => navigate('/abonesana')} className="w-full">
                Mainīt abonēšanas plānu
              </Button>
              
              <Button 
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('create-portal-session');
                    if (error) throw error;
                    if (data?.url) window.location.href = data.url;
                  } catch (error) {
                    console.error('Portal error:', error);
                    toast({
                      title: 'Kļūda',
                      description: 'Neizdevās atvērt klienta portālu',
                      variant: 'destructive'
                    });
                  }
                }}
                variant="outline" 
                className="w-full"
              >
                Pārvaldīt rēķinus
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              E-pasta kredīti
            </CardTitle>
            <CardDescription>
              Izmanto kredītus, lai nosūtītu rezervāciju apstiprinājumus un atgādinājumus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Pieejamie kredīti</span>
                <span className="text-2xl font-bold">{emailCredits}</span>
              </div>
              <Progress value={Math.min((emailCredits / 100) * 100, 100)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Nosūtīti (30 dienas)</p>
                  <p className="text-2xl font-bold">{emailUsage.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Šodien</p>
                  <p className="text-2xl font-bold">
                    {emailUsage.filter(e => 
                      new Date(e.created_at).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Šomēnes</p>
                  <p className="text-2xl font-bold">
                    {emailUsage.filter(e => {
                      const emailDate = new Date(e.created_at);
                      const now = new Date();
                      return emailDate.getMonth() === now.getMonth() && 
                             emailDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={async () => {
                // Open modal to select email credit package
                toast({
                  title: 'Drīzumā',
                  description: 'E-pasta kredītu pirkšana būs pieejama drīzumā',
                });
              }}
              className="w-full"
            >
              Pirkt papildus kredītus
            </Button>
          </CardContent>
        </Card>

        {/* Subscription History */}
        {subscriptionHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Abonementa vēsture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptionHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.plan.toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.started_at).toLocaleDateString('lv-LV')}
                        {item.ended_at && ` - ${new Date(item.ended_at).toLocaleDateString('lv-LV')}`}
                      </p>
                    </div>
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
