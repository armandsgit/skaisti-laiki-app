import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock, Euro, CheckCircle, Award, Navigation, Calendar, Edit, ImagePlus, Settings, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import LocationMap from '@/components/LocationMap';
import BookingSuccessModal from '@/components/BookingSuccessModal';
import ReviewsList from '@/components/ReviewsList';
import { triggerHaptic } from '@/lib/haptic';
import LoadingAnimation from '@/components/LoadingAnimation';
import useEmblaCarousel from 'embla-carousel-react';
import NavigationPicker from '@/components/NavigationPicker';
import ModernBookingModal, { BookingFormData } from '@/components/ModernBookingModal';
import { format, addDays, startOfWeek } from 'date-fns';
import { lv } from 'date-fns/locale';

const ProfessionalProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useTranslation('lv');
  const [emblaRef] = useEmblaCarousel({ loop: false, skipSnaps: false, align: 'start' });
  
  const [professional, setProfessional] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [showNavigationPicker, setShowNavigationPicker] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (id && user) {
      checkOwnership();
    }
    if (id) {
      loadProfessional();
      loadServices();
    }
  }, [id, user]);

  useEffect(() => {
    if (id && selectedDate) {
      loadAvailableSlots();
    }
  }, [id, selectedDate]);

  const checkOwnership = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('professional_profiles')
      .select('user_id')
      .eq('id', id)
      .single();
    
    setIsOwner(data?.user_id === user.id);
  };

  const loadProfessional = async () => {
    const { data } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, avatar, phone)
      `)
      .eq('id', id)
      .single();
    
    setProfessional(data);
    setLoading(false);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', id);
    
    setServices(data || []);
  };

  const loadAvailableSlots = async () => {
    if (!id || !selectedDate) return;
    
    setLoadingSlots(true);
    try {
      const dayOfWeek = selectedDate.getDay();
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Fetch professional's schedule for this day
      const { data: schedules } = await supabase
        .from('professional_schedules')
        .select('*')
        .eq('professional_id', id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (!schedules || schedules.length === 0) {
        setAvailableSlots([]);
        return;
      }

      // Fetch existing bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('professional_id', id)
        .eq('booking_date', dateStr)
        .in('status', ['pending', 'confirmed']);

      const bookedTimes = new Set(bookings?.map(b => b.booking_time) || []);

      // Generate slots
      const slots: string[] = [];
      schedules.forEach(schedule => {
        const startHour = parseInt(schedule.start_time.split(':')[0]);
        const startMinute = parseInt(schedule.start_time.split(':')[1]);
        const endHour = parseInt(schedule.end_time.split(':')[0]);
        const endMinute = parseInt(schedule.end_time.split(':')[1]);

        let currentHour = startHour;
        let currentMinute = startMinute;

        while (
          currentHour < endHour || 
          (currentHour === endHour && currentMinute < endMinute)
        ) {
          const timeSlot = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          
          if (!bookedTimes.has(timeSlot)) {
            slots.push(timeSlot);
          }

          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute -= 60;
          }
        }
      });

      setAvailableSlots(slots.sort());
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBooking = async (formData: BookingFormData) => {
    if (!user) {
      toast.error('Lūdzu piesakieties');
      return;
    }

    triggerHaptic('medium');

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          professional_id: id,
          service_id: selectedService.id,
          booking_date: formData.date.toISOString().split('T')[0],
          booking_time: formData.time,
          notes: formData.notes || '',
          status: 'pending'
        });

      if (error) {
        toast.error(t.error);
      } else {
        setBookingDialogOpen(false);
        setSuccessModalOpen(true);
        loadAvailableSlots();
      }
    } catch (error: any) {
      toast.error(t.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation size={100} text={t.loading} />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Meistars nav atrasts</p>
      </div>
    );
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    return date;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Admin Controls - Only for Owner */}
      {isOwner && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-primary/90 to-secondary/90 backdrop-blur-lg border-b border-white/10 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-2 overflow-x-auto">
            <Badge variant="secondary" className="flex-shrink-0 bg-white/20 text-white border-0">
              <Settings className="w-3 h-3 mr-1" />
              Admin režīms
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 flex-shrink-0"
              onClick={() => navigate('/professional')}
            >
              <Edit className="w-4 h-4 mr-1" />
              Rediģēt pakalpojumus
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 flex-shrink-0"
              onClick={() => navigate('/professional')}
            >
              <ImagePlus className="w-4 h-4 mr-1" />
              Pievienot foto
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 flex-shrink-0"
              onClick={() => navigate('/professional')}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Pārvaldīt grafiku
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section with Gradient Aura */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 pt-8 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(167,139,250,0.1),transparent_50%)]" />
        
        <div className="relative max-w-2xl mx-auto px-4 text-center animate-fade-in">
          {/* Avatar with Gradient Ring */}
          <div className="relative inline-block mb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary rounded-full blur-xl opacity-60 animate-pulse" />
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-background shadow-2xl">
                <AvatarImage src={professional.profiles?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-4xl font-bold">
                  {professional.profiles?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {professional.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-primary to-secondary rounded-full p-2 shadow-lg border-2 border-background">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {professional.profiles?.name}
          </h1>

          {/* Category Badge */}
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            <Badge className="text-sm px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white border-0 shadow-lg">
              {professional.category}
            </Badge>
            {professional.is_verified && (
              <Badge variant="outline" className="text-sm px-3 py-1 rounded-full border-primary/30 text-primary">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Verificēts
              </Badge>
            )}
          </div>

          {/* Rating & Reviews */}
          {professional.total_reviews > 0 && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-foreground">{professional.rating?.toFixed(1)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {professional.total_reviews} atsauksmes
              </span>
            </div>
          )}

          {/* Location */}
          {professional.city && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{professional.city}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 -mt-2">
        {/* Bio Section */}
        {professional.bio && (
          <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in rounded-3xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-bold text-base">Apraksts</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{professional.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Gallery Carousel */}
        {professional.gallery && professional.gallery.length > 0 && (
          <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in rounded-3xl overflow-hidden">
            <CardContent className="p-5">
              <h3 className="font-bold text-base mb-4">Galerija</h3>
              <div className="overflow-hidden -mx-1" ref={emblaRef}>
                <div className="flex gap-3">
                  {professional.gallery.map((imageUrl: string, index: number) => (
                    <div
                      key={index}
                      className="flex-[0_0_75%] sm:flex-[0_0_60%] min-w-0 relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg"
                    >
                      <img
                        src={imageUrl}
                        alt={`Galerijas attēls ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Section - Bolt/Wolt Style */}
        <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in rounded-3xl overflow-hidden">
          <CardContent className="p-5">
            <h3 className="font-bold text-base mb-4">Pakalpojumi</h3>
            {services.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Euro className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Nav pieejamu pakalpojumu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="bg-gradient-to-br from-background to-muted/30 rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 border border-border/50"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-base mb-1">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{service.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5 font-bold text-primary">
                            <Euro className="w-4 h-4" />
                            <span className="text-lg">€{service.price}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">{service.duration} min</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full h-12 rounded-xl font-bold shadow-md bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white border-0 active:scale-[0.98] transition-all"
                        onClick={() => {
                          triggerHaptic('medium');
                          setSelectedService(service);
                          setBookingDialogOpen(true);
                        }}
                      >
                        Pieteikties vizītei
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Times Section */}
        <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in rounded-3xl overflow-hidden">
          <CardContent className="p-5">
            <h3 className="font-bold text-base mb-4">Pieejamie laiki</h3>
            
            {/* Week Days Selector */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
              {weekDays.map((date) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedDate(date);
                    }}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl font-medium transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg scale-105'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="text-xs mb-1">
                      {format(date, 'EEE', { locale: lv }).slice(0, 2)}
                    </span>
                    <span className="text-lg font-bold">{format(date, 'd')}</span>
                    {isToday && !isSelected && (
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="min-h-[120px]">
              {loadingSlots ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Ielādē laikus...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <XCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Šajā dienā nav pieejamu laiku</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((time) => (
                    <div
                      key={time}
                      className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 text-primary font-semibold py-3 px-4 rounded-xl text-center text-sm"
                    >
                      {time}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Section */}
        {professional.latitude && professional.longitude && (
          <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in rounded-3xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-base">Atrašanās vieta</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-2 hover:bg-primary/5 h-9 px-4"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowNavigationPicker(true);
                  }}
                >
                  <Navigation className="w-4 h-4 mr-1.5" />
                  Navigēt
                </Button>
              </div>
              
              {professional.address && (
                <p className="text-sm text-muted-foreground mb-4 font-medium">
                  {professional.address}, {professional.city}
                </p>
              )}
              
              <div className="w-full overflow-hidden rounded-2xl border-2 border-border/50 shadow-md">
                <div className="relative w-full h-52">
                  <LocationMap
                    latitude={professional.latitude}
                    longitude={professional.longitude}
                    address={professional.address}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        <div className="animate-fade-in">
          <ReviewsList professionalId={id!} />
        </div>
      </div>

      <ModernBookingModal
        isOpen={bookingDialogOpen && !!selectedService}
        onClose={() => setBookingDialogOpen(false)}
        service={selectedService || {}}
        professionalName={professional?.profiles?.name || ''}
        onSubmit={handleBooking}
      />

      <BookingSuccessModal
        open={successModalOpen} 
        onClose={() => setSuccessModalOpen(false)} 
      />

      {professional?.latitude && professional?.longitude && (
        <NavigationPicker
          latitude={professional.latitude}
          longitude={professional.longitude}
          address={professional.address}
          city={professional.city}
          isOpen={showNavigationPicker}
          onClose={() => setShowNavigationPicker(false)}
        />
      )}
    </div>
  );
};

export default ProfessionalProfile;
