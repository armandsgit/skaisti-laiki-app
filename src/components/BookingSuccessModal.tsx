import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle } from 'lucide-react';
import { triggerSuccessHaptic } from '@/lib/haptic';

interface BookingSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BookingSuccessModal({ open, onClose }: BookingSuccessModalProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Trigger success haptic feedback
      triggerSuccessHaptic();
      
      // Trigger opening animation
      setTimeout(() => setIsVisible(true), 10);
      
      // Auto-redirect after 2.5 seconds
      const redirectTimer = setTimeout(() => {
        handleClose();
      }, 2500);

      return () => clearTimeout(redirectTimer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      navigate('/bookings');
    }, 300);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full pointer-events-auto transition-all duration-300 ease-out ${
            isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
          style={{
            transformOrigin: 'center',
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Aizvērt"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center">
            {/* Success Animation */}
            <div className="mb-4 flex justify-center">
              <div className={`transition-all duration-500 ${isVisible ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-45 opacity-0'}`}>
                <div className="relative">
                  {/* Success Circle */}
                  <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500" strokeWidth={2} />
                  </div>
                  
                  {/* Confetti particles */}
                  <div className="absolute inset-0">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full ${
                          i % 3 === 0 ? 'bg-pink-400' : i % 3 === 1 ? 'bg-blue-400' : 'bg-yellow-400'
                        }`}
                        style={{
                          top: '50%',
                          left: '50%',
                          animation: `confetti-${i} 0.8s ease-out forwards`,
                          animationDelay: `${0.2 + i * 0.05}s`,
                          opacity: 0
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-foreground mb-3">
              Rezervācija veiksmīgi izveidota!
            </h2>

            {/* Subtitle */}
            <p className="text-base text-muted-foreground mb-2">
              Paldies! Jūsu rezervācija ir apstiprināta.
            </p>

            {/* Optional text */}
            <p className="text-sm text-muted-foreground/80">
              Jūs varat apskatīt savu rezervāciju sadaļā "Rezervācijas".
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
