import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SortedMaster } from '@/lib/master-sorting';

interface MasterBottomSheetProps {
  master: SortedMaster | null;
  onClose: () => void;
}

const MasterBottomSheet = ({ master, onClose }: MasterBottomSheetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (master) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    const deltaY = currentY - startY;
    if (deltaY > 50) {
      onClose();
    } else if (deltaY < -50 && !isExpanded) {
      setIsExpanded(true);
    }
    setStartY(0);
    setCurrentY(0);
  };

  const height = isExpanded ? '75vh' : '45vh';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        className="fixed left-0 right-0 bg-white rounded-t-[28px] shadow-2xl transition-all duration-300 ease-out"
        style={{
          bottom: 0,
          height,
          zIndex: 9999,
          paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Content */}
        <div className="px-5 pb-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={avatarUrl}
              alt={master.profiles.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {master.profiles.name}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 text-base">⭐</span>
                <span className="text-gray-700 font-semibold text-base">
                  {master.rating || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 mb-5 p-3 bg-gray-50 rounded-2xl">
            <span className="text-lg mt-0.5">📍</span>
            <span className="text-sm text-gray-700 font-medium leading-relaxed">
              {shortAddress}
            </span>
          </div>

          {/* View Profile Button */}
          <button
            onClick={() => navigate(`/professional/${master.id}`)}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            Skatīt profilu →
          </button>
        </div>
      </div>
    </>
  );
};

export default MasterBottomSheet;
