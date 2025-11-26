import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle, CreditCard, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { daysLeft, formatSubscriptionDate, getPlanDisplayName, isActiveCancelled, isPastDue, isFullyActive } from '@/lib/subscription-utils';

interface SubscriptionBannerProps {
  subscriptionStatus: string | null;
  plan: string | null;
  subscriptionEndDate: string | null;
  emailCredits: number;
  isCancelled?: boolean;
}

export const SubscriptionBanner = ({
  subscriptionStatus,
  plan,
  subscriptionEndDate,
  emailCredits,
  isCancelled = false,
}: SubscriptionBannerProps) => {
  const navigate = useNavigate();
  
  // Calculate remaining days
  const remainingDays = daysLeft(subscriptionEndDate);
  
  // Determine subscription state
  const pastDue = isPastDue(subscriptionStatus);
  const cancelledButActive = isActiveCancelled(subscriptionStatus, isCancelled);
  const fullyActive = isFullyActive(subscriptionStatus, isCancelled);
  const hasNoPlan = plan === 'free' || !subscriptionStatus || subscriptionStatus === 'inactive';

  // Show warning banner for past_due status (payment failed)
  if (pastDue) {
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
                  Jūsu pēdējais maksājums nav veiksmīgs. Lūdzu atjaunojiet maksājuma informāciju, lai saglabātu plānu: {getPlanDisplayName(plan)}
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

  // Show cancelled banner (subscription cancelled but active until period end)
  if (cancelledButActive) {
    const isNearExpiry = remainingDays < 5;
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
                  Jūsu abonements: {getPlanDisplayName(plan)}
                </h3>
                <p className="text-sm text-foreground/70 mb-2">
                  Abonements beigsies: {formatSubscriptionDate(subscriptionEndDate)}
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  {getPlanDisplayName(plan)} plāna funkcijas pieejamas līdz {formatSubscriptionDate(subscriptionEndDate)}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-2">
                  Pēc termiņa beigām jūsu konts automātiski tiks pārslegts uz Free plānu
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={isNearExpiry ? "destructive" : "secondary"} className="text-xs font-medium">
                    Atlikušās dienas: {remainingDays}
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

  // Show active subscription banner
  if (fullyActive) {
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
                  Jūsu abonements: {getPlanDisplayName(plan)} plāns
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  📅 Nākamais maksājums: {formatSubscriptionDate(subscriptionEndDate)}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                  ❗ Automātiski atjaunojas katru mēnesi
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs font-medium">
                    Atlikušās dienas: {remainingDays}
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

  // Show free/no plan banner
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
                Jūsu abonements: {getPlanDisplayName(plan)}
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
              {plan === 'free' ? 'Atjaunot abonementu' : 'Izvēlēties plānu'}
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
