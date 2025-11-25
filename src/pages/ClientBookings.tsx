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
import { toast } from 'sonner';
import BottomNavigation from '@/components/BottomNavigation';

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

  // Real-time subscription for booking updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('client-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `client_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📱 Client booking changed:', payload);
          
          // Reload bookings when any change occurs
          loadBookings();
          
          // Show toast for status changes
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newStatus = (payload.new as any).status;
            const oldStatus = (payload.old as any)?.status;
            
            if (oldStatus === 'pending' && newStatus === 'confirmed') {
              toast.success('✅ Jūsu rezervācija ir apstiprināta!');
            } else if (newStatus === 'canceled') {
              toast.error('❌ Rezervācija tika atcelta');
            } else if (oldStatus === 'confirmed' && newStatus === 'completed') {
              toast.success('✓ Rezervācija pabeigta');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          category,
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
      
      // Sort bookings: pending first, then newest first (by created_at)
      const sortedBookings = bookingsWithReviewStatus.sort((a, b) => {
        // Priority 1: pending status always on top
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        // Priority 2: newest first (by creation time)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setBookings(sortedBookings);
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
                    className={`border shadow-card overflow-hidden tap-feedback cursor-pointer hover:shadow-elegant transition-shadow relative ${
                      booking.status === 'pending' 
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200' 
                        : booking.status === 'confirmed'
                        ? 'bg-green-50 border-green-400 ring-2 ring-green-200'
                        : ''
                    }`}
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
                            <h4 className="font-semibold text-base mb-1">
                              {booking.staff_members?.name || booking.professional_profiles?.profiles?.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {booking.professional_profiles?.profiles?.name}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {booking.services?.name}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(booking.booking_date).toLocaleDateString('lv-LV')} • {booking.booking_time}
                          </span>
                        </div>

                        {/* Status Badge Below Date/Time */}
                        <div className="flex justify-center pt-1">
                           <Badge 
                            className={`text-xs px-4 py-1.5 ${
                              booking.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-300' :
                              booking.status === 'cancelled_by_master' || booking.status === 'canceled_by_master' ? 'bg-red-100 text-red-800 border-red-300' :
                              booking.status === 'cancelled_by_client' || booking.status === 'canceled_by_client' ? 'bg-red-100 text-red-800 border-red-300' :
                              booking.status === 'cancelled_system' || booking.status === 'canceled_system' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                              booking.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            {booking.status === 'confirmed' ? 'Apstiprināta' :
                             booking.status === 'pending' ? 'Gaida apstiprinājumu' :
                             booking.status === 'cancelled_by_master' || booking.status === 'canceled_by_master' ? 'Atcelta meistara dēļ' :
                             booking.status === 'cancelled_by_client' || booking.status === 'canceled_by_client' ? 'Atcelta klienta dēļ' :
                             booking.status === 'cancelled_system' || booking.status === 'canceled_system' ? 'Atcelta automātiski' :
                             booking.status === 'completed' ? 'Pabeigta' :
                             t[booking.status as keyof typeof t] || booking.status}
                          </Badge>
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
                        className="border shadow-card overflow-hidden tap-feedback cursor-pointer hover:shadow-elegant transition-shadow opacity-60 relative"
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
                                <h4 className="font-semibold text-base text-muted-foreground mb-1">
                                  {booking.staff_members?.name || booking.professional_profiles?.profiles?.name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {booking.professional_profiles?.profiles?.name}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {booking.services?.name}
                                </p>
                              </div>

                              {/* Status Badge on the Right */}
                               <Badge 
                                className={`text-xs px-3 py-1 flex-shrink-0 ${
                                  booking.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                  booking.status === 'cancelled_by_master' || booking.status === 'canceled_by_master' ? 'bg-red-100 text-red-800 border-red-300' :
                                  booking.status === 'cancelled_by_client' || booking.status === 'canceled_by_client' ? 'bg-red-100 text-red-800 border-red-300' :
                                  booking.status === 'cancelled_system' || booking.status === 'canceled_system' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                                  'bg-gray-100 text-gray-800 border-gray-300'
                                }`}
                              >
                                {booking.status === 'completed' ? 'Pabeigta' :
                                 booking.status === 'cancelled_by_master' || booking.status === 'canceled_by_master' ? 'Atcelta meistara dēļ' :
                                 booking.status === 'cancelled_by_client' || booking.status === 'canceled_by_client' ? 'Atcelta klienta dēļ' :
                                 booking.status === 'cancelled_system' || booking.status === 'canceled_system' ? 'Atcelta automātiski' :
                                 t[booking.status as keyof typeof t] || booking.status}
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

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ClientBookings;
