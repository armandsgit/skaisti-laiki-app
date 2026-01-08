import { Heart } from 'lucide-react';
import { useState } from 'react';
import { triggerHaptic } from '@/lib/haptic';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => Promise<boolean>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FavoriteButton = ({ 
  isFavorite, 
  onToggle, 
  size = 'md',
  className 
}: FavoriteButtonProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 26
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    triggerHaptic('light');
    setIsLoading(true);
    setIsAnimating(true);
    
    await onToggle();
    
    setIsLoading(false);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'flex items-center justify-center transition-all duration-200',
        'hover:scale-110 active:scale-90',
        isAnimating && 'animate-[pulse_0.3s_ease-in-out]',
        className
      )}
      aria-label={isFavorite ? 'Noņemt no iecienītākajiem' : 'Pievienot iecienītākajiem'}
    >
      <Heart
        size={iconSizes[size]}
        className={cn(
          'transition-all duration-200 drop-shadow-md',
          isFavorite 
            ? 'fill-red-500 text-red-500' 
            : 'fill-white/80 text-white stroke-[2.5]'
        )}
      />
    </button>
  );
};

export default FavoriteButton;
