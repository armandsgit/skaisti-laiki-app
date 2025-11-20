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
      <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm z-20 flex-shrink-0">
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
      <div className="flex-1 min-h-0 relative">
        <AllMastersMap />
      </div>

      {/* Bottom Navigation */}
      <nav className="bg-card/95 backdrop-blur-sm border-t shadow-lg z-20 flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-around max-w-md mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-col h-auto py-2 gap-1"
            >
              <Search className="w-5 h-5 text-primary" />
              <span className="text-xs">Meklēt</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-col h-auto py-2 gap-1"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs">Rezervācija</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-col h-auto py-2 gap-1"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={user?.user_metadata?.avatar} />
                <AvatarFallback className="text-xs">
                  {user?.user_metadata?.name?.[0] || user?.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">Izvēlne</span>
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default ClientDashboard;