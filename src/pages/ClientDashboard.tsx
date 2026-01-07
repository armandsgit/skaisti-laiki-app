import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { Star, Map, MapPin, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import LoadingAnimation from '@/components/LoadingAnimation';
import BottomNavigation from '@/components/BottomNavigation';
import ProfessionalCard from '@/components/ProfessionalCard';
import { useTodayAvailability } from '@/hooks/useTodayAvailability';
import { useHasActiveSchedules } from '@/hooks/useHasActiveSchedules';

const ClientDashboard = () => {
  const t = useTranslation('lv');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<SortedMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [userLocationName, setUserLocationName] = useState<string>('Ielādē...');
  const [profile, setProfile] = useState<any>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<SortedMaster[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  // Get all professional IDs for availability check
  const allProfessionalIds = useMemo(() => {
    const ids = new Set<string>();
    professionals.forEach(p => ids.add(p.id));
    recentlyViewed.forEach(p => ids.add(p.id));
    return Array.from(ids);
  }, [professionals, recentlyViewed]);

  // Check today's availability
  const { availableToday } = useTodayAvailability(allProfessionalIds);

  // Check if a professional has any active schedule at all (shows the dot even if not available today)
  const { hasActiveSchedule } = useHasActiveSchedules(allProfessionalIds);

  // Derived data: newest professionals (joined in last 30 days)
  const newestProfessionals = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return professionals.filter(prof => {
      const createdAt = new Date(prof.created_at);
      return createdAt >= thirtyDaysAgo;
    }).slice(0, 10);
  }, [professionals]);

  // Derived data: top rated professionals
  const topRatedProfessionals = useMemo(() => {
    return [...professionals]
      .filter(prof => (prof.rating || 0) > 0 && (prof.total_reviews || 0) > 0)
      .sort((a, b) => {
        // Sort by rating first, then by number of reviews
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.total_reviews || 0) - (a.total_reviews || 0);
      })
      .slice(0, 10);
  }, [professionals]);

  // Derived data: available today
  const availableTodayProfessionals = useMemo(() => {
    return professionals.filter(prof => availableToday.has(prof.id)).slice(0, 10);
  }, [professionals, availableToday]);

  useEffect(() => {
    initializeData();
    if (user) {
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
        () => {
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

  // Real-time subscription for booking updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('client-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `client_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newStatus = (payload.new as any).status;
            const oldStatus = (payload.old as any)?.status;
            
            if (oldStatus === 'pending' && newStatus === 'confirmed') {
              toast.success('Jūsu rezervācija ir apstiprināta! ✓');
            } else if (newStatus === 'canceled') {
              toast.error('Rezervācija tika atcelta');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadRecentlyViewedIds = () => {
    const viewed = localStorage.getItem('recentlyViewedIds');
    if (viewed) {
      try {
        const parsedViewed = JSON.parse(viewed);
        setRecentlyViewedIds(parsedViewed.slice(0, 10));
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

    const sortedData = recentlyViewedIds
      .map(id => data?.find(prof => prof.id === id))
      .filter(Boolean) as any[];

    const sortedMasters = getSortedMasters(sortedData, userLocation.lat, userLocation.lon);
    setRecentlyViewed(sortedMasters);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
  };

  const initializeData = async () => {
    const location = await getUserLocation();
    setUserLocation(location);
    await loadProfessionals(location);
    
    // Get location name using reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lon}&addressdetails=1&accept-language=lv`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        // Build location name with street and house number
        const locationParts: string[] = [];
        
        if (addr.road) {
          let street = addr.road;
          if (addr.house_number) {
            street += ' ' + addr.house_number;
          }
          locationParts.push(street);
        } else if (addr.neighbourhood || addr.suburb || addr.city_district) {
          locationParts.push(addr.neighbourhood || addr.suburb || addr.city_district);
        }
        
        const city = addr.city || addr.town || addr.village || '';
        if (city && !locationParts.includes(city)) {
          locationParts.push(city);
        }
        
        setUserLocationName(locationParts.join(', ') || 'Latvija');
      } else {
        setUserLocationName('Latvija');
      }
    } catch (error) {
      console.error('Error getting location name:', error);
      setUserLocationName('Latvija');
    }
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

  const handleMasterClick = (master: SortedMaster) => {
    const viewed = localStorage.getItem('recentlyViewedIds');
    let viewedList: string[] = [];
    
    if (viewed) {
      try {
        viewedList = JSON.parse(viewed);
      } catch (e) {
        viewedList = [];
      }
    }

    viewedList = viewedList.filter(id => id !== master.id);
    viewedList.unshift(master.id);
    viewedList = viewedList.slice(0, 10);

    localStorage.setItem('recentlyViewedIds', JSON.stringify(viewedList));
    setRecentlyViewedIds(viewedList);
    
    navigate(`/professional/${master.id}`);
  };

  // Check if professional is new (joined in last 14 days)
  const isNewProfessional = (prof: SortedMaster) => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return new Date(prof.created_at) >= fourteenDaysAgo;
  };

  const renderCarousel = (
    title: string, 
    professionals: SortedMaster[], 
    showNewBadge = false
  ) => {
    if (professionals.length === 0) return null;

    return (
      <div className="space-y-5">
        <h2 className="text-[26px] font-bold text-foreground px-5 sm:px-6 tracking-tight">
          {title}
        </h2>
        <Carousel opts={{ align: "start", loop: false }} className="w-full">
          <CarouselContent className="-ml-4 px-5 sm:px-6">
            {professionals.map(prof => (
              <CarouselItem key={prof.id} className="pl-4 basis-[280px]">
                <ProfessionalCard
                  professional={prof}
                  onClick={() => handleMasterClick(prof)}
                  availableToday={availableToday.has(prof.id)}
                  hasAvailability={hasActiveSchedule.has(prof.id)}
                  isNew={showNewBadge && isNewProfessional(prof)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-border/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-6 pb-5">
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1">
              <h1 className="text-[32px] sm:text-[36px] font-bold text-foreground leading-none tracking-tight mb-1.5">
                Tieši tev
              </h1>
              <button 
                onClick={() => navigate('/map')}
                className="flex items-center gap-1.5 text-[15px] sm:text-base text-muted-foreground font-normal hover:text-foreground transition-colors tap-feedback"
              >
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-[300px]">{userLocationName}</span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </button>
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
            {renderCarousel('Nesen skatītie', recentlyViewed)}

            {/* Available Today */}
            {renderCarousel('Šodien pieejami', availableTodayProfessionals)}

            {/* Top Rated */}
            {renderCarousel('Populārākie', topRatedProfessionals)}

            {/* Newest */}
            {renderCarousel('Jaunākie saloni', newestProfessionals, true)}

            {/* All Recommended */}
            {renderCarousel('Rekomendētie', professionals)}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ClientDashboard;
