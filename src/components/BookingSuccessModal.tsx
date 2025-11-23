import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BookingSuccessModalProps {
  open: boolean;
  onClose: () => void;
  bookingDetails?: {
    service?: string;
    date?: string;
    time?: string;
    address?: string;
  };
}

const BookingSuccessModal = ({ open, onClose, bookingDetails }: BookingSuccessModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      
      // Auto close after 3 seconds with fade-out
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      navigate('/client/bookings');
    }, 300);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 10002 }}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ zIndex: 10003 }}
      >
        <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
          {/* Modern CSS Success Animation */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              {/* Outer circle with scale animation */}
              <div className="absolute inset-0 bg-success rounded-full animate-[scale-in_0.4s_ease-out]" />
              
              {/* Inner white circle */}
              <div className="absolute inset-2 bg-white rounded-full animate-[scale-in_0.5s_ease-out_0.1s_both]" />
              
              {/* Checkmark */}
              <svg
                className="absolute inset-0 w-full h-full p-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-[draw-check_0.5s_ease-out_0.3s_both]"
                  style={{
                    strokeDasharray: '20',
                    strokeDashoffset: '20',
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2 animate-[fade-in_0.4s_ease-out_0.4s_both]">
            Vizīte veiksmīgi pieteikta!
          </h2>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-4 animate-[fade-in_0.4s_ease-out_0.5s_both]">
            Meistars drīzumā apstiprinās rezervāciju
          </p>

          {/* Info */}
          {bookingDetails && (
            <div className="bg-secondary rounded-2xl p-4 space-y-2 mt-4 animate-[fade-in_0.4s_ease-out_0.6s_both]">
              {bookingDetails.service && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Pakalpojums:</span>
                  <span className="font-semibold text-gray-900">{bookingDetails.service}</span>
                </div>
              )}
              {bookingDetails.date && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Datums:</span>
                  <span className="font-semibold text-gray-900">{bookingDetails.date}</span>
                </div>
              )}
              {bookingDetails.time && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Laiks:</span>
                  <span className="font-semibold text-gray-900">{bookingDetails.time}</span>
                </div>
              )}
              {bookingDetails.address && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-gray-600">Adrese:</span>
                  <span className="font-semibold text-gray-900">{bookingDetails.address}</span>
                </div>
              )}
            </div>
          )}

          {/* Auto-close message */}
          <p className="text-center text-sm text-gray-500 mt-4 animate-[fade-in_0.4s_ease-out_0.7s_both]">
            Automātiski pāriet uz rezervācijām pēc 3 sekundēm...
          </p>
        </div>
      </div>
    </>
  );
};

export default BookingSuccessModal;
