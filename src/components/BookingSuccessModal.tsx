import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle } from 'lucide-react';

interface BookingSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BookingSuccessModal({ open, onClose }: BookingSuccessModalProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
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
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
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
            {/* Success Icon */}
            <div className="mb-5 flex justify-center">
              <div className={`transition-all duration-500 ${isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-45'}`}>
                <CheckCircle className="w-16 h-16 text-green-500" strokeWidth={2} />
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
