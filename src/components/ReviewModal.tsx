import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerSuccessHaptic, triggerHaptic } from '@/lib/haptic';

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  professionalId: string;
  clientId: string;
  onSuccess: () => void;
}

export default function ReviewModal({
  open,
  onClose,
  bookingId,
  professionalId,
  clientId,
  onSuccess
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Lūdzu izvēlieties reitingu');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Komentāram jābūt vismaz 10 simbolu garam');
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: bookingId,
          professional_id: professionalId,
          client_id: clientId,
          rating,
          comment: comment.trim(),
          status: 'pending'
        });

      if (error) throw error;

      triggerSuccessHaptic();
      setShowSuccess(true);

      // Auto-close success message after 2.5s
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        onClose();
        // Reset form
        setRating(0);
        setComment('');
      }, 2500);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error('Neizdevās iesniegt atsauksmi');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-background rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 max-w-lg w-full pointer-events-auto animate-slide-up"
          style={{ maxHeight: '90vh', overflowY: 'auto' }}
        >
          {!showSuccess ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  Novērtēt pakalpojumu
                </h2>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Star Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Jūsu vērtējums *
                </label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star);
                        triggerHaptic();
                      }}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Jūsu atsauksme * (min. 10 simboli)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Aprakstiet savu pieredzi..."
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {comment.length}/500 simboli
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0 || comment.trim().length < 10}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? 'Nosūta...' : 'Iesniegt atsauksmi'}
              </Button>
            </>
          ) : (
            /* Success Message */
            <div className="text-center py-8">
              <div className="mb-4 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
                  <svg
                    className="w-12 h-12 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Atsauksme nosūtīta apstiprināšanai
              </h3>
              <p className="text-muted-foreground">
                Paldies par Jūsu vērtējumu! Administrators to pārbaudīs un apstiprinās.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
