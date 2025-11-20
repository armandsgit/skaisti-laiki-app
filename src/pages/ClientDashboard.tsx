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
import { Calendar, LogOut, Search, Star, MapPin, Sparkles, Map } from 'lucide-react';
import AllMastersMap from '@/components/AllMastersMap';
import { toast } from 'sonner';

const ClientDashboard = () => {
  const t = useTranslation('lv');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const categories = ['Manikīrs', 'Pedikīrs', 'Skropstas', 'Frizieris', 'Masāža', 'Kosmetoloģija'];

  useEffect(() => {
    if (user) {
      loadProfessionals();
      loadBookings();
    }
  }, [user]);

  const loadProfessionals = async () => {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, avatar)
      `)
      .eq('approved', true); // Tikai apstiprinātie meistari
    
    if (error) {
      toast.error(t.error);
    } else {
      setProfessionals(data || []);
    }
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary-soft to-secondary">
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-soft">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BeautyOn
            </h1>
          </div>
          
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Full Screen Map */}
      <div className="flex-1 relative">
        <AllMastersMap />
      </div>

      {/* Bottom Navigation */}
      <nav className="bg-card/95 backdrop-blur-sm border-t shadow-lg z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-around">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-col h-auto py-2"
            onClick={() => {
              const searchSection = document.getElementById('search-section');
              if (searchSection) searchSection.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Search className="w-5 h-5 mb-1 text-primary" />
            <span className="text-xs">Meklēt</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-col h-auto py-2"
            onClick={() => navigate('/bookings')}
          >
            <Calendar className="w-5 h-5 mb-1" />
            <span className="text-xs">Rezervācija</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-col h-auto py-2"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="w-5 h-5 mb-1">
              <AvatarImage src={user?.user_metadata?.avatar} />
              <AvatarFallback>
                {user?.user_metadata?.name?.[0] || user?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">Izvēlne</span>
          </Button>
        </div>
      </nav>

      {/* Hidden Search & Bookings Section - Scrollable */}
      <div className="hidden" id="search-section">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/80 backdrop-blur-sm">
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
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    {t.searchProfessionals}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder={t.searchByName}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t.selectCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allCategories}</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfessionals.map((prof) => (
                  <Card 
                    key={prof.id} 
                    className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-0 shadow-card"
                    onClick={() => navigate(`/professional/${prof.id}`)}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-soft">
                          <AvatarImage src={prof.profiles?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold">
                            {prof.profiles?.name?.[0] || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                            {prof.profiles?.name}
                          </h3>
                          <Badge variant="secondary" className="mt-1">
                            {prof.category}
                          </Badge>
                        </div>
                      </div>

                      {prof.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {prof.bio}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-medium">{prof.rating || 0}</span>
                        </div>
                        
                        {prof.address && (
                          <div className="flex items-center gap-1 text-muted-foreground truncate flex-1">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs truncate">{prof.address}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredProfessionals.length === 0 && (
                <Card className="border-0 shadow-card">
                  <CardContent className="p-12 text-center">
                    <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">{t.noProfessionalsFound}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6">
              {bookings.length === 0 ? (
                <Card className="border-0 shadow-card">
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">{t.noBookingsYet}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="border-0 shadow-card hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12 border-2 border-primary/20">
                            <AvatarImage src={booking.professional_profiles?.profiles?.avatar} />
                            <AvatarFallback>
                              {booking.professional_profiles?.profiles?.name?.[0] || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold truncate">
                                  {booking.professional_profiles?.profiles?.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {booking.services?.name}
                                </p>
                              </div>
                              <Badge 
                                variant={
                                  booking.status === 'confirmed' ? 'default' :
                                  booking.status === 'completed' ? 'secondary' :
                                  booking.status === 'canceled' ? 'destructive' :
                                  'outline'
                                }
                              >
                                {booking.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {booking.booking_date}
                              </div>
                              <span>{booking.booking_time}</span>
                              <span className="font-medium">€{booking.services?.price}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;