import { Card } from '@/components/ui/card';
import { Star, User, Euro } from 'lucide-react';
import { type SortedMaster } from '@/lib/master-sorting';

interface ProfessionalCardProps {
  professional: SortedMaster;
  onClick: () => void;
  availableToday?: boolean;
  hasAvailability?: boolean;
  isNew?: boolean;
}

const ProfessionalCard = ({
  professional: prof,
  onClick,
  availableToday,
  hasAvailability,
  isNew,
}: ProfessionalCardProps) => {
  return (
    <Card 
      onClick={onClick} 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-[0.98] border-0 overflow-hidden bg-white rounded-[24px] shadow-sm"
    >
      {/* Image */}
      <div className="relative w-full h-[200px] bg-muted overflow-hidden">
        {/* Availability indicator - show if the salon has any active schedule */}
        {hasAvailability && (
          <div className="absolute top-3 left-3 z-10">
            <div className="relative flex items-center gap-2">
              {/* Dot (pulsing only when available today) */}
              <span className="relative flex h-3 w-3">
                {availableToday && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-sm"></span>
              </span>

              {/* Label only for "today" to keep it clean */}
              {availableToday && (
                <span className="px-2.5 py-1 text-[11px] font-semibold bg-white/95 backdrop-blur-sm text-emerald-700 rounded-full shadow-sm">
                  Pieejams
                </span>
              )}
            </div>
          </div>
        )}

        {/* New Badge */}
        {isNew && !hasAvailability && (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-3 py-1 text-xs font-medium bg-emerald-500 text-white rounded-full shadow-lg">
              Jauns
            </span>
          </div>
        )}

        {/* Category Badge - right side */}
        <div className="absolute top-3 right-3 z-10">
          <span className="px-3 py-1 text-xs font-medium bg-black/80 backdrop-blur-sm text-white rounded-full shadow-lg">
            {prof.category}
          </span>
        </div>

        {(prof as any).gallery && (prof as any).gallery.length > 0 ? (
          <img 
            src={(prof as any).gallery[0]} 
            alt={prof.profiles?.name || ''} 
            className="w-full h-full object-cover" 
          />
        ) : prof.profiles?.avatar ? (
          <img 
            src={prof.profiles.avatar} 
            alt={prof.profiles.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <User className="h-16 w-16 text-muted-foreground stroke-[1.5]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        <h3 className="font-bold text-[20px] text-foreground truncate">
          {prof.profiles?.name}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <Star className="h-[18px] w-[18px] fill-foreground stroke-foreground" />
          <span className="text-[16px] font-semibold text-foreground">
            {prof.rating ? prof.rating.toFixed(1) : '0.0'}
          </span>
          <span className="text-[15px] text-muted-foreground">
            ({prof.total_reviews || 0})
          </span>
        </div>

        {/* Price Range */}
        {(prof as any).priceRange && (
          <div className="flex items-center gap-1.5">
            <Euro className="h-[14px] w-[14px] text-muted-foreground" />
            <span className="text-[14px] font-medium text-foreground">
              {(prof as any).priceRange.min === (prof as any).priceRange.max 
                ? `${(prof as any).priceRange.min}€`
                : `${(prof as any).priceRange.min}€ - ${(prof as any).priceRange.max}€`
              }
            </span>
          </div>
        )}

        {/* Location with Distance */}
        <div className="pt-0.5">
          <span className="text-[13px] text-muted-foreground leading-tight block">
            {prof.address || prof.city || 'Lokācija nav norādīta'} • {prof.distance ? prof.distance.toFixed(1) : '0.0'} km
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ProfessionalCard;
