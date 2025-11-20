import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '@/lib/mapbox-config';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';

// Izmanto SortedMaster no master-sorting.ts

interface AllMastersMapProps {
  selectedMasterId?: string;
}

const AllMastersMap = ({ selectedMasterId }: AllMastersMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [masters, setMasters] = useState<SortedMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    initializeMap();
  }, []);

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

    // Set access token
    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Calculate center - always center on Rīga with zoom to see the whole city
    const center: [number, number] = [24.1052, 56.9496]; // Rīga
    const zoom = 11.5;

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

      // Add markers
      masters.forEach((master) => {

        // Create custom marker with gradient
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

        // Hover popup - desktop only
        if (window.innerWidth >= 768) {
          markerEl.addEventListener('mouseenter', () => {
            if (map.current) {
              const avatarUrl = master.profiles.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + master.profiles.name;
              const shortAddress = master.address ? (master.address.length > 25 ? master.address.substring(0, 25) + '...' : master.address) : master.city;
              
              const hoverPopup = new mapboxgl.Popup({ 
                offset: 25,
                closeButton: false,
                closeOnClick: false,
                className: 'compact-marker-popup'
              }).setHTML(
                `<div style="padding: 8px 10px; background: linear-gradient(135deg, #ffffff 0%, #fef5f9 100%); border-radius: 14px; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.2); border: 1px solid rgba(236, 72, 153, 0.1);">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <img 
                      src="${avatarUrl}" 
                      alt="${master.profiles.name}"
                      style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #ec4899; flex-shrink: 0;"
                    />
                    <div style="min-width: 0; flex: 1;">
                      <h3 style="font-weight: 600; margin: 0 0 2px 0; font-size: 13px; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${master.profiles.name}</h3>
                      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
                        <span style="color: #f59e0b; font-size: 11px;">⭐</span>
                        <span style="color: #666; font-weight: 500; font-size: 11px;">${master.rating || 0}</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 3px; font-size: 10px; color: #888;">
                        <span style="font-size: 10px;">📍</span>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${shortAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>`
              )
              .setLngLat([master.longitude, master.latitude])
              .addTo(map.current);
              
              (marker as any).hoverPopup = hoverPopup;
            }
          });

          markerEl.addEventListener('mouseleave', () => {
            const popup = (marker as any).hoverPopup;
            if (popup) {
              popup.remove();
            }
          });
        }

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

          // Add bounce animation AFTER fly animation completes
          setTimeout(() => {
            markerEl.classList.add('marker-bounce');
            setTimeout(() => {
              markerEl.classList.remove('marker-bounce');
            }, 1000);
          }, 1500);

          // Show popup after animation
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
              closeButton: true,
              closeOnClick: false,
              className: 'selected-master-popup',
              maxWidth: '280px'
            }).setHTML(
              `<div style="padding: 12px; background: linear-gradient(135deg, #ffffff 0%, #fef5f9 100%); border-radius: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                  <img 
                    src="${avatarUrl}" 
                    alt="${master.profiles.name}"
                    style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #ec4899; flex-shrink: 0;"
                  />
                  <div style="min-width: 0; flex: 1;">
                    <h3 style="font-weight: 600; margin: 0 0 4px 0; font-size: 15px; color: #1a1a1a; line-height: 1.3;">${master.profiles.name}</h3>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <span style="color: #f59e0b; font-size: 13px;">⭐</span>
                      <span style="color: #666; font-weight: 500; font-size: 13px;">${master.rating || 0}</span>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 6px; font-size: 12px; color: #666; line-height: 1.4; margin-bottom: 10px;">
                  <span style="font-size: 13px; margin-top: 1px;">📍</span>
                  <span>${shortAddress}</span>
                </div>
                <button 
                  onclick="window.location.href='/professional/${master.id}'" 
                  style="width: 100%; padding: 8px; background: linear-gradient(135deg, #ec4899, #f472b6); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;"
                  onmouseover="this.style.opacity='0.9'"
                  onmouseout="this.style.opacity='1'"
                >
                  Skatīt profilu
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
                closeButton: true,
                closeOnClick: false,
                className: 'selected-master-popup',
                maxWidth: '280px'
              }).setHTML(
                `<div style="padding: 12px; background: linear-gradient(135deg, #ffffff 0%, #fef5f9 100%); border-radius: 16px;">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <img 
                      src="${avatarUrl}" 
                      alt="${selectedMaster.profiles.name}"
                      style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #ec4899; flex-shrink: 0;"
                    />
                    <div style="min-width: 0; flex: 1;">
                      <h3 style="font-weight: 600; margin: 0 0 4px 0; font-size: 15px; color: #1a1a1a; line-height: 1.3;">${selectedMaster.profiles.name}</h3>
                      <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #f59e0b; font-size: 13px;">⭐</span>
                        <span style="color: #666; font-weight: 500; font-size: 13px;">${selectedMaster.rating || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: start; gap: 6px; font-size: 12px; color: #666; line-height: 1.4;">
                    <span style="font-size: 13px; margin-top: 1px;">📍</span>
                    <span>${shortAddress}</span>
                  </div>
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
  }, [masters, loading, navigate, selectedMasterId]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">Ielādē kartes datus...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        ref={mapContainer} 
        className="map-container absolute inset-0 rounded-2xl overflow-hidden border shadow-sm"
        style={{ 
          width: '100%',
          height: '100%',
          minHeight: '380px',
          maxWidth: '100%',
          touchAction: 'pan-x pan-y'
        }}
      />
      {masters.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-3 sm:p-4">
          <div className="bg-card/95 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border max-w-sm text-center">
            <p className="text-sm sm:text-base font-semibold mb-2">Nav pieejamu meistaru</p>
            <p className="text-xs text-muted-foreground">
              Pašlaik sistēmā nav reģistrētu meistaru ar adresi vai viņi gaida administratora apstiprinājumu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMastersMap;
