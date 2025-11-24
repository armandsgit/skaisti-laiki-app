import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'secondary';
  badge?: number;
}

export const QuickActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  badge,
}: QuickActionButtonProps) => {
  return (
    <motion.div whileTap={{ scale: 0.96 }} className="relative">
      <Button
        onClick={onClick}
        variant={variant === 'default' ? 'default' : 'outline'}
        className="w-full h-auto p-5 shadow-soft"
      >
        <div className="flex flex-col items-center gap-2">
          <Icon className="w-5 h-5 stroke-[1.5]" />
          <span className="text-[13px] font-medium leading-tight text-center">{label}</span>
        </div>
      </Button>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
          {badge}
        </span>
      )}
    </motion.div>
  );
};
