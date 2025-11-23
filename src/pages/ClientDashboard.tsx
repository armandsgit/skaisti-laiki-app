import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Star, MapPin, Briefcase, ChevronRight, Map, User } from 'lucide-react';
import { toast } from 'sonner';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';

const ClientDashboard = () => {
  const t = useTranslation('lv');
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [professionals, setProfessionals] = useState<SortedMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      initializeData();
      loadCategories();
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    
    if (data) setProfile(data);
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  };

  const initializeData = async () => {
    const location = await getUserLocation();
    setUserLocation(location);
    await loadProfessionals(location);
  };

  const loadProfessionals = async (location: { lat: number; lon: number }) => {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, avatar)
      `)
      .eq('approved', true)
      .eq('active', true)
      .eq('is_blocked', false);
    
    if (error) {
      toast.error(t.error);
      setLoading(false);
      return;
    }
    
    const sortedMasters = getSortedMasters(data || [], location.lat, location.lon);
    setProfessionals(sortedMasters);
    setLoading(false);
  };

  const filteredProfessionals = professionals.filter(prof => {
    const matchesSearch = prof.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prof.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || prof.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border/30">
        <div className="max-w-lg mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[32px] font-bold text-foreground leading-tight tracking-tight">
                {t.forYou}
              </h1>
            </div>
            <button
              onClick={() => navigate('/client/settings')}
              className="p-3 rounded-full border border-border/30 hover:border-border transition-all duration-200 active:scale-95"
            >
              <Search className="h-5 w-5 stroke-[1.5]" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground stroke-[1.5]" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[52px] pl-14 pr-5 rounded-[16px] border border-border/50 bg-background text-foreground placeholder:text-muted-foreground text-[15px] focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all duration-200"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-6 py-3 rounded-full whitespace-nowrap text-[14px] font-medium transition-all duration-200 active:scale-95 ${
                selectedCategory === null
                  ? 'bg-foreground text-background'
                  : 'bg-white text-foreground border border-foreground/15 hover:border-foreground/30'
              }`}
            >
              {t.allCategories}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-6 py-3 rounded-full whitespace-nowrap text-[14px] font-medium transition-all duration-200 active:scale-95 ${
                  selectedCategory === cat.name
                    ? 'bg-foreground text-background'
                    : 'bg-white text-foreground border border-foreground/15 hover:border-foreground/30'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-6 py-6 space-y-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-[15px]">{t.noProfessionals}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProfessionals.map((prof) => (
              <Card
                key={prof.id}
                onClick={() => navigate(`/professional/${prof.id}`)}
                className="p-5 cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-[0.98] border-border/50"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted border border-border/50">
                      {prof.profiles?.avatar ? (
                        <img
                          src={prof.profiles.avatar}
                          alt={prof.profiles.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground stroke-[1.5]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[16px] text-foreground mb-1 truncate">
                      {prof.profiles?.name}
                    </h3>
                    
                    {/* Rating */}
                    {prof.rating && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Star className="h-4 w-4 fill-foreground stroke-foreground" />
                        <span className="text-[15px] font-semibold text-foreground">
                          {prof.rating.toFixed(1)}
                        </span>
                        <span className="text-[13px] text-muted-foreground">
                          ({prof.total_reviews || 0})
                        </span>
                      </div>
                    )}

                    {/* Category */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground stroke-[1.5]" />
                      <span className="text-[13px] text-muted-foreground">{prof.category}</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground stroke-[1.5]" />
                      <span className="text-[13px] text-muted-foreground truncate">
                        {prof.address || prof.city}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 text-muted-foreground stroke-[1.5]" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Map Button */}
        <button
          onClick={() => navigate('/map')}
          className="fixed bottom-24 right-6 h-14 px-6 bg-foreground text-background rounded-full shadow-lg hover:opacity-90 transition-all duration-200 active:scale-95 flex items-center gap-2 font-medium text-[15px] z-40"
        >
          <Map className="h-5 w-5 stroke-[2]" />
          {t.viewOnMap}
        </button>
      </main>
    </div>
  );
};
  
export default ClientDashboard;
