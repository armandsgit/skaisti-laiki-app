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
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [showNavigationPicker, setShowNavigationPicker] = useState(false);

  useEffect(() => {
    if (id) {
      loadProfessional();
      loadServices();
    }
  }, [id]);

  // Load staff members after professional data is available (for plan filtering)
  useEffect(() => {
    if (professional) {
      loadStaffMembers();
    }
  }, [professional]);

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
    
    // Filter by plan limit for public display
    if (data && professional) {
      const { getPlanFeatures } = await import('@/lib/plan-features');
      const planFeatures = getPlanFeatures(professional.plan);
      const limit = planFeatures.maxServices;
      
      // Apply plan limit: show only first X services
      const limitedServices = limit === -1 || limit === 999 
        ? data 
        : data.slice(0, limit);
      
      setServices(limitedServices);
    } else {
      setServices(data || []);
    }
  };

  const loadStaffMembers = async () => {
    const { data: staffData } = await supabase
      .from('staff_members')
      .select('*')
      .eq('professional_id', id)
      .eq('is_active', true)
      .eq('show_on_profile', true)
      .order('created_at');
    
    // Filter by plan limit - only show allowed number of masters to clients
    if (staffData && professional) {
      const { getPlanFeatures } = await import('@/lib/plan-features');
      const planFeatures = getPlanFeatures(professional.plan);
      const limit = planFeatures.maxStaffMembers;
      
      // Apply plan limit: show only first X masters
      const limitedStaff = limit === -1 || limit === 999 
        ? staffData 
        : staffData.slice(0, limit);
      
      setStaffMembers(limitedStaff);
    } else {
      setStaffMembers(staffData || []);
    }
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

      // Update client profile with name and phone
      const fullName = `${formData.firstName} ${formData.lastName}`;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: fullName,
          phone: formData.phone
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
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
          staff_member_id: formData.staffMemberId || null,
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
      {/* Hero Section - Fresha style */}
      <div className="relative bg-card border-b">
        <div className="max-w-screen-lg mx-auto px-5 py-8">
          <div className="text-center space-y-4">
            {/* Avatar */}
            <div className="relative inline-block">
              <Avatar className="w-32 h-32 border-4 border-background shadow-sm rounded-3xl">
                <AvatarImage src={professional.profiles?.avatar} className="object-cover" />
                <AvatarFallback className="bg-primary/5 text-primary text-4xl font-bold rounded-3xl">
                  {professional.profiles?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {professional.is_verified && (
                <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-2 shadow-md">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{professional.profiles?.name}</h1>
              <Badge variant="secondary" className="text-base px-4 py-1.5 rounded-full font-medium">
                {professional.category}
              </Badge>
            </div>

            {/* Rating & Location */}
            <div className="flex items-center justify-center gap-8 text-base">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-accent text-accent" />
                <span className="font-semibold text-foreground">{professional.rating?.toFixed(1) || '0.0'}</span>
                <span className="text-muted-foreground">({professional.total_reviews || 0})</span>
              </div>
              {professional.city && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    <span>{professional.city}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto px-5 py-8 space-y-6">
        {/* Bio Section */}
        {professional.bio && (
          <Card className="border border-border/50 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-3">Par mani</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{professional.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Gallery Carousel - Fresha style */}
        {professional.gallery && professional.gallery.length > 0 && (() => {
          const { getPlanFeatures } = require('@/lib/plan-features');
          const planFeatures = getPlanFeatures(professional.plan);
          const galleryLimit = planFeatures.maxGalleryPhotos;
          const displayGallery = galleryLimit === -1 || galleryLimit === 999 
            ? professional.gallery 
            : professional.gallery.slice(0, galleryLimit);
          
          return displayGallery.length > 0 && (
            <Card className="border border-border/50 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Galerija</h3>
                <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
                  <div className="flex gap-4">
                    {displayGallery.map((imageUrl: string, index: number) => (
                      <div
                        key={index}
                        className="flex-[0_0_85%] min-w-0 relative aspect-[4/3] rounded-2xl overflow-hidden"
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
          );
        })()}

        {/* Staff Members / Team */}
        {staffMembers.length > 0 && (
          <Card className="border border-border/50 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4">Mūsu komanda</h3>
              <div className="grid grid-cols-2 gap-4">
                {staffMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col items-center p-4 bg-background rounded-2xl border border-border/50"
                  >
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-20 h-20 rounded-2xl object-cover mb-3"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl mb-3">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <p className="font-semibold text-base text-center">{member.name}</p>
                    {member.position && (
                      <p className="text-sm text-muted-foreground text-center mt-1">
                        {member.position}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Section - Fresha style */}
        <Card className="border border-border/50 rounded-2xl">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-5">Pakalpojumi</h3>
            {services.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Euro className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-base text-muted-foreground">Nav pieejamu pakalpojumu</p>
              </div>
            ) : (
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="bg-background rounded-2xl p-5 border border-border/50 space-y-4"
                  >
                    <div className="space-y-2">
                      <h4 className="font-bold text-lg">{service.name}</h4>
                      {service.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                      )}
                      <div className="flex items-center gap-6 pt-1">
                        <span className="flex items-center gap-2 font-bold text-lg text-primary">
                          <Euro className="w-5 h-5" />
                          {service.price}€
                        </span>
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {service.duration} min
                        </span>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-14 rounded-2xl text-base font-semibold shadow-sm hover:shadow-md transition-all"
                      onClick={() => {
                        triggerHaptic('medium');
                        setSelectedServiceId(service.id);
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

        {/* Location Map - Fresha style */}
        {professional.latitude && professional.longitude && (
          <Card className="border border-border/50 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Atrašanās vieta</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-2 border-primary/20 bg-background hover:bg-primary/5 h-10 w-10 p-0"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowNavigationPicker(true);
                  }}
                >
                  <Navigation className="w-5 h-5 text-foreground" />
                </Button>
              </div>
              
              {professional.address && (
                <p className="text-base text-muted-foreground mb-5 leading-relaxed">
                  {professional.address}, {professional.city}
                </p>
              )}
              
              <div className="w-full overflow-hidden rounded-2xl border border-border/50">
                <div className="relative w-full h-64">
                  <LocationMap
                    latitude={professional.latitude}
                    longitude={professional.longitude}
                    address={professional.address}
                    professionalName={professional.profiles?.name}
                    rating={professional.rating}
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
        onClose={() => {
          setBookingDialogOpen(false);
          setSelectedServiceId(null);
        }}
        services={services}
        professionalId={id || ''}
        professionalName={professional?.profiles?.name || ''}
        professionalPlan={professional?.plan}
        onSubmit={handleBooking}
        initialServiceId={selectedServiceId}
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