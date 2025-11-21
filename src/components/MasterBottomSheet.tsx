import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SortedMaster } from '@/lib/master-sorting';
import NavigationPicker from './NavigationPicker';
import { Navigation } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';

interface MasterBottomSheetProps {
  master: SortedMaster | null;
  onClose: () => void;
}

const MasterBottomSheet = ({ master, onClose }: MasterBottomSheetProps) => {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showNavigationPicker, setShowNavigationPicker] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (master) {
      // Trigger entrance animation
      setIsVisible(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
      setDragOffset(0);
      setShowNavigationPicker(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [master]);

  if (!master) return null;

  const avatarUrl = master.profiles.avatar || 
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' + master.profiles.name;
  const shortAddress = master.address 
    ? (master.address.length > 35 ? master.address.substring(0, 35) + '...' : master.address)
    : master.city;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const newY = e.touches[0].clientY;
    setCurrentY(newY);
    const delta = newY - startY;
    
    // Only allow dragging down to close
    if (delta > 0) {
      setDragOffset(delta);
    }
  };

  const handleTouchEnd = () => {
    const deltaY = currentY - startY;
    
    // Close if dragged down more than 80px
    if (deltaY > 80) {
      setDragOffset(0);
      setIsVisible(false);
      setTimeout(() => {
        onClose();
      }, 300);
    } 
    // Reset position
    else {
      setDragOffset(0);
    }
    
    setStartY(0);
    setCurrentY(0);
  };

  const transform = dragOffset !== 0 ? `translateY(${dragOffset}px)` : undefined;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          zIndex: 9998,
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
        onClick={() => {
          setDragOffset(0);
          setIsVisible(false);
          setTimeout(() => {
            onClose();
          }, 300);
        }}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 bg-white rounded-t-[24px] shadow-2xl transition-all duration-300 ease-out ${
          isVisible ? '' : 'translate-y-full'
        }`}
        style={{
          bottom: 0,
          height: '35vh',
          zIndex: 9999,
          paddingBottom: `calc(68px + max(env(safe-area-inset-bottom), 12px))`,
          transform: transform,
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-3 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full transition-all duration-200 hover:bg-gray-400" />
        </div>

        {/* Content */}
        <div className="px-5 pb-4">
          {/* Header with Navigation Button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <img 
                  src={avatarUrl}
                  alt={master.profiles.name}
                  className="w-16 h-16 rounded-full object-cover border-3 border-primary/30 shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => {
                      navigate(`/professional/${master.id}`);
                    }, 150);
                  }}
                  className="text-xl font-bold text-gray-900 mb-1.5 leading-tight cursor-pointer hover:text-primary transition-colors active:scale-[0.98]"
                >
                  {master.profiles.name}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                    <span className="text-amber-500 text-sm">⭐</span>
                    <span className="text-gray-800 font-bold text-sm">
                      {master.rating || '5.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation Button */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowNavigationPicker(true);
              }}
              className="rounded-[18px] border-2 border-primary bg-background hover:bg-primary/5 px-3 py-1.5 h-auto flex-shrink-0 active:scale-95 transition-all"
              aria-label="Navigēt"
            >
              <Navigation className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2.5 mb-5 p-3.5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200/50">
            <span className="text-xl mt-0.5">📍</span>
            <span className="text-sm text-gray-700 font-medium leading-relaxed">
              {shortAddress}
            </span>
          </div>

          {/* View Profile Button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => {
                navigate(`/professional/${master.id}`);
              }, 150);
            }}
            className="w-full py-4 bg-gradient-to-r from-primary via-primary to-secondary text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2"
          >
            <span>Skatīt profilu</span>
            <span className="text-lg">→</span>
          </button>
        </div>
      </div>

      {/* Navigation Picker */}
      {master && (
        <NavigationPicker
          latitude={master.latitude}
          longitude={master.longitude}
          address={master.address}
          city={master.city}
          isOpen={showNavigationPicker}
          onClose={() => setShowNavigationPicker(false)}
        />
      )}
    </>
  );
};

export default MasterBottomSheet;
