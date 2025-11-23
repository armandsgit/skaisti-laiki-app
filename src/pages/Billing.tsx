import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, CreditCard, Calendar, TrendingUp } from 'lucide-react';

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

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get professional profile
      const { data: profile } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

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
      free: 'bg-muted',
      starter: 'bg-primary',
      pro: 'bg-gradient-to-r from-primary to-accent',
      premium: 'bg-gradient-to-r from-amber-500 to-amber-600'
    };
    return colors[plan as keyof typeof colors] || 'bg-muted';
  };

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
                <Badge className={`${getPlanBadge(professionalData?.plan || 'free')} text-white mt-1`}>
                  {professionalData?.plan?.toUpperCase() || 'FREE'}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Statuss</p>
                <Badge variant={professionalData?.subscription_status === 'active' ? 'default' : 'secondary'}>
                  {professionalData?.subscription_status === 'active' ? 'Aktīvs' : 'Neaktīvs'}
                </Badge>
              </div>
            </div>

            {professionalData?.subscription_end_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Derīgs līdz: {new Date(professionalData.subscription_end_date).toLocaleDateString('lv-LV')}</span>
              </div>
            )}

            <Button onClick={() => navigate('/subscription-plans')} className="w-full">
              Mainīt plānu
            </Button>
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

            <Button onClick={() => navigate('/professional')} variant="outline" className="w-full">
              Iegādāties kredītus
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
