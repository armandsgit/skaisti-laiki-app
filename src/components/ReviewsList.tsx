import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from './LoadingAnimation';
import { Card, CardContent } from '@/components/ui/card';

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
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          Atsauksmes
        </h3>

        {/* Average Rating */}
        {reviews.length > 0 && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-foreground mb-2">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex gap-0.5 mb-1">
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
                <p className="text-xs text-muted-foreground">
                  {reviews.length} {reviews.length === 1 ? 'atsauksme' : 'atsauksmes'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Nav atsauksmju</p>
            <p className="text-sm text-muted-foreground">
              Šim meistaram vēl nav apstiprinātu atsauksmju
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-muted/30 rounded-2xl p-4 border border-border/40 animate-fade-in"
              >
                {/* Reviewer Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {review.profiles?.avatar ? (
                      <img
                        src={review.profiles.avatar}
                        alt={review.profiles?.name || 'Klients'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {review.profiles?.name?.[0]?.toUpperCase() || 'K'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm">
                        {review.profiles?.name || 'Anonīms klients'}
                      </p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/40'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(review.created_at).toLocaleDateString('lv-LV', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
