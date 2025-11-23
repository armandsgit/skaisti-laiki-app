import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '@/lib/mapbox-config';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';
import { Button } from '@/components/ui/button';
import MasterBottomSheet from '@/components/MasterBottomSheet';

// Izmanto SortedMaster no master-sorting.ts

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

const AllMastersMap = ({ selectedMasterId }: AllMastersMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [masters, setMasters] = useState<SortedMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<SortedMaster | null>(null);

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

      if (error) {
        console.error('Error loading masters:', error);
        setLoading(false);
        return;
      }

      // Sort masters by priority
      const sortedMasters = getSortedMasters(activeMasters, location.lat, location.lon);
      setMasters(sortedMasters);
    } catch (error) {
      console.error('Exception loading masters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || loading) return;

    // Cleanup previous map
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Filter masters by category
    const filteredMasters = selectedCategory === 'all' 
      ? masters 
      : masters.filter(m => m.category === selectedCategory);

    // Set access token
    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Calculate center and zoom based on filtered masters
    let center: [number, number] = [24.1052, 56.9496]; // Rīga default
    let zoom = 12.5; // Closer zoom on Riga

    if (filteredMasters.length > 0) {
      // Calculate bounds for all markers
      const bounds = new mapboxgl.LngLatBounds();
      filteredMasters.forEach(master => {
        bounds.extend([master.longitude, master.latitude]);
      });
      
      // If filtering by category, fit to filtered bounds
      if (selectedCategory !== 'all' && filteredMasters.length > 0) {
        const boundsCenter = bounds.getCenter();
        center = [boundsCenter.lng, boundsCenter.lat];
        zoom = filteredMasters.length === 1 ? 14 : 12;
      }
    }

    // Create map
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add markers for filtered masters
      console.log('Adding markers for', filteredMasters.length, 'masters');
      
      filteredMasters.forEach((master) => {

        // Create custom marker - modern Bolt/Wolt/Fresha style
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-map-marker clickable-marker';
        
        const rating = master.rating || 0;
        const hasRating = rating > 0;
        const displayRating = hasRating ? rating.toFixed(1) : '';
        
        console.log('Creating marker for master:', master.profiles?.name, 'at', master.latitude, master.longitude, 'rating:', displayRating);
        
        markerEl.innerHTML = `
          <div class="marker-container">
            <div class="marker-badge ${!hasRating ? 'marker-badge-empty' : ''}">
              ${hasRating ? `<span class="marker-rating">${displayRating}</span>` : '<span class="marker-dot"></span>'}
            </div>
            <div class="marker-pointer"></div>
          </div>
        `;
        markerEl.dataset.masterId = master.id;

        const marker = new mapboxgl.Marker({ 
          element: markerEl,
          anchor: 'bottom'
        })
          .setLngLat([master.longitude, master.latitude])
          .addTo(map.current);
        
        console.log('Marker added to map:', marker);

        // Store marker reference for selected master handling
        (marker as any).masterData = master;
        markersRef.current.set(master.id, marker);

        // Click/Tap event
        markerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          
          if (!map.current) return;

          // Fly to marker with animation
          map.current.flyTo({
            center: [master.longitude, master.latitude],
            zoom: 15,
            duration: 1000,
            essential: true
          });

          // Show bottom sheet after brief animation
          setTimeout(() => {
            setSelectedMaster(master);
          }, 800);
        });
      });

      // Close bottom sheet when user starts dragging the map
      map.current.on('dragstart', () => {
        setSelectedMaster(null);
      });

      // Handle selected master from URL
      if (selectedMasterId && masters.length > 0) {
        const master = masters.find(m => m.id === selectedMasterId);
        if (master && map.current) {
          setTimeout(() => {
            if (!map.current) return;
            
            map.current.flyTo({
              center: [master.longitude, master.latitude],
              zoom: 15,
              duration: 1500,
              essential: true
            });

            setTimeout(() => {
              setSelectedMaster(master);
            }, 1200);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error creating map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markersRef.current.clear();
    };
  }, [masters, loading, navigate, selectedMasterId, selectedCategory]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary animate-pulse" />
          <p className="text-base font-semibold text-foreground">Ielādē kartes datus...</p>
        </div>
      </div>
    );
  }

  const filteredMasters = selectedCategory === 'all' 
    ? masters 
    : masters.filter(m => m.category === selectedCategory);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Full-screen map container */}
      <div 
        ref={mapContainer} 
        className="map-container absolute inset-0"
        style={{ 
          width: '100%',
          height: '100%',
          touchAction: 'pan-x pan-y'
        }}
      />
      
      {/* Category filter - floating at top */}
      <div 
        className="fixed left-0 right-0 px-3 pointer-events-none"
        style={{
          top: 'max(env(safe-area-inset-top), 20px)',
          zIndex: 9997
        }}
      >
        <div className="bg-background backdrop-blur-md rounded-2xl shadow-card border border-border p-2 pointer-events-auto">
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
