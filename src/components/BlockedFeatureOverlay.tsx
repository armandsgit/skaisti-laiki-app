import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BlockedFeatureOverlayProps {
  isBlocked: boolean;
  message?: string;
  children: React.ReactNode;
  blurContent?: boolean;
  showUpgradeButton?: boolean;
}

export const BlockedFeatureOverlay = ({ 
  isBlocked, 
  message = 'Uzlabojiet plānu, lai atbloķētu', 
  children,
  blurContent = true,
  showUpgradeButton = true
}: BlockedFeatureOverlayProps) => {
  const navigate = useNavigate();

  if (!isBlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className={blurContent ? 'blur-sm pointer-events-none select-none opacity-50' : 'pointer-events-none select-none opacity-40'}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-2xl border-2 border-border shadow-lg">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-center text-muted-foreground max-w-[200px]">
                  {message}
                </p>
                {showUpgradeButton && (
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/abonesana')}
                    className="gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Uzlabot plānu
                  </Button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Šī funkcija nav pieejama jūsu plānā</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default BlockedFeatureOverlay;