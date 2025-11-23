import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Star, Briefcase, Map, User } from 'lucide-react';
import { toast } from 'sonner';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import LoadingAnimation from '@/components/LoadingAnimation';
const ClientDashboard = () => {
  const t = useTranslation('lv');
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<SortedMaster[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<SortedMaster[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  
  useEffect(() => {
    if (user) {
      initializeData();
      loadCategories();
      loadProfile();
      loadRecentlyViewedIds();
    }
  }, [user]);

  useEffect(() => {
    if (recentlyViewedIds.length > 0 && userLocation) {
      loadRecentlyViewedData();
    }
  }, [recentlyViewedIds, userLocation]);

  // Real-time subscription for professional profile updates
  useEffect(() => {
    const channel = supabase
      .channel('professional-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'professional_profiles'
        },
        (payload) => {
          // Reload data when any professional profile changes
          if (userLocation) {
            loadProfessionals(userLocation);
            if (recentlyViewedIds.length > 0) {
              loadRecentlyViewedData();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation, recentlyViewedIds]);

  const loadRecentlyViewedIds = () => {
    const viewed = localStorage.getItem('recentlyViewedIds');
    if (viewed) {
      try {
        const parsedViewed = JSON.parse(viewed);
        setRecentlyViewedIds(parsedViewed.slice(0, 10)); // Keep last 10
      } catch (e) {
        console.error('Error parsing recently viewed:', e);
      }
    }
  };

  const loadRecentlyViewedData = async () => {
    if (!userLocation || recentlyViewedIds.length === 0) return;

    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        *,
        profiles!professional_profiles_user_id_fkey(name, avatar)
      `)
      .in('id', recentlyViewedIds)
      .eq('approved', true)
      .eq('active', true)
      .eq('is_blocked', false);

    if (error) {
      console.error('Error loading recently viewed:', error);
      return;
    }

    // Sort by the order in recentlyViewedIds
    const sortedData = recentlyViewedIds
      .map(id => data?.find(prof => prof.id === id))
      .filter(Boolean) as any[];

    const sortedMasters = getSortedMasters(sortedData, userLocation.lat, userLocation.lon);
    setRecentlyViewed(sortedMasters);
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
    const matchesCategory = !selectedCategory || prof.category === selectedCategory;
    return matchesCategory;
  });
  const handleMasterClick = (master: SortedMaster) => {
    // Save only ID to recently viewed
    const viewed = localStorage.getItem('recentlyViewedIds');
    let viewedList: string[] = [];
    
    if (viewed) {
      try {
        viewedList = JSON.parse(viewed);
      } catch (e) {
        viewedList = [];
      }
    }

    // Remove if already exists and add to beginning
    viewedList = viewedList.filter(id => id !== master.id);
    viewedList.unshift(master.id);
    viewedList = viewedList.slice(0, 10); // Keep only last 10

    localStorage.setItem('recentlyViewedIds', JSON.stringify(viewedList));
    setRecentlyViewedIds(viewedList);
    
    navigate(`/professional/${master.id}`);
  };
  return <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-border/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-6 pb-5">
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1">
              <h1 className="text-[32px] sm:text-[36px] font-bold text-foreground leading-none tracking-tight mb-1.5">
                Tieši tev
              </h1>
              <p className="text-[15px] sm:text-base text-muted-foreground font-normal">
                Sveiki, {profile?.name || 'Viesis'}
              </p>
            </div>
            <button 
              onClick={() => navigate('/map')} 
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-black hover:bg-black/90 active:scale-95 transition-all duration-200 shadow-sm"
            >
              <Map className="h-5 w-5 text-white stroke-[2]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto space-y-8 pb-6 pt-6">

        {loading ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <LoadingAnimation size={100} text={t.loading} />
          </div>
        ) : (
          <>
            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && <div className="space-y-5">
                <h2 className="text-[26px] font-bold text-foreground px-5 sm:px-6 tracking-tight">
                  Nesen skatītie
                </h2>
                <Carousel opts={{
            align: "start",
            loop: false
          }} className="w-full">
                  <CarouselContent className="-ml-4 px-5 sm:px-6">
                    {recentlyViewed.map(prof => <CarouselItem key={prof.id} className="pl-4 basis-[280px]">
                        <Card onClick={() => handleMasterClick(prof)} className="cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-[0.98] border-0 overflow-hidden bg-white rounded-[24px] shadow-sm">
                          {/* Image */}
                          <div className="relative w-full h-[200px] bg-muted overflow-hidden">
                            {/* Category Badge in Top-Right Corner */}
                            <div className="absolute top-3 right-3 z-10">
                              <span className="px-3 py-1 text-xs font-medium bg-black text-white rounded-full shadow-lg backdrop-blur-sm">
                                {prof.category}
                              </span>
                            </div>
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
                          <div className="pt-0.5">
                            <span className="text-[13px] text-[#6A6A6A] leading-tight block">
                              {prof.address || prof.city || 'Lokācija nav norādīta'} • {prof.distance ? prof.distance.toFixed(1) : '0.0'} km
                            </span>
                          </div>
                          </div>
                        </Card>
                      </CarouselItem>)}
                  </CarouselContent>
                </Carousel>
              </div>}

            {/* Recommended / Nearby */}
            <div className="space-y-5">
              <h2 className="text-[26px] font-bold text-foreground px-5 sm:px-6 tracking-tight">
                Rekomendētie
              </h2>
              <Carousel opts={{
            align: "start",
            loop: false
          }} className="w-full">
                <CarouselContent className="-ml-4 px-5 sm:px-6">
                  {filteredProfessionals.map(prof => <CarouselItem key={prof.id} className="pl-4 basis-[280px]">
                      <Card onClick={() => handleMasterClick(prof)} className="cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-[0.98] border-0 overflow-hidden bg-white rounded-[24px] shadow-sm">
                        {/* Image */}
                        <div className="relative w-full h-[200px] bg-muted overflow-hidden">
                          {/* Category Badge in Top-Right Corner */}
                          <div className="absolute top-3 right-3 z-10">
                            <span className="px-3 py-1 text-xs font-medium bg-black text-white rounded-full shadow-lg backdrop-blur-sm">
                              {prof.category}
                            </span>
                          </div>
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
                        <div className="pt-0.5">
                          <span className="text-[13px] text-[#6A6A6A] leading-tight block">
                            {prof.address || prof.city || 'Lokācija nav norādīta'} • {prof.distance ? prof.distance.toFixed(1) : '0.0'} km
                          </span>
                        </div>
                        </div>
                      </Card>
                    </CarouselItem>)}
                </CarouselContent>
              </Carousel>
            </div>
          </>
        )}

      </main>
    </div>;
};
export default ClientDashboard;