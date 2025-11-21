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
import { Calendar, Search, Star, MapPin, Sparkles } from 'lucide-react';
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
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      initializeData();
      loadCategories();
    }
  }, [user]);

  useEffect(() => {
    // Real-time atjauninājums kategorijām
    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          loadCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCategories(data.map(cat => cat.name));
    }
  };

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
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-card/95 backdrop-blur-sm border-b sticky top-0 z-10 shadow-soft">
        <div className="max-w-screen-sm mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-center">BeautyOn</h1>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-6 overflow-x-hidden">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
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
            <Card className="shadow-card border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t.searchProfessionals}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

            <div className="grid grid-cols-1 gap-4">
              {filteredProfessionals.map((prof) => (
                <Card 
                  key={prof.id} 
                  className={`touch-ripple tap-feedback cursor-pointer border shadow-card overflow-hidden hover:shadow-elegant transition-shadow ${
                    prof.plan === 'premium' ? 'ring-2 ring-amber-400' : ''
                  }`}
                  onClick={() => navigate(`/professional/${prof.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-16 h-16 border-2 border-primary/20 flex-shrink-0">
                        <AvatarImage src={prof.profiles?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {prof.profiles?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {prof.profiles?.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-sm px-2.5 py-0.5 whitespace-nowrap">
                            {prof.category}
                          </Badge>
                          <PlanBadge 
                            plan={prof.plan} 
                            isVerified={prof.is_verified || false}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{prof.city}</span>
                        {prof.distance < 9999 && (
                          <span className="text-sm whitespace-nowrap flex-shrink-0">• {prof.distance} km</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-accent text-accent flex-shrink-0" />
                        <span className="truncate text-sm">{prof.rating || 0} ({prof.total_reviews || 0} {t.reviews})</span>
                      </div>
                    </div>
                    
                    {prof.bio && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {prof.bio}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card className="shadow-card border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t.bookings}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {bookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-base">
                    Jums vēl nav nevienas rezervācijas
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="border shadow-soft overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-base truncate">
                                  {booking.professional_profiles?.profiles?.name}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate mt-0.5">
                                  {booking.services?.name}
                                </p>
                              </div>
                              
                              <Badge 
                                variant={
                                  booking.status === 'confirmed' ? 'default' :
                                  booking.status === 'completed' ? 'secondary' :
                                  booking.status === 'canceled' ? 'destructive' : 'outline'
                                }
                                className="text-sm px-2.5 py-1 whitespace-nowrap flex-shrink-0"
                              >
                                {t[booking.status as keyof typeof t] || booking.status}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
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