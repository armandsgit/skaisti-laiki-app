import Lottie from 'lottie-react';
import emptyStateAnimation from '@/assets/animations/empty-state.json';

interface EmptyStateAnimationProps {
  size?: number;
  title?: string;
  description?: string;
}

export default function EmptyStateAnimation({ 
  size = 120, 
  title = "Šeit pagaidām nav datu",
  description 
}: EmptyStateAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Lottie 
        animationData={emptyStateAnimation} 
        loop={true}
        style={{ width: size, height: size }}
      />
      <div className="text-center">
        <p className="text-muted-foreground font-medium text-base">{title}</p>
        {description && (
          <p className="text-muted-foreground/70 text-sm mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
