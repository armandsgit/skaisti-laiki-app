import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Lottie from 'lottie-react';

// Simple success animation
const successAnimation = {
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: "Success",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Check",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [50, 50, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [0, 0, 100], e: [120, 120, 100] }, { t: 20, s: [120, 120, 100], e: [100, 100, 100] }, { t: 30 }] }
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "el",
              d: 1,
              s: { a: 0, k: [50, 50] },
              p: { a: 0, k: [0, 0] }
            },
            {
              ty: "fl",
              c: { a: 0, k: [0.2, 0.8, 0.4, 1] },
              o: { a: 0, k: 100 }
            }
          ]
        }
      ]
    }
  ]
};

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
          {/* Lottie Animation */}
          <div className="flex justify-center mb-4">
            <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center">
              <Lottie animationData={successAnimation} loop={false} className="w-24 h-24" />
            </div>
          </div>

          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Vizīte veiksmīgi pieteikta!
          </h2>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-4">
            Meistars drīzumā apstiprinās rezervāciju
          </p>

          {/* Info */}
          {bookingDetails && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-4 space-y-2 mt-4">
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
          <p className="text-center text-sm text-gray-500 mt-4">
            Automātiski pāriet uz rezervācijām pēc 3 sekundēm...
          </p>
        </div>
      </div>
    </>
  );
};

export default BookingSuccessModal;
