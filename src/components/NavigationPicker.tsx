import { useEffect, useState } from 'react';

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

export default NavigationPicker;
