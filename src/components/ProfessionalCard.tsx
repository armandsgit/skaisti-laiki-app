import { Card } from '@/components/ui/card';
import { Star, User, Clock } from 'lucide-react';
import { type SortedMaster } from '@/lib/master-sorting';

interface ProfessionalCardProps {
  professional: SortedMaster;
  onClick: () => void;
  availableToday?: boolean;
  isNew?: boolean;
}

const ProfessionalCard = ({ professional: prof, onClick, availableToday, isNew }: ProfessionalCardProps) => {
  return (
    <Card 
      onClick={onClick} 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-[0.98] border-0 overflow-hidden bg-white rounded-[24px] shadow-sm"
    >
      {/* Image */}
      <div className="relative w-full h-[200px] bg-muted overflow-hidden">
        {/* Category Badge with availability indicator */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {/* Availability dot - always visible with white border */}
          <div 
            className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${
              availableToday 
                ? 'bg-emerald-500' 
                : 'bg-gray-400'
            }`}
            title={availableToday ? 'Šodien pieejams' : 'Šodien nav pieejams'}
          />
          <span className="px-3 py-1 text-xs font-medium bg-black text-white rounded-full shadow-lg backdrop-blur-sm">
            {prof.category}
          </span>
        </div>

        {/* New Badge */}
        {isNew && (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-3 py-1 text-xs font-medium bg-emerald-500 text-white rounded-full shadow-lg">
              Jauns
            </span>
          </div>
        )}

        {/* Available Today Badge */}
        {availableToday && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-full shadow-lg">
              <Clock className="w-3.5 h-3.5" />
              Šodien pieejams
            </span>
          </div>
        )}

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
