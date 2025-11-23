import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, MessageSquare, ChevronDown } from 'lucide-react';
import LoadingAnimation from '@/components/LoadingAnimation';
import EmptyStateAnimation from '@/components/EmptyStateAnimation';
import ReviewModal from '@/components/ReviewModal';

const ClientBookings = () => {
  const t = useTranslation('lv');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services(name, price),
        professional_profiles(
          id,
          profiles!professional_profiles_user_id_fkey(name, avatar)
        ),
        staff_members(id, name, avatar, position)
      `)
      .eq('client_id', user?.id)
      .or(`status.neq.completed,and(status.eq.completed,booking_date.gte.${thirtyDaysAgoStr})`)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });
    
    if (!error && data) {
      // Check if reviews exist for each booking
      const bookingsWithReviewStatus = await Promise.all(
        data.map(async (booking) => {
          const { data: reviewData } = await supabase
            .from('reviews')
            .select('id, status')
            .eq('booking_id', booking.id)
            .maybeSingle();

          return {
            ...booking,
            hasReview: !!reviewData,
            reviewStatus: reviewData?.status
          };
        })
      );
      
      setBookings(bookingsWithReviewStatus);
    }
    setLoading(false);
  };

  const handleOpenReview = (booking: any) => {
    setSelectedBooking(booking);
    setReviewModalOpen(true);
  };

  const handleReviewSuccess = () => {
    loadBookings(); // Reload bookings to update review status
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation size={100} text={t.loading} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-card/95 backdrop-blur-sm border-b sticky top-0 z-10 shadow-soft">
        <div className="max-w-screen-sm mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-center">Manas rezervācijas</h1>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-6">
        {bookings.length === 0 ? (
          <EmptyStateAnimation 
            size={140}
            title="Jums vēl nav nevienas rezervācijas"
            description="Sāciet meklēt meistarnieces un izveidojiet savu pirmo rezervāciju!"
          />
        ) : (
          <div className="space-y-6">
            {/* Active/Upcoming Bookings */}
            <div className="space-y-3">
              {bookings
                .filter(b => b.status !== 'completed')
                .map((booking) => (
                  <Card 
                    key={booking.id} 
                    className="border shadow-card overflow-hidden tap-feedback cursor-pointer hover:shadow-elegant transition-shadow"
                    onClick={() => navigate(`/professional/${booking.professional_profiles?.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                          {/* Staff Member Avatar */}
                          {booking.staff_members?.avatar ? (
                            <img 
                              src={booking.staff_members.avatar} 
                              alt={booking.staff_members.name}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                              {booking.staff_members?.name?.charAt(0) || booking.professional_profiles?.profiles?.name?.charAt(0)}
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base">
                              {booking.staff_members?.name || booking.professional_profiles?.profiles?.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {booking.professional_profiles?.profiles?.name}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {booking.services?.name}
                            </p>
                          </div>
                          
                          <Badge 
                            variant={
                              booking.status === 'confirmed' ? 'default' :
                              booking.status === 'canceled' ? 'destructive' : 'outline'
                            }
                            className="text-xs px-2.5 py-1 whitespace-nowrap flex-shrink-0 self-start"
                          >
                            {t[booking.status as keyof typeof t] || booking.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(booking.booking_date).toLocaleDateString('lv-LV')} • {booking.booking_time}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {/* Completed Bookings Section */}
            {bookings.filter(b => b.status === 'completed').length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium text-muted-foreground">
                    Pabeigtās rezervācijas ({bookings.filter(b => b.status === 'completed').length})
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${completedOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-3 space-y-3">
                  {bookings
                    .filter(b => b.status === 'completed')
                    .map((booking) => (
                      <Card 
                        key={booking.id} 
                        className="border shadow-card overflow-hidden tap-feedback cursor-pointer hover:shadow-elegant transition-shadow opacity-60"
                        onClick={() => navigate(`/professional/${booking.professional_profiles?.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-3">
                              {/* Staff Member Avatar */}
                              {booking.staff_members?.avatar ? (
                                <img 
                                  src={booking.staff_members.avatar} 
                                  alt={booking.staff_members.name}
                                  className="w-12 h-12 rounded-full object-cover flex-shrink-0 grayscale"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0 grayscale">
                                  {booking.staff_members?.name?.charAt(0) || booking.professional_profiles?.profiles?.name?.charAt(0)}
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-base text-muted-foreground">
                                  {booking.staff_members?.name || booking.professional_profiles?.profiles?.name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {booking.professional_profiles?.profiles?.name}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {booking.services?.name}
                                </p>
                              </div>
                              
                              <Badge 
                                variant="secondary"
                                className="text-xs px-2.5 py-1 whitespace-nowrap flex-shrink-0 self-start"
                              >
                                {t[booking.status as keyof typeof t] || booking.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(booking.booking_date).toLocaleDateString('lv-LV')} • {booking.booking_time}
                              </span>
                            </div>

                            {/* Review Button - Only show for completed bookings without approved review */}
                            {!booking.hasReview && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReview(booking);
                                }}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Atstāt atsauksmi
                              </Button>
                            )}

                            {/* Review Status Badge */}
                            {booking.hasReview && booking.reviewStatus === 'pending' && (
                              <Badge variant="outline" className="w-full mt-3 justify-center">
                                Atsauksme gaida apstiprināšanu
                              </Badge>
                            )}
                            {booking.hasReview && booking.reviewStatus === 'approved' && (
                              <Badge variant="secondary" className="w-full mt-3 justify-center">
                                Atsauksme publicēta
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {selectedBooking && (
        <ReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          bookingId={selectedBooking.id}
          professionalId={selectedBooking.professional_profiles?.id}
          clientId={user?.id || ''}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
};

export default ClientBookings;
