import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  gradient?: string;
}

export const QuickActionButton = ({
  icon: Icon,
  label,
  onClick,
  gradient = 'from-primary to-secondary',
}: QuickActionButtonProps) => {
  return (
    <motion.div whileTap={{ scale: 0.95 }}>
      <Button
        onClick={onClick}
        className={`w-full h-auto p-4 bg-gradient-to-br ${gradient} text-white shadow-card border-0 tap-feedback`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="p-2 rounded-full bg-white/20">
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
      </Button>
    </motion.div>
  );
};
