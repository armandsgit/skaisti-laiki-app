import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Star, MapPin, Clock, Euro } from 'lucide-react';
import { toast } from 'sonner';
import LocationMap from '@/components/LocationMap';
import { bookingSchema } from '@/lib/validation';

const ProfessionalProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useTranslation('lv');
  
  const [professional, setProfessional] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<Date>();
  const [bookingTime, setBookingTime] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProfessional();
      loadServices();
      loadReviews();
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

  const loadReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles!reviews_client_id_fkey(name)
      `)
      .eq('professional_id', id)
      .order('created_at', { ascending: false });
    
    setReviews(data || []);
  };

  const handleBooking = async () => {
    if (!user || !selectedService || !bookingDate || !bookingTime) {
      toast.error('Lūdzu aizpildiet visus laukus');
      return;
    }

    try {
      // Validate booking data
      const validatedData = bookingSchema.parse({
        service_id: selectedService.id,
        booking_date: bookingDate.toISOString().split('T')[0],
        booking_time: bookingTime,
        notes: ''
      });

      const { error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          professional_id: id,
          service_id: validatedData.service_id,
          booking_date: validatedData.booking_date,
          booking_time: validatedData.booking_time,
          status: 'pending'
        });

      if (error) {
        toast.error(t.error);
      } else {
        toast.success(t.bookingCreated);
        setBookingDialogOpen(false);
        navigate('/');
      }
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0]?.message || 'Validācijas kļūda');
      } else {
        toast.error(t.error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex items-center justify-center">
        <p className="text-muted-foreground">{t.loading}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary overflow-x-hidden">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="truncate">Atpakaļ</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl overflow-x-hidden">
        <Card className="shadow-card border-0 mb-4 overflow-hidden">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 mb-4">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-primary/20 flex-shrink-0">
                <AvatarImage src={professional.profiles?.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl sm:text-2xl">
                  {professional.profiles?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 break-words px-2 sm:px-0">
                  {professional.profiles?.name}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">{professional.category}</Badge>
                  {professional.is_verified && (
                    <Badge variant="default" className="text-xs whitespace-nowrap">{t.verified}</Badge>
                  )}
                </div>
                
                <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  {(professional.address || professional.city) && (
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="break-words max-w-full">
                        {professional.address && professional.city 
                          ? `${professional.address}, ${professional.city}`
                          : professional.address || professional.city
                        }
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Star className="w-4 h-4 fill-accent text-accent flex-shrink-0" />
                    <span>
                      {professional.rating || 0} ({professional.total_reviews || 0} {t.reviews})
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {professional.bio && (
              <div className="border-t pt-3 sm:pt-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">{t.bio}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm break-words">{professional.bio}</p>
              </div>
            )}
            
            {professional.latitude && professional.longitude && (
              <div className="border-t pt-3 sm:pt-4">
                <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Atrašanās vieta</h3>
                <div className="w-full overflow-hidden rounded-lg border" style={{ maxHeight: '220px' }}>
                  <LocationMap
                    latitude={professional.latitude}
                    longitude={professional.longitude}
                    address={professional.address}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 mb-4 overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">{t.services}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {services.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                Nav pieejamu pakalpojumu
              </p>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <Card key={service.id} className="border touch-ripple">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold mb-1 text-sm sm:text-base break-words">{service.name}</h4>
                          {service.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 break-words">
                              {service.description}
                            </p>
                          )}
                          <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
                            <span className="flex items-center gap-1 text-primary font-medium whitespace-nowrap">
                              <Euro className="w-3 h-3 sm:w-4 sm:h-4" />
                              {service.price}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              {service.duration} min
                            </span>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          className="w-full sm:w-auto flex-shrink-0"
                          onClick={() => {
                            setSelectedService(service);
                            setBookingDialogOpen(true);
                          }}
                        >
                          {t.bookNow}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">{t.reviews}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                Nav atsauksmju
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <Card key={review.id} className="border">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">{review.profiles?.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                  i < review.rating
                                    ? 'fill-accent text-accent'
                                    : 'text-muted'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(review.created_at).toLocaleDateString('lv-LV')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{t.bookNow}</DialogTitle>
          </DialogHeader>
          
          {selectedService && (
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-primary-soft rounded-lg">
                <h4 className="font-semibold text-sm sm:text-base break-words">{selectedService.name}</h4>
                <div className="flex gap-3 sm:gap-4 mt-2 text-xs sm:text-sm flex-wrap">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Euro className="w-3 h-3 sm:w-4 sm:h-4" />
                    {selectedService.price}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    {selectedService.duration} min
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">{t.date}</Label>
                <div className="w-full overflow-x-auto">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={setBookingDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border mx-auto"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm">{t.time}</Label>
                <Input
                  id="time"
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full text-base"
                  required
                />
              </div>
              
              <Button 
                onClick={handleBooking} 
                className="w-full"
                disabled={!bookingDate || !bookingTime}
              >
                {t.confirmBooking}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfessionalProfile;