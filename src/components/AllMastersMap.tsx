import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '@/lib/mapbox-config';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';
import { Button } from '@/components/ui/button';

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
      filteredMasters.forEach((master) => {

        // Create custom marker - simple design without hover
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-map-marker clickable-marker';
        markerEl.innerHTML = '✨';
        markerEl.dataset.masterId = master.id;

        const marker = new mapboxgl.Marker({ 
          element: markerEl,
          anchor: 'center'
        })
          .setLngLat([master.longitude, master.latitude])
          .addTo(map.current);

        // Store marker reference for selected master handling
        (marker as any).masterData = master;
        markersRef.current.set(master.id, marker);

        // Click/Tap event
        markerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          
          if (!map.current) return;

          // Remove any existing hover popup
          const existingHoverPopup = (marker as any).hoverPopup;
          if (existingHoverPopup) {
            existingHoverPopup.remove();
          }

          // Fly to marker with animation
          map.current.flyTo({
            center: [master.longitude, master.latitude],
            zoom: 16,
            duration: 1500,
            essential: true
          });

          // Show popup after animation (no bounce - causes position issues)
          setTimeout(() => {
            if (!map.current) return;

            const avatarUrl = master.profiles.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + master.profiles.name;
            const shortAddress = master.address ? (master.address.length > 40 ? master.address.substring(0, 40) + '...' : master.address) : master.city;
            
            // Remove previous popup if exists
            if (currentActivePopup) {
              currentActivePopup.remove();
            }
            
            const selectedPopup = new mapboxgl.Popup({ 
              offset: 25,
              anchor: 'bottom',
              closeButton: true,
              closeOnClick: false,
              className: 'selected-master-popup modern-popup',
              maxWidth: '320px'
            }).setHTML(
              `<div style="padding: 16px; background: linear-gradient(135deg, #ffffff 0%, #fef5f9 100%); border-radius: 20px;">
                <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 12px;">
                  <img 
                    src="${avatarUrl}" 
                    alt="${master.profiles.name}"
                    style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #ec4899; flex-shrink: 0; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);"
                  />
                  <div style="min-width: 0; flex: 1;">
                    <h3 style="font-weight: 700; margin: 0 0 6px 0; font-size: 17px; color: #1a1a1a; line-height: 1.3;">${master.profiles.name}</h3>
                    <div style="display: flex; align-items: center; gap: 5px;">
                      <span style="color: #f59e0b; font-size: 15px;">⭐</span>
                      <span style="color: #666; font-weight: 600; font-size: 15px;">${master.rating || 0}</span>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 8px; font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 14px; padding: 10px; background: white; border-radius: 12px;">
                  <span style="font-size: 16px; margin-top: 2px;">📍</span>
                  <span style="font-weight: 500;">${shortAddress}</span>
                </div>
                <button 
                  onclick="window.location.href='/professional/${master.id}'" 
                  style="width: 100%; padding: 12px; background: linear-gradient(135deg, #ec4899, #f472b6); color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);"
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(236, 72, 153, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(236, 72, 153, 0.3)'"
                >
                  Skatīt profilu →
                </button>
              </div>`
            )
            .setLngLat([master.longitude, master.latitude])
            .addTo(map.current);
            
            // Store reference and handle close
            currentActivePopup = selectedPopup;
            selectedPopup.on('close', () => {
              currentActivePopup = null;
            });
          }, 1600);
        });
      });

      // Close popups when user starts dragging the map (mobile fix)
      let currentActivePopup: mapboxgl.Popup | null = null;
      
      map.current.on('dragstart', () => {
        if (currentActivePopup) {
          currentActivePopup.remove();
          currentActivePopup = null;
        }
      });

      // Handle selected master
      if (selectedMasterId && masters.length > 0) {
        const selectedMaster = masters.find(m => m.id === selectedMasterId);
        if (selectedMaster && map.current) {
          // Fly to the selected master with smooth animation
          setTimeout(() => {
            if (!map.current) return;
            
            map.current.flyTo({
              center: [selectedMaster.longitude, selectedMaster.latitude],
              zoom: 16,
              duration: 2000,
              essential: true
            });

            // Add bounce animation to marker
            const selectedMarker = markersRef.current.get(selectedMasterId);
            if (selectedMarker) {
              const markerEl = selectedMarker.getElement();
              markerEl.classList.add('marker-bounce');
              
              // Remove bounce class after animation
              setTimeout(() => {
                markerEl.classList.remove('marker-bounce');
              }, 1000);
            }

            // Show popup after fly animation completes
            setTimeout(() => {
              if (!map.current) return;
              
              const avatarUrl = selectedMaster.profiles.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + selectedMaster.profiles.name;
              const shortAddress = selectedMaster.address ? (selectedMaster.address.length > 40 ? selectedMaster.address.substring(0, 40) + '...' : selectedMaster.address) : selectedMaster.city;
              
              const selectedPopup = new mapboxgl.Popup({ 
                offset: 25,
                anchor: 'bottom',
                closeButton: true,
                closeOnClick: false,
                className: 'selected-master-popup modern-popup',
                maxWidth: '320px'
              }).setHTML(
                `<div style="padding: 16px; background: linear-gradient(135deg, #ffffff 0%, #fef5f9 100%); border-radius: 20px;">
                  <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 12px;">
                    <img 
                      src="${avatarUrl}" 
                      alt="${selectedMaster.profiles.name}"
                      style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #ec4899; flex-shrink: 0; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);"
                    />
                    <div style="min-width: 0; flex: 1;">
                      <h3 style="font-weight: 700; margin: 0 0 6px 0; font-size: 17px; color: #1a1a1a; line-height: 1.3;">${selectedMaster.profiles.name}</h3>
                      <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: #f59e0b; font-size: 15px;">⭐</span>
                        <span style="color: #666; font-weight: 600; font-size: 15px;">${selectedMaster.rating || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: start; gap: 8px; font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 14px; padding: 10px; background: white; border-radius: 12px;">
                    <span style="font-size: 16px; margin-top: 2px;">📍</span>
                    <span style="font-weight: 500;">${shortAddress}</span>
                  </div>
                  <button 
                    onclick="window.location.href='/professional/${selectedMaster.id}'" 
                    style="width: 100%; padding: 12px; background: linear-gradient(135deg, #ec4899, #f472b6); color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(236, 72, 153, 0.4)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(236, 72, 153, 0.3)'"
                  >
                    Skatīt profilu →
                  </button>
                </div>`
              )
              .setLngLat([selectedMaster.longitude, selectedMaster.latitude])
              .addTo(map.current);
            }, 2100);
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
      
      {/* Category filter - floating above bottom navigation */}
      <div 
        className="absolute left-3 right-3 z-20 pointer-events-none"
        style={{
          bottom: 'max(88px, calc(68px + env(safe-area-inset-bottom, 12px) + 12px))',
        }}
      >
        <div className="bg-white/98 backdrop-blur-md rounded-[24px] shadow-elegant border border-border/20 p-2.5 pointer-events-auto">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap text-xs font-semibold flex-shrink-0 rounded-full px-4 h-9 transition-all ${
                selectedCategory === 'all' 
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-card' 
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted'
              }`}
            >
              Visas
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                size="sm"
                variant={selectedCategory === category.name ? 'default' : 'ghost'}
                onClick={() => setSelectedCategory(category.name)}
                className={`whitespace-nowrap text-xs font-semibold flex-shrink-0 rounded-full px-4 h-9 transition-all ${
                  selectedCategory === category.name
                    ? 'shadow-card text-white'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                }`}
                style={{
                  backgroundColor: selectedCategory === category.name ? category.color : undefined,
                }}
              >
                <span className="mr-1.5">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
      {filteredMasters.length === 0 && !loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="bg-white/98 backdrop-blur-md p-5 rounded-3xl shadow-elegant border border-border/20 max-w-[280px] text-center">
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
    </div>
  );
};

export default AllMastersMap;
