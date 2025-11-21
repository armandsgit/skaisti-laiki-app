import Lottie from 'lottie-react';
import loadingAnimation from '@/assets/animations/loading.json';

interface LoadingAnimationProps {
  size?: number;
  text?: string;
}

export default function LoadingAnimation({ size = 80, text }: LoadingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Lottie 
        animationData={loadingAnimation} 
        loop={true}
        style={{ width: size, height: size }}
      />
      {text && (
        <p className="text-muted-foreground text-sm">{text}</p>
      )}
    </div>
  );
}
