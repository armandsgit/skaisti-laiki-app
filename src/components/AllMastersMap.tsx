import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';
import { Button } from '@/components/ui/button';
import MasterBottomSheet from '@/components/MasterBottomSheet';
import LoadingAnimation from '@/components/LoadingAnimation';

interface AllMastersMapProps {
  selectedMasterId?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
}

// Create custom rating marker icon
const createRatingIcon = (rating: number) => {
  const displayRating = rating.toFixed(1);
  
  return L.divIcon({
    className: 'custom-leaflet-marker clickable-marker',
    html: `
      <div class="marker-container" style="cursor: pointer;">
        <div class="marker-badge" style="background: #000000; border: 2px solid #FFFFFF; border-radius: 100px; padding: 5px 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; min-width: 48px;">
          <span class="marker-rating" style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #FFFFFF; line-height: 1;">${displayRating}</span>
        </div>
        <div class="marker-pointer" style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #000000; margin-top: -2px; margin-left: auto; margin-right: auto;"></div>
      </div>
    `,
    iconSize: [48, 40],
    iconAnchor: [24, 40],
  });
};

// Map events handler for closing bottom sheet on drag
interface MapDragHandlerProps {
  onDragStart: () => void;
}

const MapDragHandler = ({ onDragStart }: MapDragHandlerProps) => {
  useMapEvents({
    dragstart: () => {
      onDragStart();
    },
  });
  return null;
};

// Component to fly to a master's location
interface FlyToMasterProps {
  master: SortedMaster | null;
  onComplete: () => void;
}

const FlyToMaster = ({ master, onComplete }: FlyToMasterProps) => {
  const map = useMap();
  
  useEffect(() => {
    if (master) {
      map.flyTo([master.latitude, master.longitude], 15, { duration: 1 });
      setTimeout(onComplete, 800);
    }
  }, [master, map, onComplete]);
  
  return null;
};

// Component to handle map resizing
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    setTimeout(() => map.invalidateSize(), 100);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);
  
  return null;
};

// Master marker component
interface MasterMarkerProps {
  master: SortedMaster;
  onClick: (master: SortedMaster) => void;
}

const MasterMarker = ({ master, onClick }: MasterMarkerProps) => {
  const icon = createRatingIcon(master.rating || 0);
  
  return (
    <Marker
      position={[master.latitude, master.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onClick(master),
      }}
    />
  );
};

const AllMastersMap = ({ selectedMasterId }: AllMastersMapProps) => {
  const [masters, setMasters] = useState<SortedMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<SortedMaster | null>(null);
  const [flyToMasterData, setFlyToMasterData] = useState<SortedMaster | null>(null);

  useEffect(() => {
    initializeMap();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const initializeMap = async () => {
    const location = await getUserLocation();
    setUserLocation(location);
    await loadMasters(location);
  };

  const loadMasters = async (location: { lat: number; lon: number }) => {
    try {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select(`
          *,
          profiles!professional_profiles_user_id_fkey(name, avatar, status)
        `)
        .eq('approved', true)
        .eq('active', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('Error loading masters:', error);
        setLoading(false);
        return;
      }

      // Filter out suspended/deleted masters
      const activeMasters = (data || []).filter(m => m.profiles?.status === 'active');

      // Sort masters by priority
      const sortedMasters = getSortedMasters(activeMasters, location.lat, location.lon);
      setMasters(sortedMasters);
    } catch (error) {
      console.error('Exception loading masters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle selected master from URL
  useEffect(() => {
    if (selectedMasterId && masters.length > 0 && !loading) {
      const master = masters.find(m => m.id === selectedMasterId);
      if (master) {
        setFlyToMasterData(master);
      }
    }
  }, [selectedMasterId, masters, loading]);

  const handleMarkerClick = useCallback((master: SortedMaster) => {
    setFlyToMasterData(master);
  }, []);

  const handleFlyComplete = useCallback(() => {
    if (flyToMasterData) {
      setSelectedMaster(flyToMasterData);
      setFlyToMasterData(null);
    }
  }, [flyToMasterData]);

  const handleDragStart = useCallback(() => {
    setSelectedMaster(null);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <LoadingAnimation size={100} text="Ielāde" />
      </div>
    );
  }

  const filteredMasters = selectedCategory === 'all' 
    ? masters 
    : masters.filter(m => m.category === selectedCategory);

  // Default center is Riga
  const defaultCenter: [number, number] = [56.9496, 24.1052];

  return (
    <div className="relative w-full h-screen">
      {/* Full-screen map container */}
      <MapContainer
        center={defaultCenter}
        zoom={12.5}
        className="map-container absolute inset-0"
        style={{ 
          width: '100%',
          height: '100%',
          touchAction: 'pan-x pan-y',
          overflow: 'visible'
        }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapDragHandler onDragStart={handleDragStart} />
        <FlyToMaster master={flyToMasterData} onComplete={handleFlyComplete} />
        <MapResizer />
        
        {filteredMasters.map((master) => (
          <MasterMarker
            key={master.id}
            master={master}
            onClick={handleMarkerClick}
          />
        ))}
      </MapContainer>
      
      {/* Category filter - floating at top */}
      <div 
        className="absolute left-0 right-0 px-3 pointer-events-none z-[9997]"
        style={{
          top: 'max(env(safe-area-inset-top), 12px)'
        }}
      >
        <div className="bg-white backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-2 pointer-events-auto max-w-full">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'secondary'}
              onClick={() => setSelectedCategory('all')}
              className="whitespace-nowrap text-xs font-semibold flex-shrink-0 rounded-full px-4 h-9"
            >
              Visas
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                size="sm"
                variant={selectedCategory === category.name ? 'default' : 'secondary'}
                onClick={() => setSelectedCategory(category.name)}
                className="whitespace-nowrap text-xs font-semibold flex-shrink-0 rounded-full px-4 h-9"
              >
                <span className="mr-1.5">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredMasters.length === 0 && !loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="bg-background p-6 rounded-2xl shadow-card border border-border max-w-[280px] text-center">
            <p className="text-base font-bold mb-2 text-foreground">Nav pieejamu meistaru</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedCategory === 'all' 
                ? 'Pašlaik sistēmā nav reģistrētu meistaru ar adresi vai viņi gaida administratora apstiprinājumu.'
                : `Pašlaik nav pieejamu meistaru kategorijā "${selectedCategory}".`
              }
            </p>
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      <MasterBottomSheet 
        master={selectedMaster}
        onClose={() => setSelectedMaster(null)}
      />
    </div>
  );
};

export default AllMastersMap;
