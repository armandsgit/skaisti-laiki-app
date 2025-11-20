import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SubscriptionStatusIndicatorProps {
  plan: string;
  status: string;
}

export default function SubscriptionStatusIndicator({ plan, status }: SubscriptionStatusIndicatorProps) {
  const isActive = status === 'active';
  const planName = plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Pro' : plan === 'premium' ? 'Premium' : 'Nav izvēlēts';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${
              isActive ? 'bg-green-500' : 'bg-red-500'
            } animate-pulse`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Abonements: {planName} – {isActive ? 'Aktīvs' : 'Neaktīvs'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
