import { Badge } from '@/components/ui/badge';
import { Crown, Star, Sparkles } from 'lucide-react';

interface PlanBadgeProps {
  plan: string;
  isVerified?: boolean;
  className?: string;
}

export default function PlanBadge({ plan, isVerified, className = '' }: PlanBadgeProps) {
  if (plan === 'bizness') {
    return (
      <Badge className={`bg-gradient-to-r from-amber-500 to-amber-600 text-white ${className}`}>
        <Crown className="w-3 h-3 mr-1" />
        Bizness
      </Badge>
    );
  }
  
  if (plan === 'pro') {
    return (
      <Badge className={`bg-gradient-to-r from-primary to-accent text-primary-foreground ${className}`}>
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
