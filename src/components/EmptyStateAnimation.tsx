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
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <rect x="20" y="30" width="60" height="40" rx="4" fill="currentColor" className="text-muted-foreground" />
            <rect x="30" y="40" width="15" height="20" rx="2" fill="currentColor" className="text-background animate-pulse" style={{ animationDelay: '0s' }} />
            <rect x="50" y="40" width="15" height="20" rx="2" fill="currentColor" className="text-background animate-pulse" style={{ animationDelay: '0.2s' }} />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-muted-foreground font-medium text-base">{title}</p>
        {description && (
          <p className="text-muted-foreground/70 text-sm mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
