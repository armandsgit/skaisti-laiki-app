import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, LogOut, Search, Star, MapPin, Sparkles, Map, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';
import PlanBadge from '@/components/PlanBadge';


const ClientDashboard = () => {
  const t = useTranslation('lv');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [professionals, setProfessionals] = useState<SortedMaster[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const categories = ['Manikīrs', 'Pedikīrs', 'Skropstas', 'Frizieris', 'Masāža', 'Kosmetoloģija'];

  useEffect(() => {
    if (user) {
      initializeData();
    }
  }, [user]);

  const initializeData = async () => {
    // Iegūst lietotāja atrašanās vietu
    const location = await getUserLocation();
    setUserLocation(location);
    
    // Ielādē datus
    await Promise.all([loadProfessionals(location), loadBookings()]);
  };

  const loadProfessionals = async (location: { lat: number; lon: number }) => {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, avatar)
      `)
      .eq('approved', true)
      .eq('active', true);
    
    if (error) {
      toast.error(t.error);
      setLoading(false);
      return;
    }
    
    // Kārto meistarus pēc prioritātes
    const sortedMasters = getSortedMasters(data || [], location.lat, location.lon);
    setProfessionals(sortedMasters);
    setLoading(false);
  };

  const loadBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services(name, price),
        professional_profiles(
          profiles!professional_profiles_user_id_fkey(name, avatar)
        )
      `)
      .eq('client_id', user?.id)
      .order('booking_date', { ascending: false });
    
    if (!error && data) {
      setBookings(data);
    }
  };

  const filteredProfessionals = professionals.filter(prof => {
    const matchesSearch = prof.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prof.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || prof.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-soft flex-shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                BeautyOn
              </h1>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => navigate('/map')} className="px-2 sm:px-4">
                <Map className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline text-xs sm:text-sm">Skatīt kartē</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/client/settings')} className="px-2 sm:px-3">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="px-2 sm:px-3">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline text-xs sm:text-sm">{t.logout}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 bg-card/80 backdrop-blur-sm">
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              {t.searchProfessionals}
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              {t.bookings}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>{t.searchProfessionals}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 w-full">
                    <Input
                      placeholder={t.search}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder={t.filterByCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allCategories}</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredProfessionals.map((prof) => (
                <Card 
                  key={prof.id} 
                  className={`touch-ripple tap-feedback cursor-pointer border-0 overflow-hidden ${
                    prof.plan === 'premium' ? 'ring-2 ring-amber-400' : ''
                  }`}
                  onClick={() => navigate(`/professional/${prof.id}`)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3 mb-2">
                      <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-primary/20 flex-shrink-0">
                        <AvatarImage src={prof.profiles?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm sm:text-base">
                          {prof.profiles?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">
                          {prof.profiles?.name}
                        </h3>
                        <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 whitespace-nowrap">
                            {prof.category}
                          </Badge>
                          <PlanBadge 
                            plan={prof.plan} 
                            isVerified={prof.is_verified || false}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{prof.city}</span>
                        {prof.distance < 9999 && (
                          <span className="text-xs whitespace-nowrap flex-shrink-0">• {prof.distance} km</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-accent text-accent flex-shrink-0" />
                        <span className="truncate text-xs sm:text-sm">{prof.rating || 0} ({prof.total_reviews || 0} {t.reviews})</span>
                      </div>
                    </div>
                    
                    {prof.bio && (
                      <p className="mt-2 sm:mt-3 text-xs text-muted-foreground line-clamp-2">
                        {prof.bio}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-3 sm:space-y-4">
            <Card className="shadow-card border-0">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">{t.bookings}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {bookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">
                    Jums vēl nav nevienas rezervācijas
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="border overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">
                                  {booking.professional_profiles?.profiles?.name}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {booking.services?.name}
                                </p>
                              </div>
                              
                              <Badge 
                                variant={
                                  booking.status === 'confirmed' ? 'default' :
                                  booking.status === 'completed' ? 'secondary' :
                                  booking.status === 'canceled' ? 'destructive' : 'outline'
                                }
                                className="text-xs px-2 py-0.5 whitespace-nowrap flex-shrink-0"
                              >
                                {t[booking.status as keyof typeof t] || booking.status}
                              </Badge>
                            </div>
                            
                            <p className="text-xs">
                              {new Date(booking.booking_date).toLocaleDateString('lv-LV')} • {booking.booking_time}
                            </p>
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

export default ClientDashboard;