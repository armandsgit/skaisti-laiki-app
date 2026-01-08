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

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
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
        'flex items-center justify-center rounded-full transition-all duration-200',
        'bg-white/90 backdrop-blur-sm shadow-md border border-gray-100',
        'hover:scale-110 active:scale-95',
        sizeClasses[size],
        isAnimating && 'animate-[pulse_0.3s_ease-in-out]',
        className
      )}
      aria-label={isFavorite ? 'Noņemt no iecienītākajiem' : 'Pievienot iecienītākajiem'}
    >
      <Heart
        size={iconSizes[size]}
        className={cn(
          'transition-all duration-200',
          isFavorite 
            ? 'fill-red-500 text-red-500' 
            : 'fill-transparent text-gray-400 hover:text-red-400'
        )}
      />
    </button>
  );
};

export default FavoriteButton;
