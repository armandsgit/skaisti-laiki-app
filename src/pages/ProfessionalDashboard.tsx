import { useEffect, useState, useRef } from 'react';
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
import { Calendar, LogOut, Plus, Euro, Clock, CheckCircle, XCircle, Sparkles, Edit, User, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationMap from '@/components/LocationMap';
import EditableLocationMap from '@/components/EditableLocationMap';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { CityAutocomplete } from '@/components/CityAutocomplete';
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editProfessionalInfoOpen, setEditProfessionalInfoOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '',
    description: ''
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    phone: '',
    avatar: ''
  });
  const [editedProfInfo, setEditedProfInfo] = useState({
    bio: '',
    category: '',
    city: '',
    address: '', // Full address with street number
    latitude: null as number | null,
    longitude: null as number | null
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
    
    // Load user profile
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setUserProfile(userData);
    setEditedProfile({
      name: userData?.name || '',
      phone: userData?.phone || '',
      avatar: userData?.avatar || ''
    });
    
    // Load professional profile
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
        setEditedProfInfo({
          bio: '',
          category: 'Manikīrs',
          city: 'Rīga',
          address: '',
          latitude: null,
          longitude: null
        });
        toast.success('Profesionālais profils izveidots! Lūdzu, atjauniniet savu informāciju.');
      }
    } else {
      setProfile(data);
      setEditedProfInfo({
        bio: data?.bio || '',
        category: data?.category || '',
        city: data?.city || '',
        address: data?.address || '',
        latitude: data?.latitude || null,
        longitude: data?.longitude || null
      });
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

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update({
            name: validatedData.name,
            price: validatedData.price,
            duration: validatedData.duration,
            description: validatedData.description
          })
          .eq('id', editingService.id);

        if (error) {
          toast.error(t.error);
        } else {
          toast.success('Pakalpojums atjaunināts!');
          setServiceDialogOpen(false);
          setEditingService(null);
          setNewService({ name: '', price: '', duration: '', description: '' });
          loadServices();
        }
      } else {
        // Add new service
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
      }
    } catch (error: any) {
      if (error.errors) {
        toast.error(error.errors[0]?.message || 'Validācijas kļūda');
      } else {
        toast.error(t.error);
      }
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setNewService({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString(),
      description: service.description || ''
    });
    setServiceDialogOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        name: editedProfile.name,
        phone: editedProfile.phone,
        avatar: editedProfile.avatar
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Kļūda atjauninot profilu');
    } else {
      toast.success('Profils atjaunināts!');
      setEditProfileDialogOpen(false);
      loadProfile();
    }
  };

  const handleUpdateProfessionalInfo = async () => {
    if (!profile?.id) return;

    const fullAddress = editedProfInfo.address.trim();

    // Validate required fields
    if (!fullAddress || !editedProfInfo.city) {
      toast.error('Lūdzu, aizpildiet pilsētu un adresi');
      return;
    }

    // Validate coordinates
    if (!editedProfInfo.latitude || !editedProfInfo.longitude) {
      toast.error('Lūdzu, atzīmējiet atrašanās vietu kartē');
      return;
    }

    // Update with manually selected coordinates
    const { error } = await supabase
      .from('professional_profiles')
      .update({
        bio: editedProfInfo.bio,
        category: editedProfInfo.category as any,
        city: editedProfInfo.city,
        address: fullAddress,
        latitude: editedProfInfo.latitude,
        longitude: editedProfInfo.longitude
      })
      .eq('id', profile.id);

    if (error) {
      console.error('Update error:', error);
      toast.error(`Kļūda atjauninot informāciju: ${error.message}`);
    } else {
      toast.success('Informācija atjaunināta!');
      setEditProfessionalInfoOpen(false);
      await loadProfile();
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

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo pakalpojumu?')) return;
    
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      toast.error(t.error);
    } else {
      toast.success('Pakalpojums dzēsts!');
      loadServices();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user?.id) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    setUploadingImage(true);
    
    try {
      // Augšupielādē bildi
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Iegūst publisko URL
      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);
      
      // Atjaunina profilu ar jauno bildi galerijā
      const currentGallery = profile?.gallery || [];
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({ gallery: [...currentGallery, publicUrl] })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      toast.success('Bilde pievienota!');
      loadProfile();
    } catch (error: any) {
      toast.error('Kļūda augšupielādējot bildi: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo bildi?') || !user?.id) return;
    
    try {
      // Izņem bildi no galerijas masīva
      const currentGallery = profile?.gallery || [];
      const updatedGallery = currentGallery.filter((url: string) => url !== imageUrl);
      
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({ gallery: updatedGallery })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      // Dzēš bildi no storage (ja tā ir mūsu storage)
      if (imageUrl.includes('gallery')) {
        const path = imageUrl.split('/gallery/').pop();
        if (path) {
          await supabase.storage.from('gallery').remove([path]);
        }
      }
      
      toast.success('Bilde dzēsta!');
      loadProfile();
    } catch (error: any) {
      toast.error('Kļūda dzēšot bildi: ' + error.message);
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
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-card/80 backdrop-blur-sm">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profils
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              {t.bookings}
            </TabsTrigger>
            <TabsTrigger value="services">
              <Sparkles className="w-4 h-4 mr-2" />
              {t.myServices}
            </TabsTrigger>
            <TabsTrigger value="gallery">
              <Plus className="w-4 h-4 mr-2" />
              Galerija
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-card border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Lietotāja profils</CardTitle>
                  <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Labot
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Labot profilu</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Vārds</Label>
                          <Input
                            id="name"
                            value={editedProfile.name}
                            onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefons</Label>
                          <Input
                            id="phone"
                            value={editedProfile.phone}
                            onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="avatar">Avatara URL</Label>
                          <Input
                            id="avatar"
                            value={editedProfile.avatar}
                            onChange={(e) => setEditedProfile({...editedProfile, avatar: e.target.value})}
                          />
                        </div>
                        <Button onClick={handleUpdateProfile} className="w-full">
                          Saglabāt izmaiņas
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                      <AvatarFallback>{userProfile?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{userProfile?.name}</p>
                      <p className="text-sm text-muted-foreground">{userProfile?.phone || 'Nav telefona'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Profesionālā informācija</CardTitle>
                  <Dialog open={editProfessionalInfoOpen} onOpenChange={setEditProfessionalInfoOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Labot
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Labot profesionālo informāciju</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Kategorija</Label>
                          <Select
                            value={editedProfInfo.category}
                            onValueChange={(value) => setEditedProfInfo({...editedProfInfo, category: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Manikīrs">Manikīrs</SelectItem>
                              <SelectItem value="Pedikīrs">Pedikīrs</SelectItem>
                              <SelectItem value="Skropstas">Skropstas</SelectItem>
                              <SelectItem value="Frizieris">Frizieris</SelectItem>
                              <SelectItem value="Masāža">Masāža</SelectItem>
                              <SelectItem value="Kosmetoloģija">Kosmetoloģija</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Pilsēta</Label>
                          <CityAutocomplete
                            value={editedProfInfo.city}
                            onChange={(value) => setEditedProfInfo({...editedProfInfo, city: value})}
                            placeholder="Sāciet rakstīt pilsētas nosaukumu..."
                          />
                          <p className="text-xs text-muted-foreground">
                            Izvēlieties pilsētu no ieteikumiem
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Pilna adrese (iela un mājas numurs)</Label>
                          <Input
                            id="address"
                            value={editedProfInfo.address}
                            onChange={(e) => setEditedProfInfo({...editedProfInfo, address: e.target.value})}
                            placeholder="Piemēram: Latgales iela 245"
                          />
                          <p className="text-xs text-muted-foreground">
                            Ievadiet pilnu adresi ar ielas nosaukumu un mājas numuru
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            value={editedProfInfo.bio}
                            onChange={(e) => setEditedProfInfo({...editedProfInfo, bio: e.target.value})}
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Atzīmējiet atrašanās vietu kartē</Label>
                          <EditableLocationMap
                            latitude={editedProfInfo.latitude}
                            longitude={editedProfInfo.longitude}
                            onLocationChange={(lat, lng) => {
                              setEditedProfInfo({
                                ...editedProfInfo,
                                latitude: lat,
                                longitude: lng
                              });
                            }}
                          />
                        </div>
                        <Button onClick={handleUpdateProfessionalInfo} className="w-full">
                          Saglabāt izmaiņas
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Kategorija</p>
                    <Badge variant="secondary">{profile?.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pilsēta</p>
                    <p className="font-medium">{profile?.city}</p>
                  </div>
                  {profile?.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">Adrese</p>
                      <p className="font-medium">{profile.address}</p>
                    </div>
                  )}
                  {profile?.bio && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bio</p>
                      <p className="text-sm">{profile.bio}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {profile?.latitude && profile?.longitude && (
              <Card className="shadow-card border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Atrašanās vieta kartē
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LocationMap
                    key={`${profile.latitude}-${profile.longitude}`}
                    latitude={profile.latitude}
                    longitude={profile.longitude}
                    address={profile.address}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

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
                <Dialog open={serviceDialogOpen} onOpenChange={(open) => {
                  setServiceDialogOpen(open);
                  if (!open) {
                    setEditingService(null);
                    setNewService({ name: '', price: '', duration: '', description: '' });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {t.addService}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingService ? 'Labot pakalpojumu' : t.addService}</DialogTitle>
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
                        {editingService ? 'Saglabāt izmaiņas' : t.addService}
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
                            <div className="flex-1">
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
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditService(service)}
                                className="text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteService(service.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
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
          
          <TabsContent value="gallery" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Mana galerija</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                        <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          {uploadingImage ? 'Augšupielādē...' : 'Klikšķiniet, lai pievienotu bildi'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WEBP līdz 5MB
                        </p>
                      </div>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </Label>
                  </div>
                  
                  {profile?.gallery && profile.gallery.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {profile.gallery.map((imageUrl: string, index: number) => (
                        <div key={index} className="relative group aspect-square">
                          <img
                            src={imageUrl}
                            alt={`Galerijas bilde ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteImage(imageUrl)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Jums vēl nav pievienotu bilžu galerijā
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfessionalDashboard;