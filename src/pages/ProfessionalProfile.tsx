import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock, Euro, CheckCircle, Award, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import LocationMap from '@/components/LocationMap';
import BookingSuccessModal from '@/components/BookingSuccessModal';
import ReviewsList from '@/components/ReviewsList';
import { triggerHaptic } from '@/lib/haptic';
import LoadingAnimation from '@/components/LoadingAnimation';
import useEmblaCarousel from 'embla-carousel-react';
import NavigationPicker from '@/components/NavigationPicker';
import ModernBookingModal, { BookingFormData } from '@/components/ModernBookingModal';

const ProfessionalProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useTranslation('lv');
  const [emblaRef] = useEmblaCarousel({ loop: true, skipSnaps: false });
  
  const [professional, setProfessional] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [showNavigationPicker, setShowNavigationPicker] = useState(false);

  useEffect(() => {
    if (id) {
      loadProfessional();
      loadServices();
    }
  }, [id]);

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

  const handleBooking = async (formData: BookingFormData) => {
    if (!user) {
      toast.error('Lūdzu piesakieties');
      return;
    }

    triggerHaptic('medium');

    try {
      // Find selected service
      const selectedService = services.find(s => s.id === formData.serviceId);
      if (!selectedService) {
        toast.error('Pakalpojums nav atrasts');
        return;
      }

      // Calculate booking end time based on service duration
      const [hours, minutes] = formData.time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + selectedService.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const bookingEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      const { error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          professional_id: id,
          service_id: selectedService.id,
          booking_date: formData.date.toISOString().split('T')[0],
          booking_time: formData.time,
          booking_end_time: bookingEndTime,
          notes: formData.notes || '',
          status: 'pending'
        });

      if (error) {
        toast.error(t.error);
      } else {
        setBookingDialogOpen(false);
        setSuccessModalOpen(true);
      }
    } catch (error: any) {
      toast.error(t.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex items-center justify-center">
        <LoadingAnimation size={100} text={t.loading} />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Meistars nav atrasts</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-primary/5 to-background pt-6 pb-8 px-4">
        <div className="max-w-2xl mx-auto text-center animate-fade-in">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <Avatar className="w-28 h-28 border-4 border-background shadow-lg">
              <AvatarImage src={professional.profiles?.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {professional.profiles?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {professional.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 shadow-lg">
                <CheckCircle className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Name & Category */}
          <h1 className="text-2xl font-bold mb-2">{professional.profiles?.name}</h1>
          <Badge variant="secondary" className="mb-4 text-sm px-3 py-1">
            {professional.category}
          </Badge>

          {/* Rating & Location */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-foreground">{professional.rating || 0}</span>
              <span>({professional.total_reviews || 0})</span>
            </div>
            {professional.city && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{professional.city}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4">
        {/* Bio Section */}
        {professional.bio && (
          <Card className="border-0 shadow-sm animate-fade-in">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Par mani
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{professional.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Gallery Carousel */}
        {professional.gallery && professional.gallery.length > 0 && (
          <Card className="border-0 shadow-sm overflow-hidden animate-fade-in">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Galerija</h3>
              <div className="overflow-hidden rounded-xl" ref={emblaRef}>
                <div className="flex gap-3">
                  {professional.gallery.map((imageUrl: string, index: number) => (
                    <div
                      key={index}
                      className="flex-[0_0_80%] min-w-0 relative aspect-[4/3] rounded-xl overflow-hidden"
                    >
                      <img
                        src={imageUrl}
                        alt={`Galerijas attēls ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Section */}
        <Card className="border-0 shadow-sm animate-fade-in">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">{t.services}</h3>
            {services.length === 0 ? (
              <div className="text-center py-8">
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
                    className="bg-muted/30 rounded-2xl p-4 space-y-3 border border-border/40"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base mb-1">{service.name}</h4>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                        )}
                        <div className="flex gap-4 text-sm">
                          <span className="flex items-center gap-1.5 font-semibold text-primary">
                            <Euro className="w-4 h-4" />
                            €{service.price}
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {service.duration} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="w-full rounded-xl font-semibold shadow-sm button-press"
                      onClick={() => {
                        triggerHaptic('medium');
                        setBookingDialogOpen(true);
                      }}
                    >
                      Pieteikties vizītei
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Map */}
        {professional.latitude && professional.longitude && (
          <Card className="border-0 shadow-sm overflow-hidden animate-fade-in">
            <CardContent className="p-4">
              {/* Header Row: Icon left, Button right */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Atrašanās vieta</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[18px] border-2 border-primary bg-background hover:bg-primary/5 px-3 py-1.5 h-auto flex-shrink-0"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowNavigationPicker(true);
                  }}
                >
                  <Navigation className="w-4 h-4 text-foreground" />
                </Button>
              </div>
              
              {/* Address */}
              {professional.address && (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {professional.address}, {professional.city}
                </p>
              )}
              
              {/* Map */}
              <div className="w-full overflow-hidden rounded-[24px] border">
                <div className="relative w-full h-48">
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
        isOpen={bookingDialogOpen}
        onClose={() => setBookingDialogOpen(false)}
        services={services}
        professionalId={id || ''}
        professionalName={professional?.profiles?.name || ''}
        onSubmit={handleBooking}
      />

      <BookingSuccessModal
        open={successModalOpen} 
        onClose={() => setSuccessModalOpen(false)} 
      />

      {/* Navigation Picker */}
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