import { Badge } from '@/components/ui/badge';
import { Crown, Star, Sparkles } from 'lucide-react';

interface PlanBadgeProps {
  plan: string;
  isVerified?: boolean;
  className?: string;
}

export default function PlanBadge({ plan, isVerified, className = '' }: PlanBadgeProps) {
  if (plan === 'premium') {
    return (
      <Badge className={`bg-warning text-white ${className}`}>
        <Crown className="w-3 h-3 mr-1" />
        Premium
      </Badge>
    );
  }
  
  if (plan === 'pro') {
    return (
      <Badge className={`bg-primary text-primary-foreground ${className}`}>
        <Star className="w-3 h-3 mr-1" />
        Pro
      </Badge>
    );
  }

  if (isVerified) {
    return (
      <Badge variant="default" className={className}>
        <Sparkles className="w-3 h-3 mr-1" />
        Verificēts
      </Badge>
    );
  }
  
  return null;
}
