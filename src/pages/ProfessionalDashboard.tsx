import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, LogOut, Plus, Euro, Clock, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { serviceSchema } from '@/lib/validation';

const ProfessionalDashboard = () => {
  const t = useTranslation('lv');
  const { user, signOut } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalEarnings: 0, completedBookings: 0 });
  const [loading, setLoading] = useState(true);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadServices();
      loadBookings();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!data && !error) {
      // Create professional profile if it doesn't exist
      const { data: newProfile, error: insertError } = await supabase
        .from('professional_profiles')
        .insert({
          user_id: user.id,
          category: 'Manikīrs',
          city: 'Rīga',
          bio: ''
        })
        .select()
        .single();
      
      if (!insertError && newProfile) {
        setProfile(newProfile);
        toast.success('Profesionālais profils izveidots! Lūdzu, atjauniniet savu informāciju.');
      }
    } else {
      setProfile(data);
    }
    
    setLoading(false);
  };

  const loadServices = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', profile.id);
    
    setServices(data || []);
  };

  const loadBookings = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        services(name, price),
        profiles!bookings_client_id_fkey(name, phone)
      `)
      .eq('professional_id', profile.id)
      .order('booking_date', { ascending: false });
    
    if (data) {
      setBookings(data);
      
      const completed = data.filter(b => b.status === 'completed');
      const earnings = completed.reduce((sum, b) => sum + (b.services?.price || 0), 0);
      
      setStats({
        totalEarnings: earnings,
        completedBookings: completed.length
      });
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) return;

    try {
      // Validate service data
      const validatedData = serviceSchema.parse({
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration),
        description: newService.description || undefined
      });

      const { error } = await supabase
        .from('services')
        .insert({
          professional_id: profile.id,
          name: validatedData.name,
          price: validatedData.price,
          duration: validatedData.duration,
          description: validatedData.description
        });
      
      if (error) {
        toast.error(t.error);
      } else {
        toast.success(t.serviceAdded);
        setServiceDialogOpen(false);
        setNewService({ name: '', price: '', duration: '', description: '' });
        loadServices();
      }
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0]?.message || 'Validācijas kļūda');
      } else {
        toast.error(t.error);
      }
    }
  };

  const handleBookingAction = async (bookingId: string, status: 'pending' | 'confirmed' | 'completed' | 'canceled') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);
    
    if (error) {
      toast.error(t.error);
    } else {
      toast.success(
        status === 'confirmed' ? t.bookingConfirmed :
        status === 'completed' ? t.bookingCompleted :
        t.bookingCanceled
      );
      loadBookings();
    }
  };

  useEffect(() => {
    if (profile) {
      loadServices();
      loadBookings();
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft to-secondary">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-soft">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BeautyOn
            </h1>
          </div>
          
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            {t.logout}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.totalEarnings}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-foreground">
                  {stats.totalEarnings.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.completedServices}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-foreground">
                  {stats.completedBookings}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.myServices}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-foreground">
                  {services.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/80 backdrop-blur-sm">
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              {t.bookings}
            </TabsTrigger>
            <TabsTrigger value="services">
              <Sparkles className="w-4 h-4 mr-2" />
              {t.myServices}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>{t.bookings}</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nav rezervāciju
                  </p>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold">{booking.profiles?.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {booking.services?.name}
                              </p>
                              <p className="text-sm mt-2">
                                {new Date(booking.booking_date).toLocaleDateString('lv-LV')} • {booking.booking_time}
                              </p>
                            </div>
                            
                            <Badge 
                              variant={
                                booking.status === 'confirmed' ? 'default' :
                                booking.status === 'completed' ? 'secondary' :
                                booking.status === 'canceled' ? 'destructive' : 'outline'
                              }
                            >
                              {t[booking.status as keyof typeof t] || booking.status}
                            </Badge>
                          </div>
                          
                          {booking.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                {t.confirmBooking}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleBookingAction(booking.id, 'canceled')}
                                className="flex-1"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                {t.cancelBooking}
                              </Button>
                            </div>
                          )}
                          
                          {booking.status === 'confirmed' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleBookingAction(booking.id, 'completed')}
                              className="w-full"
                            >
                              {t.completeBooking}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t.myServices}</CardTitle>
                <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {t.addService}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t.addService}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddService} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t.serviceName}</Label>
                        <Input
                          id="name"
                          value={newService.name}
                          onChange={(e) => setNewService({...newService, name: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">{t.servicePrice}</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={newService.price}
                            onChange={(e) => setNewService({...newService, price: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="duration">{t.serviceDuration}</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={newService.duration}
                            onChange={(e) => setNewService({...newService, duration: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">{t.serviceDescription}</Label>
                        <Textarea
                          id="description"
                          value={newService.description}
                          onChange={(e) => setNewService({...newService, description: e.target.value})}
                          rows={3}
                        />
                      </div>
                      
                      <Button type="submit" className="w-full">
                        {t.addService}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Jums vēl nav pievienotu pakalpojumu
                  </p>
                ) : (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <Card key={service.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{service.name}</h4>
                              {service.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {service.description}
                                </p>
                              )}
                              <div className="flex gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1 text-primary">
                                  <Euro className="w-4 h-4" />
                                  {service.price}
                                </span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  {service.duration} min
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfessionalDashboard;