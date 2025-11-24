import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle, CreditCard, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { lv } from 'date-fns/locale';

interface SubscriptionBannerProps {
  subscriptionStatus: string | null;
  plan: string | null;
  subscriptionEndDate: string | null;
  emailCredits: number;
}

export const SubscriptionBanner = ({
  subscriptionStatus,
  plan,
  subscriptionEndDate,
  emailCredits,
}: SubscriptionBannerProps) => {
  const navigate = useNavigate();
  const hasActiveSubscription = subscriptionStatus === 'active';

  const getPlanDisplayName = (planCode: string | null) => {
    if (!planCode) return 'Nav plāna';
    const planMap: { [key: string]: string } = {
      starteris: 'Starteris',
      pro: 'Pro',
      bizness: 'Bizness',
      free: 'Bezmaksas'
    };
    return planMap[planCode.toLowerCase()] || planCode.toUpperCase();
  };

  const formatNextBillingDate = (endDate: string | null) => {
    if (!endDate) return 'Nav noteikts';
    try {
      return format(new Date(endDate), 'dd.MM.yyyy', { locale: lv });
    } catch {
      return 'Nav pieejams';
    }
  };

  if (hasActiveSubscription) {
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
                  Jūsu plāns: {getPlanDisplayName(plan)}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Aktīvs. Nākamā maksa: {formatNextBillingDate(subscriptionEndDate)}
                </p>
                <Badge variant="secondary" className="text-xs font-medium">
                  Atlikušais e-pasta apjoms: {emailCredits} kredīti
                </Badge>
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
                Jūsu plāns: {getPlanDisplayName(plan)}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {plan === 'free' 
                  ? 'Bezmaksas plāns. Nākamā maksa: Nav' 
                  : 'Nav aktīva plāna. Izvēlieties plānu, lai turpinātu'}
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
              {plan === 'free' ? 'Uzlabot plānu' : 'Izvēlēties plānu'}
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
