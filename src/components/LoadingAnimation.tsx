interface LoadingAnimationProps {
  size?: number;
  text?: string;
}

export default function LoadingAnimation({ size = 80, text }: LoadingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
      {text && (
        <p className="text-muted-foreground text-sm">{text}</p>
      )}
    </div>
  );
}
