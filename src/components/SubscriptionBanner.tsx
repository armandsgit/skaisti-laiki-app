import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle, CreditCard, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPlanDisplayName } from '@/lib/subscription-utils';

type PlanMode = 'renewing' | 'active_until_period_end' | 'expired';

interface SubscriptionBannerProps {
  planMode: PlanMode;
  currentPlan: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  subscriptionWillRenew: boolean;
  daysRemaining: number;
  emailCredits: number;
}

export const SubscriptionBanner = ({
  planMode,
  currentPlan,
  subscriptionStatus,
  subscriptionEndDate,
  subscriptionWillRenew,
  daysRemaining,
  emailCredits,
}: SubscriptionBannerProps) => {
  const navigate = useNavigate();
  
  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nav noteikts';
    try {
      return new Date(dateStr).toLocaleDateString('lv-LV', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Nav pieejams';
    }
  };

  // Payment failed state (past_due)
  if (subscriptionStatus === 'past_due') {
    return (
      <Card className="mb-6 border-destructive bg-destructive/5 shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <AlertCircle className="w-5 h-5 text-destructive stroke-[2]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-destructive mb-1">
                  Maksājums neizdevās
                </h3>
                <p className="text-sm text-foreground/70 mb-2">
                  Jūsu pēdējais maksājums nav veiksmīgs. Lūdzu atjaunojiet maksājuma informāciju, lai saglabātu plānu: {getPlanDisplayName(currentPlan)}
                </p>
                <Badge variant="destructive" className="text-xs font-medium">
                  Ierobežotas funkcijas līdz maksājuma atrisināšanai
                </Badge>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => navigate('/billing')}
                className="gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Atjaunot maksājumu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/abonesana')}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Mainīt plānu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // RULE 2: Active until period end (canceled but still active)
  if (planMode === 'active_until_period_end') {
    const isNearExpiry = daysRemaining < 5;
    return (
      <Card className={`mb-6 border-amber-500/50 ${isNearExpiry ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'bg-card'} shadow-card`}>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${isNearExpiry ? 'bg-amber-500' : 'bg-amber-500/20'}`}>
                <AlertCircle className={`w-5 h-5 ${isNearExpiry ? 'text-white' : 'text-amber-600'} stroke-[2]`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Jūsu abonements: {getPlanDisplayName(currentPlan)}
                </h3>
                <p className="text-sm text-foreground/70 mb-2">
                  Abonements beigsies: {formatDate(subscriptionEndDate)}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-2">
                  Pēc termiņa beigām jūsu konts automātiski tiks pārslegts uz Free plānu
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={isNearExpiry ? "destructive" : "secondary"} className="text-xs font-medium">
                    Atlikušās dienas: {daysRemaining}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-medium">
                    E-pasta kredīti: {emailCredits}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/abonesana')}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Atjaunot abonementu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/billing')}
                className="gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Rēķini
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // RULE 1: Renewing subscription (active and will auto-renew)
  if (planMode === 'renewing') {
    return (
      <Card className="mb-6 border-border/50 bg-card shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-foreground">
                <Sparkles className="w-5 h-5 text-background stroke-[2]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Jūsu abonements: {getPlanDisplayName(currentPlan)} plāns
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  📅 Nākamais maksājums: {formatDate(subscriptionEndDate)}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                  🔄 Automātiski atjaunojas katru mēnesi
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs font-medium">
                    Atlikušās dienas: {daysRemaining}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-medium">
                    E-pasta kredīti: {emailCredits}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/abonesana')}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Mainīt plānu
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/billing')}
                className="gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Rēķini & maksājumi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // RULE 3: Expired or no subscription (free plan)
  return (
    <Card className="mb-6 border-border/50 bg-card shadow-card">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-muted">
              <AlertCircle className="w-5 h-5 text-muted-foreground stroke-[2]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Jūsu abonements: Bezmaksas
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Nākamā maksa: Nav
              </p>
              <Badge variant="secondary" className="text-xs font-medium">
                E-pasta kredīti: {emailCredits}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/abonesana')}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Izvēlēties plānu
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/billing')}
              className="gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Rēķini & maksājumi
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
