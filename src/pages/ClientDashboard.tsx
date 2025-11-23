import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Search, Star, MapPin, Briefcase, Map, User } from 'lucide-react';
import { toast } from 'sonner';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
const ClientDashboard = () => {
  const t = useTranslation('lv');
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<SortedMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<SortedMaster[]>([]);
  useEffect(() => {
    if (user) {
      initializeData();
      loadCategories();
      loadProfile();
      loadRecentlyViewed();
    }
  }, [user]);
  const loadRecentlyViewed = () => {
    const viewed = localStorage.getItem('recentlyViewed');
    if (viewed) {
      try {
        const parsedViewed = JSON.parse(viewed);
        setRecentlyViewed(parsedViewed.slice(0, 10)); // Keep last 10
      } catch (e) {
        console.error('Error parsing recently viewed:', e);
      }
    }
  };
  const loadProfile = async () => {
    const {
      data
    } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    if (data) setProfile(data);
  };
  const loadCategories = async () => {
    const {
      data,
      error
    } = await supabase.from('categories').select('*').eq('active', true).order('display_order', {
      ascending: true
    });
    if (!error && data) {
      setCategories(data);
    }
  };
  const initializeData = async () => {
    const location = await getUserLocation();
    setUserLocation(location);
    await loadProfessionals(location);
  };
  const loadProfessionals = async (location: {
    lat: number;
    lon: number;
  }) => {
    const {
      data,
      error
    } = await supabase.from('professional_profiles').select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, avatar)
      `).eq('approved', true).eq('active', true).eq('is_blocked', false);
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
    const matchesSearch = prof.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || prof.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || prof.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const handleMasterClick = (master: SortedMaster) => {
    // Save to recently viewed
    const viewed = localStorage.getItem('recentlyViewed');
    let viewedList: SortedMaster[] = [];
    if (viewed) {
      try {
        viewedList = JSON.parse(viewed);
      } catch (e) {
        viewedList = [];
      }
    }

    // Remove if already exists and add to beginning
    viewedList = viewedList.filter(v => v.id !== master.id);
    viewedList.unshift(master);
    viewedList = viewedList.slice(0, 10); // Keep only last 10

    localStorage.setItem('recentlyViewed', JSON.stringify(viewedList));
    navigate(`/professional/${master.id}`);
  };
  return <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-[42px] font-bold text-foreground leading-tight tracking-tight">
              Tev
            </h1>
            <button onClick={() => navigate('/client/settings')} className="p-3 rounded-full border border-border/30 hover:border-border transition-all duration-200 active:scale-95">
              <Search className="h-6 w-6 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto space-y-8 pb-6">
        {loading ? <div className="px-4 sm:px-6 space-y-8">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-muted/30 rounded-lg animate-pulse" />
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3].map(i => <div key={i} className="w-[280px] h-[380px] bg-muted/30 rounded-3xl animate-pulse flex-shrink-0" />)}
              </div>
            </div>
          </div> : <>
            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && <div className="space-y-4">
                <h2 className="text-[28px] font-bold text-foreground px-4 sm:px-6 tracking-tight">
                  Recently viewed
                </h2>
                <Carousel opts={{
            align: "start",
            loop: false
          }} className="w-full">
                  <CarouselContent className="-ml-4 px-4 sm:px-6">
                    {recentlyViewed.map(prof => <CarouselItem key={prof.id} className="pl-4 basis-[280px]">
                        <Card onClick={() => handleMasterClick(prof)} className="cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-[0.98] border-0 overflow-hidden bg-white rounded-3xl">
                          {/* Image */}
                          <div className="relative w-full h-[200px] bg-muted overflow-hidden">
                            {(prof as any).gallery && (prof as any).gallery.length > 0 ? <img src={(prof as any).gallery[0]} alt={prof.profiles?.name || ''} className="w-full h-full object-cover" /> : prof.profiles?.avatar ? <img src={prof.profiles.avatar} alt={prof.profiles.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-muted">
                                <User className="h-16 w-16 text-muted-foreground stroke-[1.5]" />
                              </div>}
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-2.5">
                            <h3 className="font-bold text-[20px] text-foreground truncate">
                              {prof.profiles?.name}
                            </h3>
                            
                            {/* Rating */}
                            <div className="flex items-center gap-1.5">
                              <Star className="h-[18px] w-[18px] fill-foreground stroke-foreground" />
                              <span className="text-[16px] font-semibold text-foreground">
                                {prof.rating ? prof.rating.toFixed(1) : '5.0'}
                              </span>
                              <span className="text-[15px] text-muted-foreground">
                                ({prof.total_reviews || 0})
                              </span>
                            </div>

                          {/* Location with Distance */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <MapPin className="h-[14px] w-[14px] text-[#7D7D7D] stroke-[1.5] flex-shrink-0" />
                            <span className="text-[13px] text-[#7D7D7D] leading-tight">
                              {prof.city} • {prof.distance ? prof.distance.toFixed(1) : '0.0'} km
                            </span>
                          </div>

                          {/* Category */}
                          <div className="pt-1">
                            <span className="text-[13px] text-muted-foreground">
                              {prof.category}
                            </span>
                          </div>
                          </div>
                        </Card>
                      </CarouselItem>)}
                  </CarouselContent>
                </Carousel>
              </div>}

            {/* Recommended / Nearby */}
            <div className="space-y-4">
              <h2 className="text-[28px] font-bold text-foreground px-4 sm:px-6 tracking-tight">
                Recommended
              </h2>
              <Carousel opts={{
            align: "start",
            loop: false
          }} className="w-full">
                <CarouselContent className="-ml-4 px-4 sm:px-6">
                  {filteredProfessionals.map(prof => <CarouselItem key={prof.id} className="pl-4 basis-[280px]">
                      <Card onClick={() => handleMasterClick(prof)} className="cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-[0.98] border-0 overflow-hidden bg-white rounded-3xl">
                        {/* Image */}
                        <div className="relative w-full h-[200px] bg-muted overflow-hidden">
                          {(prof as any).gallery && (prof as any).gallery.length > 0 ? <img src={(prof as any).gallery[0]} alt={prof.profiles?.name || ''} className="w-full h-full object-cover" /> : prof.profiles?.avatar ? <img src={prof.profiles.avatar} alt={prof.profiles.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-muted">
                              <User className="h-16 w-16 text-muted-foreground stroke-[1.5]" />
                            </div>}
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-2.5">
                          <h3 className="font-bold text-[20px] text-foreground truncate">
                            {prof.profiles?.name}
                          </h3>
                          
                          {/* Rating */}
                          <div className="flex items-center gap-1.5">
                            <Star className="h-[18px] w-[18px] fill-foreground stroke-foreground" />
                            <span className="text-[16px] font-semibold text-foreground">
                              {prof.rating ? prof.rating.toFixed(1) : '5.0'}
                            </span>
                            <span className="text-[15px] text-muted-foreground">
                              ({prof.total_reviews || 0})
                            </span>
                          </div>

                        {/* Location with Distance */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <MapPin className="h-[14px] w-[14px] text-[#7D7D7D] stroke-[1.5] flex-shrink-0" />
                          <span className="text-[13px] text-[#7D7D7D] leading-tight">
                            {prof.city} • {prof.distance ? prof.distance.toFixed(1) : '0.0'} km
                          </span>
                        </div>

                        {/* Category */}
                        <div className="pt-1">
                          <span className="text-[13px] text-muted-foreground">
                            {prof.category}
                          </span>
                        </div>
                        </div>
                      </Card>
                    </CarouselItem>)}
                </CarouselContent>
              </Carousel>
            </div>

            {/* Category Filters - Moved Below Carousels */}
            <div className="px-4 sm:px-6 pt-6">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setSelectedCategory(null)} className={`px-6 py-3 rounded-full whitespace-nowrap text-[14px] font-medium transition-all duration-200 active:scale-95 ${selectedCategory === null ? 'bg-foreground text-background' : 'bg-white text-foreground border border-foreground/15 hover:border-foreground/30'}`}>
                  {t.allCategories}
                </button>
                {categories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`px-6 py-3 rounded-full whitespace-nowrap text-[14px] font-medium transition-all duration-200 active:scale-95 ${selectedCategory === cat.name ? 'bg-foreground text-background' : 'bg-white text-foreground border border-foreground/15 hover:border-foreground/30'}`}>
                    {cat.name}
                  </button>)}
              </div>
            </div>
          </>}

        {/* Map Button */}
        <button onClick={() => navigate('/map')} className="fixed bottom-24 right-6 h-14 px-6 bg-foreground text-background rounded-full shadow-lg hover:opacity-90 transition-all duration-200 active:scale-95 flex items-center gap-2 font-medium text-[15px] z-40">
          <Map className="h-5 w-5 stroke-[2]" />
          {t.viewOnMap}
        </button>
      </main>
    </div>;
};
export default ClientDashboard;