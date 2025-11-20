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

    const { error } = await supabase
      .from('bookings')
      .insert({
        client_id: user.id,
        professional_id: id,
        service_id: selectedService.id,
        booking_date: bookingDate.toISOString().split('T')[0],
        booking_time: bookingTime,
        status: 'pending'
      });

    if (error) {
      toast.error(t.error);
    } else {
      toast.success(t.bookingCreated);
      setBookingDialogOpen(false);
      navigate('/');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atpakaļ
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-card border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6 mb-6">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={professional.profiles?.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {professional.profiles?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {professional.profiles?.name}
                    </h1>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary">{professional.category}</Badge>
                      {professional.is_verified && (
                        <Badge variant="default">{t.verified}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  {professional.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{professional.city}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span>
                      {professional.rating || 0} ({professional.total_reviews || 0} {t.reviews})
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {professional.bio && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">{t.bio}</h3>
                <p className="text-muted-foreground">{professional.bio}</p>
              </div>
            )}
            
            {professional.latitude && professional.longitude && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Atrašanās vieta</h3>
                <LocationMap
                  latitude={professional.latitude}
                  longitude={professional.longitude}
                  address={professional.address}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 mb-6">
          <CardHeader>
            <CardTitle>{t.services}</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nav pieejamu pakalpojumu
              </p>
            ) : (
              <div className="space-y-4">
                {services.map((service) => (
                  <Card key={service.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {service.description}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm">
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Euro className="w-4 h-4" />
                              {service.price}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {service.duration} min
                            </span>
                          </div>
                        </div>
                        
                        <Button
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

        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle>{t.reviews}</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nav atsauksmju
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{review.profiles?.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-accent text-accent'
                                    : 'text-muted'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('lv-LV')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.bookNow}</DialogTitle>
          </DialogHeader>
          
          {selectedService && (
            <div className="space-y-4">
              <div className="p-4 bg-primary-soft rounded-lg">
                <h4 className="font-semibold">{selectedService.name}</h4>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    {selectedService.price}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedService.duration} min
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t.date}</Label>
                <Calendar
                  mode="single"
                  selected={bookingDate}
                  onSelect={setBookingDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">{t.time}</Label>
                <Input
                  id="time"
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
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