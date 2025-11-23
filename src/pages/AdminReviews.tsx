import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Check, X, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import LoadingAnimation from '@/components/LoadingAnimation';
import EmptyStateAnimation from '@/components/EmptyStateAnimation';
import { triggerHaptic } from '@/lib/haptic';

interface Review {
  id: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
  client: {
    name: string;
    avatar: string | null;
  };
  professional: {
    name: string;
  };
}

export default function AdminReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    checkAdminAccess();
    loadReviews();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ADMIN')
      .single();

    if (!roleData) {
      navigate('/');
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          status,
          created_at,
          professional_id,
          profiles!reviews_client_id_fkey (
            name,
            avatar
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch professional names separately
      const reviewsWithProfessionalNames = await Promise.all(
        (data || []).map(async (review) => {
          const { data: profileData } = await supabase
            .from('professional_profiles')
            .select('profiles!professional_profiles_user_id_fkey(name)')
            .eq('id', review.professional_id)
            .single();

          return {
            ...review,
            client: review.profiles,
            professional: {
              name: profileData?.profiles?.name || 'Nav datu'
            }
          };
        })
      );

      setReviews(reviewsWithProfessionalNames);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Neizdevās ielādēt atsauksmes');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    triggerHaptic();
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(
        newStatus === 'approved'
          ? 'Atsauksme apstiprināta'
          : 'Atsauksme noraidīta'
      );
      loadReviews();
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('Neizdevās atjaunināt statusu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo atsauksmi?')) return;

    triggerHaptic();
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Atsauksme dzēsta');
      loadReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Neizdevās dzēst atsauksmi');
    }
  };

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setEditComment(review.comment);
  };

  const handleSaveEdit = async (id: string) => {
    if (editComment.trim().length < 10) {
      toast.error('Komentāram jābūt vismaz 10 simbolu garam');
      return;
    }

    triggerHaptic();
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ comment: editComment.trim() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Atsauksme atjaunināta');
      setEditingId(null);
      loadReviews();
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Neizdevās atjaunināt atsauksmi');
    }
  };

  const renderReview = (review: Review) => (
    <div
      key={review.id}
      className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {review.client?.avatar ? (
              <img
                src={review.client.avatar}
                alt={review.client.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-primary">
                {review.client?.name?.[0]?.toUpperCase() || 'K'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {review.client?.name || 'Anonīms'}
            </p>
            <p className="text-xs text-muted-foreground">
              Meistars: {review.professional?.name || 'Nav datu'}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString('lv-LV')}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex gap-0.5">
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
      </div>

      {/* Comment */}
      {editingId === review.id ? (
        <div className="space-y-2">
          <Textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleSaveEdit(review.id)}>
              Saglabāt
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingId(null)}
            >
              Atcelt
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground leading-relaxed">
          {review.comment}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        {review.status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleStatusChange(review.id, 'approved')}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1" />
              Apstiprināt
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(review.id, 'rejected')}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              Noraidīt
            </Button>
          </>
        )}
        {review.status === 'approved' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange(review.id, 'rejected')}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-1" />
            Noraidīt
          </Button>
        )}
        {review.status === 'rejected' && (
          <Button
            size="sm"
            variant="default"
            onClick={() => handleStatusChange(review.id, 'approved')}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-1" />
            Apstiprināt
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEdit(review)}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleDelete(review.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingAnimation size={100} text="Ielāde" />
    </div>
  );

  const pendingReviews = reviews.filter((r) => r.status === 'pending');
  const approvedReviews = reviews.filter((r) => r.status === 'approved');
  const rejectedReviews = reviews.filter((r) => r.status === 'rejected');

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Atsauksmju pārvaldība
        </h1>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="pending">
              Gaida ({pendingReviews.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Apstiprinātas ({approvedReviews.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Noraidītas ({rejectedReviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingReviews.length === 0 ? (
              <EmptyStateAnimation 
                size={120}
                title="Nav jaunu atsauksmju"
                description="Pašlaik nav atsauksmju, kas gaida apstiprināšanu"
              />
            ) : (
              pendingReviews.map(renderReview)
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedReviews.length === 0 ? (
              <EmptyStateAnimation 
                size={120}
                title="Nav apstiprinātu atsauksmju"
                description="Pašlaik nav neviena apstiprināta atsauksme"
              />
            ) : (
              approvedReviews.map(renderReview)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedReviews.length === 0 ? (
              <EmptyStateAnimation 
                size={120}
                title="Nav noraidītu atsauksmju"
                description="Pašlaik nav neviena noraidīta atsauksme"
              />
            ) : (
              rejectedReviews.map(renderReview)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
