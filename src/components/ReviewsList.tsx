import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import EmptyStateAnimation from './EmptyStateAnimation';
import LoadingAnimation from './LoadingAnimation';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: {
    name: string;
    avatar: string | null;
  };
}

interface ReviewsListProps {
  professionalId: string;
}

export default function ReviewsList({ professionalId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [professionalId]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles:client_id (
            name,
            avatar
          )
        `)
        .eq('professional_id', professionalId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      // Calculate average rating
      if (data && data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  return (
    <div className="space-y-6">
      {/* Average Rating */}
      {reviews.length > 0 && (
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground mb-1">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Vidējais vērtējums no {reviews.length} atsauksmēm
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <EmptyStateAnimation 
          size={120}
          title="Nav atsauksmju"
          description="Šim meistaram vēl nav apstiprinātu atsauksmju"
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow"
            >
              {/* Reviewer Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {review.profiles?.avatar ? (
                    <img
                      src={review.profiles.avatar}
                      alt={review.profiles?.name || 'Klients'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-primary">
                      {review.profiles?.name?.[0]?.toUpperCase() || 'K'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {review.profiles?.name || 'Anonīms klients'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString('lv-LV', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>

              {/* Comment */}
              <p className="text-sm text-foreground leading-relaxed">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
