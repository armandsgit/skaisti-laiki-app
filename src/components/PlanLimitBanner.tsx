import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PlanLimitBannerProps {
  currentCount: number;
  limit: number;
  itemName: string;
  upgradeMessage?: string;
}

export const PlanLimitBanner = ({ currentCount, limit, itemName, upgradeMessage }: PlanLimitBannerProps) => {
  const navigate = useNavigate();
  const isUnlimited = limit === -1 || limit === 999;
  const isAtLimit = !isUnlimited && currentCount >= limit;
  const isNearLimit = !isUnlimited && currentCount >= limit * 0.8;

  if (isUnlimited || (!isAtLimit && !isNearLimit)) {
    return null;
  }

  return (
    <div className={`mb-4 p-4 rounded-xl border-2 ${
      isAtLimit 
        ? 'bg-red-50 border-red-200' 
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
          isAtLimit ? 'text-red-600' : 'text-amber-600'
        }`} />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${
            isAtLimit ? 'text-red-900' : 'text-amber-900'
          }`}>
            {isAtLimit ? `Limits sasniegts: ${currentCount}/${limit} ${itemName}` : `Tuvu limitam: ${currentCount}/${limit} ${itemName}`}
          </p>
          <p className={`text-xs mt-1 ${
            isAtLimit ? 'text-red-700' : 'text-amber-700'
          }`}>
            {upgradeMessage || 'Uzlabojiet savu plānu, lai pievienotu vairāk'}
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={() => navigate('/abonesana')}
          className="gap-2 flex-shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Uzlabot
        </Button>
      </div>
    </div>
  );
};

export default PlanLimitBanner;