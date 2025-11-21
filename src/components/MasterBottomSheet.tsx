import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SortedMaster } from '@/lib/master-sorting';
import { Star, Navigation } from 'lucide-react';

interface MasterBottomSheetProps {
  master: SortedMaster | null;
  onClose: () => void;
}

interface NavigationPickerProps {
  latitude: number;
  longitude: number;
  isOpen: boolean;
  onClose: () => void;
}

const NavigationPicker = ({ latitude, longitude, isOpen, onClose }: NavigationPickerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const navigationOptions = [
    {
      name: 'Apple Maps',
      icon: '🗺️',
      url: `https://maps.apple.com/?ll=${latitude},${longitude}`,
      priority: isIOS ? 1 : 3,
    },
    {
      name: 'Google Maps',
      icon: '🌍',
      url: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      priority: isIOS ? 2 : 1,
    },
    {
      name: 'Waze',
      icon: '🚗',
      url: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
      priority: 2,
    },
  ].sort((a, b) => a.priority - b.priority);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          zIndex: 10000,
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 200);
        }}
      />
      
      {/* Navigation Picker Sheet */}
      <div
        className={`fixed left-0 right-0 bg-white rounded-t-[24px] shadow-2xl transition-all duration-300 ease-out ${
          isVisible ? '' : 'translate-y-full'
        }`}
        style={{
          bottom: 0,
          zIndex: 10001,
          paddingBottom: `calc(68px + max(env(safe-area-inset-bottom), 12px))`,
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-5 pb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Izvēlies navigāciju</h3>
          
          <div className="space-y-2">
            {navigationOptions.map((option) => (
              <button
                key={option.name}
                onClick={() => {
                  window.open(option.url, '_blank');
                  setIsVisible(false);
                  setTimeout(onClose, 200);
                }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-2xl transition-all duration-150 active:scale-[0.98]"
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="flex-1 text-left font-semibold text-gray-900">{option.name}</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

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
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <img 
              src={avatarUrl}
              alt={master.profiles.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 shadow-sm flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight truncate">
                {master.profiles.name}
              </h3>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-gray-900">
                  {master.rating || '5.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 mb-4 text-sm text-gray-600">
            <span className="text-base mt-0.5">📍</span>
            <span className="leading-relaxed">{shortAddress}</span>
          </div>

          {/* Navigate Button */}
          <button
            onClick={() => setShowNavigationPicker(true)}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            <span>Navigēt</span>
          </button>
        </div>
      </div>

      {/* Navigation Picker */}
      <NavigationPicker
        latitude={master.latitude}
        longitude={master.longitude}
        isOpen={showNavigationPicker}
        onClose={() => setShowNavigationPicker(false)}
      />
    </>
  );
};

export default MasterBottomSheet;
