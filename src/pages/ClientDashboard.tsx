import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar, Search, Star, MapPin, Sparkles, LogOut } from 'lucide-react';
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
      {/* Header - Fresha style */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-screen-lg mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">BeautyOn</h1>
          <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-5 py-8 overflow-x-hidden">
        <div className="w-full space-y-8">
          {/* Search Section - Fresha style */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Atrodi savu meistaru</h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Meklēt pēc nosaukuma vai apraksta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 text-base rounded-2xl border-border/50"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[220px] h-14 rounded-2xl border-border/50">
                  <SelectValue placeholder="Visi pakalpojumi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visi pakalpojumi</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Professional Cards - Fresha style */}
          <div className="grid grid-cols-1 gap-5">
            {filteredProfessionals.map((prof) => (
              <Card 
                key={prof.id} 
                className="cursor-pointer border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-200 overflow-hidden rounded-2xl"
                onClick={() => navigate(`/professional/${prof.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="w-20 h-20 border-2 border-border flex-shrink-0 rounded-2xl">
                      <AvatarImage src={prof.profiles?.avatar} className="object-cover" />
                      <AvatarFallback className="bg-primary/5 text-primary text-xl font-semibold rounded-2xl">
                        {prof.profiles?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="font-bold text-xl text-foreground mb-1 truncate">
                          {prof.profiles?.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-sm px-3 py-1 rounded-full font-medium">
                            {prof.category}
                          </Badge>
                          {prof.is_verified && (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs px-2 py-0.5 rounded-full">
                              Verificēts
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-sm">
                        {(prof.rating > 0 || prof.total_reviews > 0) && (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 fill-accent text-accent" />
                            <span className="font-semibold text-foreground">{prof.rating?.toFixed(1) || '0.0'}</span>
                            <span className="text-muted-foreground">({prof.total_reviews || 0} atsauksmes)</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{prof.city}</span>
                          {prof.distance < 9999 && (
                            <span>• {prof.distance} km</span>
                          )}
                        </div>
                      </div>
                      
                      {prof.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-2">
                          {prof.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
  
  export default ClientDashboard;