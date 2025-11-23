import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, LogOut, Plus, Euro, Clock, CheckCircle, XCircle, Sparkles, Edit, User, MapPin, Settings, LayoutDashboard, CalendarDays, TrendingUp, Bell, Trash2, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LoadingAnimation from '@/components/LoadingAnimation';
import EmptyStateAnimation from '@/components/EmptyStateAnimation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationMap from '@/components/LocationMap';
import EditableLocationMap from '@/components/EditableLocationMap';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { toast } from 'sonner';
import { serviceSchema } from '@/lib/validation';
import SubscriptionStatusIndicator from '@/components/SubscriptionStatusIndicator';
import WorkScheduleManager from '@/components/WorkScheduleManager';
import StaffMemberManager from '@/components/StaffMemberManager';
import { DashboardStats } from '@/components/DashboardStats';
import { UpcomingBookingCard } from '@/components/UpcomingBookingCard';
import { ServiceCard } from '@/components/ServiceCard';
import { QuickActionButton } from '@/components/QuickActionButton';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, startOfMonth, endOfMonth, addDays, startOfWeek } from 'date-fns';
import { lv } from 'date-fns/locale';

const ProfessionalDashboard = () => {
  const t = useTranslation('lv');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedStaffMember, setSelectedStaffMember] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    totalEarnings: 0, 
    completedBookings: 0,
    todayEarnings: 0,
    todayBookings: 0,
    monthlyEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editProfessionalInfoOpen, setEditProfessionalInfoOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '60',
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
    address: '',
    latitude: null as number | null,
    longitude: null as number | null
  });
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadCategories();
    }
  }, [user]);

  // Handle tab query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'bookings', 'services', 'schedule'].includes(tabParam)) {
      setSelectedTab(tabParam);
    } else {
      // Reset to dashboard when no tab parameter
      setSelectedTab('dashboard');
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile) {
      loadServices();
      loadBookings();
      loadStaffMembers();
    }
  }, [profile]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('display_order');
    
    if (data) {
      setCategories(data);
    }
  };

  const loadProfile = async () => {
    if (!user?.id) return;
    
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
    
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!data && !error) {
      const { data: newProfile } = await supabase
        .from('professional_profiles')
        .insert({
          user_id: user.id,
          category: 'Manikīrs',
          city: 'Rīga',
          bio: ''
        })
        .select()
        .single();
      
      if (newProfile) {
        setProfile(newProfile);
        setEditedProfInfo({
          bio: '',
          category: 'Manikīrs',
          city: 'Rīga',
          address: '',
          latitude: null,
          longitude: null
        });
        toast.success('Profesionālais profils izveidots!');
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

  const loadStaffMembers = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('staff_members')
      .select('*')
      .eq('professional_id', profile.id)
      .eq('is_active', true)
      .order('name');
    
    setStaffMembers(data || []);
  };

  const loadBookings = async () => {
    if (!profile?.id) return;
    
    // Get date 30 days ago for completed bookings filter
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        services(name, price),
        profiles!bookings_client_id_fkey(name, phone, email),
        staff_members(name, avatar)
      `)
      .eq('professional_id', profile.id)
      .or(`status.neq.completed,and(status.eq.completed,booking_date.gte.${thirtyDaysAgoStr})`)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });
    
    if (data) {
      setBookings(data);
      
      const completed = data.filter(b => b.status === 'completed');
      const earnings = completed.reduce((sum, b) => sum + (b.services?.price || 0), 0);
      
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = data.filter(b => b.booking_date === today);
      const todayCompleted = todayBookings.filter(b => b.status === 'completed');
      const todayEarnings = todayCompleted.reduce((sum, b) => sum + (b.services?.price || 0), 0);
      
      const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
      const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];
      const monthlyBookings = data.filter(b => b.booking_date >= monthStart && b.booking_date <= monthEnd);
      const monthlyCompleted = monthlyBookings.filter(b => b.status === 'completed');
      const monthlyEarnings = monthlyCompleted.reduce((sum, b) => sum + (b.services?.price || 0), 0);
      
      setStats({
        totalEarnings: earnings,
        completedBookings: completed.length,
        todayEarnings,
        todayBookings: todayBookings.length,
        monthlyEarnings
      });
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) return;

    try {
      const validatedData = serviceSchema.parse({
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration),
        description: newService.description || undefined
      });

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: validatedData.name,
            price: validatedData.price,
            duration: validatedData.duration,
            description: validatedData.description
          })
          .eq('id', editingService.id);

        if (!error) {
          toast.success('Pakalpojums atjaunināts!');
          setServiceDialogOpen(false);
          setEditingService(null);
          setNewService({ name: '', price: '', duration: '60', description: '' });
          loadServices();
        } else {
          toast.error(t.error);
        }
      } else {
        const { error } = await supabase
          .from('services')
          .insert({
            professional_id: profile.id,
            name: validatedData.name,
            price: validatedData.price,
            duration: validatedData.duration,
            description: validatedData.description
          });
        
        if (!error) {
          toast.success(t.serviceAdded);
          setServiceDialogOpen(false);
          setNewService({ name: '', price: '', duration: '60', description: '' });
          loadServices();
        } else {
          toast.error(t.error);
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

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo pakalpojumu?')) return;
    
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (!error) {
      toast.success('Pakalpojums dzēsts!');
      loadServices();
    } else {
      toast.error(t.error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Attēls ir par lielu. Maksimālais izmērs: 5MB');
      return;
    }

    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      setEditedProfile({ ...editedProfile, avatar: data.publicUrl });
      toast.success('Attēls augšupielādēts!');
    } catch (error: any) {
      toast.error('Kļūda augšupielādējot attēlu: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
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

    if (!error) {
      toast.success('Profils atjaunināts!');
      setEditProfileDialogOpen(false);
      loadProfile();
    } else {
      toast.error('Kļūda atjauninot profilu');
    }
  };

  const handleUpdateProfessionalInfo = async () => {
    if (!profile?.id) return;

    const fullAddress = editedProfInfo.address.trim();

    if (!fullAddress || !editedProfInfo.city) {
      toast.error('Lūdzu, aizpildiet pilsētu un adresi');
      return;
    }

    if (!editedProfInfo.latitude || !editedProfInfo.longitude) {
      toast.error('Lūdzu, atzīmējiet atrašanās vietu kartē');
      return;
    }

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

    if (!error) {
      toast.success('Informācija atjaunināta!');
      setEditProfessionalInfoOpen(false);
      await loadProfile();
    } else {
      toast.error(`Kļūda atjauninot informāciju: ${error.message}`);
    }
  };

  const handleBookingAction = async (bookingId: string, status: 'pending' | 'confirmed' | 'completed' | 'canceled') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);
    
    if (!error) {
      toast.success(
        status === 'confirmed' ? t.bookingConfirmed :
        status === 'completed' ? t.bookingCompleted :
        t.bookingCanceled
      );
      loadBookings();
    } else {
      toast.error(t.error);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Vai tiešām vēlaties dzēst šo rezervāciju?')) return;
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);
    
    if (!error) {
      toast.success('Rezervācija dzēsta!');
      loadBookings();
    } else {
      toast.error('Kļūda dzēšot rezervāciju');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user?.id) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    setUploadingImage(true);
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);
      
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
      const currentGallery = profile?.gallery || [];
      const updatedGallery = currentGallery.filter((url: string) => url !== imageUrl);
      
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({ gallery: updatedGallery })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
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

  const getUpcomingBookings = () => {
    return bookings
      .filter(b => {
        const bookingDate = new Date(b.booking_date);
        return bookingDate >= new Date() && (b.status === 'pending' || b.status === 'confirmed');
      })
      .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
      .slice(0, 3);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation size={100} text={t.loading} />
      </div>
    );
  }

  if (profile && profile.subscription_status !== 'active') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-card border-border/50">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-background stroke-[2]" />
            </div>
            <CardTitle className="text-3xl mb-2">
              Lai turpinātu un kļūtu redzams klientiem
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Izvēlies sev piemērotu abonēšanas plānu
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/subscription-plans'}
              className="w-full max-w-md mx-auto"
            >
              Izvēlēties plānu
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Bez aktīva abonēšanas plāna tavs profils nav redzams klientiem
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingBookings = getUpcomingBookings();

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border/30 sticky top-0 z-10 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
              <span className="text-white text-lg font-bold tracking-tight">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                BeautyOn
              </h1>
              <p className="text-xs text-muted-foreground">Meistara panelis</p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5 stroke-[1.5]" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Approval Status */}
        {!profile.approved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="mb-6 border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-warning/10">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold">Profils gaida apstiprināšanu</p>
                    <p className="text-sm text-muted-foreground">
                      Pēc apstiprināšanas būsi redzams klientiem
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs value={selectedTab} onValueChange={(value) => {
          setSelectedTab(value);
          // Update URL when tab changes
          if (value === 'dashboard') {
            navigate('/professional', { replace: true });
          } else {
            navigate(`/professional?tab=${value}`, { replace: true });
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden sm:inline">Galvenā</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden sm:inline">Rezervācijas</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Sparkles className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden sm:inline">Pakalpojumi</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <CalendarDays className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden sm:inline">Grafiks</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Stats */}
            <DashboardStats
              todayEarnings={stats.todayEarnings}
              monthlyEarnings={stats.monthlyEarnings}
              todayBookings={stats.todayBookings}
              completedServices={stats.completedBookings}
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <QuickActionButton
                icon={Plus}
                label="Pievienot pakalpojumu"
                onClick={() => {
                  setEditingService(null);
                  setNewService({ name: '', price: '', duration: '', description: '' });
                  setServiceDialogOpen(true);
                }}
              />
              <QuickActionButton
                icon={CalendarDays}
                label="Rediģēt grafiku"
                onClick={() => setSelectedTab('schedule')}
                variant="secondary"
              />
              <QuickActionButton
                icon={Calendar}
                label="Rezervācijas"
                onClick={() => setSelectedTab('bookings')}
                variant="secondary"
              />
            </div>

            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Tuvākās rezervācijas</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTab('bookings')}>
                    Skatīt visas
                  </Button>
                </div>
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <UpcomingBookingCard
                      key={booking.id}
                      booking={booking}
                      onClick={() => setSelectedTab('bookings')}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Rezervācijas</h2>
              <Badge variant="outline">
                {bookings.length} kopā
              </Badge>
            </div>

            {bookings.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-12">
                  <EmptyStateAnimation size={120} />
                  <p className="text-center text-muted-foreground mt-4">Nav rezervāciju</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Active Bookings Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Gaidāmās rezervācijas</h3>
                  {bookings.filter(b => b.status !== 'completed').length > 0 ? (
                    bookings.filter(b => b.status !== 'completed').map((booking) => (
                      <Card 
                        key={booking.id}
                        className="hover:shadow-lg transition-all duration-300 border-l-4 bg-white border-border/50 shadow-card"
                        style={{
                          borderLeftColor: 
                            booking.status === 'pending' ? '#f59e0b' :
                            booking.status === 'confirmed' ? '#10b981' :
                            '#ef4444'
                        }}
                      >
                        <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-lg">{booking.profiles.name}</p>
                          </div>
                          <div className="space-y-1 mt-1">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-muted-foreground break-all">
                                {booking.profiles.email || 'Nav e-pasta'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              📱 {booking.profiles.phone || 'Nav telefona'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            booking.status === 'confirmed' ? 'default' :
                            booking.status === 'completed' ? 'outline' :
                            booking.status === 'canceled' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {booking.status === 'pending' && 'Gaida'}
                          {booking.status === 'confirmed' && 'Apstiprināts'}
                          {booking.status === 'completed' && 'Pabeigts'}
                          {booking.status === 'canceled' && 'Atcelts'}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{format(new Date(booking.booking_date), 'dd.MM.yyyy', { locale: lv })}</span>
                          <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                          <span>{booking.booking_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Sparkles className="w-4 h-4 text-muted-foreground" />
                          <span>{booking.services.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>Meistars: {booking.staff_members?.name || 'Nav norādīts'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-primary" />
                          <span className="font-bold text-primary">€{booking.services.price}</span>
                        </div>
                      </div>

                      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Piezīme:</strong> {booking.notes || 'Nav piezīmju'}
                        </p>
                      </div>

                      {booking.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleBookingAction(booking.id, 'confirmed')}
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-1 stroke-[2]" />
                            Apstiprināt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBookingAction(booking.id, 'canceled')}
                            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-4 h-4 mr-1 stroke-[2]" />
                            Atcelt
                          </Button>
                        </div>
                      )}

                      {booking.status === 'confirmed' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleBookingAction(booking.id, 'completed')}
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-1 stroke-[2]" />
                            Atzīmēt kā pabeigtu
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBookingAction(booking.id, 'canceled')}
                            className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-4 h-4 mr-1 stroke-[2]" />
                            Atcelt
                          </Button>
                        </div>
                      )}

                          {booking.status === 'canceled' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="w-full"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Dzēst rezervāciju
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-8 border-0 shadow-card">
                      <p className="text-center text-muted-foreground">
                        Nav gaidāmo rezervāciju
                      </p>
                    </Card>
                  )}
                </div>

                {/* Completed Bookings Section - Collapsible */}
                {bookings.filter(b => b.status === 'completed').length > 0 && (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-muted-foreground">
                          Pabeigtās rezervācijas
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {bookings.filter(b => b.status === 'completed').length}
                        </Badge>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                          showCompleted ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>

                    {showCompleted && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        {bookings.filter(b => b.status === 'completed').map((booking) => (
                          <Card 
                            key={booking.id}
                            className="opacity-60 hover:opacity-80 transition-all duration-200 border-l-4 bg-muted/30 border-0 shadow-card"
                            style={{ borderLeftColor: '#6b7280' }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-lg text-muted-foreground">
                                      {booking.profiles.name}
                                    </p>
                                  </div>
                                  <div className="space-y-1 mt-1">
                                    <div className="flex items-start gap-2">
                                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-muted-foreground break-all">
                                        {booking.profiles.email || 'Nav e-pasta'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      📱 {booking.profiles.phone || 'Nav telefona'}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  Pabeigts
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-medium">Pakalpojums:</span>{' '}
                                  {booking.services?.name}
                                </p>
                                
                                {booking.staff_members && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Meistars:</span>
                                    <div className="flex items-center gap-2">
                                      {booking.staff_members.avatar && (
                                        <img 
                                          src={booking.staff_members.avatar} 
                                          alt={booking.staff_members.name}
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                      )}
                                      <span className="text-sm text-muted-foreground">
                                        {booking.staff_members.name}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <p className="text-sm">
                                  <span className="font-medium">Datums:</span>{' '}
                                  {format(new Date(booking.booking_date), 'dd.MM.yyyy', { locale: lv })}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Laiks:</span>{' '}
                                  {booking.booking_time.slice(0, 5)} - {booking.booking_end_time?.slice(0, 5)}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Cena:</span> €{booking.services?.price}
                                </p>
                                {booking.notes && (
                                  <p className="text-sm">
                                    <span className="font-medium">Piezīmes:</span> {booking.notes}
                                  </p>
                                )}
                              </div>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="w-full mt-4"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Dzēst rezervāciju
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Mani pakalpojumi</h2>
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
      setEditingService(null);
      setNewService({ name: '', price: '', duration: '60', description: '' });
    }}
                    className="bg-black text-white border-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Pievienot pakalpojumu
                  </Button>
                </DialogTrigger>
                <DialogContent className="flex flex-col max-sm:p-0">
                  {/* Header - Fixed on mobile */}
                  <DialogHeader className="max-sm:sticky max-sm:top-0 max-sm:z-10 max-sm:bg-background max-sm:p-6 max-sm:pb-4 max-sm:border-b">
                    <DialogTitle className="text-xl">
                      {editingService ? 'Labot pakalpojumu' : 'Pievienot pakalpojumu'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Scrollable Content */}
                  <form onSubmit={handleAddService} className="flex flex-col flex-1 max-sm:h-full">
                    <div className="flex-1 overflow-y-auto max-sm:px-6 max-sm:py-4 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">Pakalpojuma nosaukums</Label>
                        <Input
                          id="name"
                          value={newService.name}
                          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                          placeholder="Piemēram: Manikīrs"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">Cena (€)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={newService.price}
                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                            placeholder="25.00"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">Ilgums (min)</Label>
                          <Select
                            value={newService.duration}
                            onValueChange={(value) => setNewService({ ...newService, duration: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Izvēlieties ilgumu" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="20">20 min</SelectItem>
                              <SelectItem value="30">30 min</SelectItem>
                              <SelectItem value="40">40 min</SelectItem>
                              <SelectItem value="50">50 min</SelectItem>
                              <SelectItem value="60">60 min</SelectItem>
                              <SelectItem value="90">90 min</SelectItem>
                              <SelectItem value="120">120 min</SelectItem>
                              <SelectItem value="150">150 min</SelectItem>
                              <SelectItem value="180">180 min</SelectItem>
                              <SelectItem value="240">240 min (4h)</SelectItem>
                              <SelectItem value="300">300 min (5h)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Apraksts</Label>
                        <Textarea
                          id="description"
                          value={newService.description}
                          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                          placeholder="Pakalpojuma apraksts..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                    </div>
                    
                    {/* Submit Button - Sticky on mobile */}
                    <div className="max-sm:sticky max-sm:bottom-0 max-sm:bg-background max-sm:p-6 max-sm:pt-4 max-sm:border-t sm:mt-6">
                      <Button type="submit" className="w-full bg-black text-white border-0 h-12">
                        {editingService ? 'Saglabāt izmaiņas' : 'Pievienot pakalpojumu'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {services.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-12">
                  <EmptyStateAnimation size={120} />
                  <p className="text-center text-muted-foreground mt-4">Nav pakalpojumu</p>
                  <p className="text-center text-muted-foreground text-sm">
                    Pievienojiet savus pakalpojumus, lai klienti varētu rezervēt laiku
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onEdit={handleEditService}
                    onDelete={handleDeleteService}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-2">Darba grafiks</h2>
              <p className="text-sm text-muted-foreground">
                Pārvaldiet savus meistarus un viņu darba grafikus
              </p>
            </div>
            
            <StaffMemberManager
              professionalId={profile.id}
              selectedStaffMemberId={selectedStaffMember}
              onSelectStaffMember={(staffId) => {
                setSelectedStaffMember(staffId);
              }}
            />

            {selectedStaffMember ? (
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedStaffMember(null)}
                  className="mb-4"
                >
                  ← Atpakaļ
                </Button>
                <WorkScheduleManager
                  professionalId={profile.id}
                  staffMemberId={selectedStaffMember}
                />
              </div>
            ) : (
              <>
                {/* Owner's own schedule */}
                <div className="mb-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">Tavs darba grafiks</h3>
                    <p className="text-sm text-muted-foreground">
                      Iestatiet savu personīgo darba laiku
                    </p>
                  </div>
                  <WorkScheduleManager professionalId={profile.id} staffMemberId={null} />
                </div>

                {/* Staff members section */}
                {staffMembers.length > 0 && (
                  <div className="mt-8 pt-8 border-t">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Darbinieku grafiki</h3>
                      <p className="text-sm text-muted-foreground">
                        Izvēlieties darbinieku, lai pārvaldītu viņa darba grafiku
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfessionalDashboard;
