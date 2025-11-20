import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '@/lib/mapbox-config';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getUserLocation } from '@/lib/distance-utils';
import { getSortedMasters, type SortedMaster } from '@/lib/master-sorting';

// Izmanto SortedMaster no master-sorting.ts

const AllMastersMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [masters, setMasters] = useState<SortedMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

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
        if (!map.current) return;

        // Popup for click (detailed info)
        const clickPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${master.profiles.name}</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 4px;">${master.category}</p>
            <p style="color: #666; font-size: 12px; margin-bottom: 8px;">${master.address || ''}</p>
            <div style="display: flex; align-items: center; gap: 4px; font-size: 14px;">
              <span style="color: #f59e0b;">⭐</span>
              <span>${master.rating || 0}</span>
            </div>
          </div>`
        );

        // Compact hover popup for mobile zoom (name, avatar and rating)
        const avatarUrl = master.profiles.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + master.profiles.name;
        
        const hoverPopup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          closeOnClick: false,
          className: 'compact-marker-popup'
        }).setHTML(
          `<div style="padding: 6px 10px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img 
                src="${avatarUrl}" 
                alt="${master.profiles.name}"
                style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #ec4899; flex-shrink: 0;"
              />
              <div style="min-width: 0;">
                <h3 style="font-weight: 600; margin: 0; font-size: 13px; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${master.profiles.name}</h3>
                <div style="display: flex; align-items: center; gap: 3px; font-size: 12px; margin-top: 2px;">
                  <span style="color: #f59e0b;">⭐</span>
                  <span style="color: #666;">${master.rating || 0}</span>
                </div>
              </div>
            </div>
          </div>`
        );

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

        // Store marker reference for zoom handler
        (marker as any).masterData = master;
        (marker as any).hoverPopup = hoverPopup;

        // Hover popup - desktop only
        if (window.innerWidth >= 768) {
          markerEl.addEventListener('mouseenter', () => {
            if (map.current) {
              hoverPopup.setLngLat([master.longitude, master.latitude]).addTo(map.current);
            }
          });

          markerEl.addEventListener('mouseleave', () => {
            hoverPopup.remove();
          });
        }

        // Click/Tap event
        markerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // On mobile, show hover popup on first tap
          if (window.innerWidth < 768) {
            // Check if this popup is already showing
            const isShowing = hoverPopup.isOpen();
            
            // Remove all popups first
            hoverPopup.remove();
            clickPopup.remove();
            
            if (!isShowing) {
              // Show hover popup (with avatar, name, rating)
              if (map.current) {
                hoverPopup.setLngLat([master.longitude, master.latitude]).addTo(map.current);
              }
            } else {
              // Second tap - navigate to profile
              navigate(`/professional/${master.id}`);
            }
          } else {
            // Desktop - always navigate
            hoverPopup.remove();
            if (map.current) {
              clickPopup.setLngLat([master.longitude, master.latitude]).addTo(map.current);
            }
            navigate(`/professional/${master.id}`);
          }
        });
      });

      // Auto-show popup on zoom for nearby markers with debounce
      let activePopup: mapboxgl.Popup | null = null;
      let zoomTimeout: NodeJS.Timeout | null = null;
      let lastShownMasterId: string | null = null;
      
      map.current.on('zoom', () => {
        if (!map.current) return;
        
        // Clear previous timeout
        if (zoomTimeout) {
          clearTimeout(zoomTimeout);
        }
        
        // Debounce: wait 300ms after zoom stops
        zoomTimeout = setTimeout(() => {
          if (!map.current) return;
          
          const zoom = map.current.getZoom();
          const center = map.current.getCenter();
          
          // Show popup when zoomed in enough (zoom > 14)
          if (zoom > 14) {
            // Find closest marker to center
            let closestMarker: any = null;
            let minDistance = Infinity;
            
            masters.forEach((master) => {
              const dx = master.longitude - center.lng;
              const dy = master.latitude - center.lat;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < minDistance) {
                minDistance = distance;
                closestMarker = master;
              }
            });
            
            // Show popup for closest marker if within reasonable distance and different from last shown
            if (closestMarker && minDistance < 0.005 && closestMarker.id !== lastShownMasterId && map.current) {
              const avatarUrl = closestMarker.profiles.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + closestMarker.profiles.name;
              
              // Remove previous popup with fade
              if (activePopup) {
                activePopup.remove();
              }
              
              // Create and show new popup with fade-in
              activePopup = new mapboxgl.Popup({ 
                offset: 25,
                closeButton: false,
                closeOnClick: false,
                className: 'compact-marker-popup zoom-popup',
                maxWidth: '220px'
              }).setHTML(
                `<div class="popup-content-fade">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <img 
                      src="${avatarUrl}" 
                      alt="${closestMarker.profiles.name}"
                      style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #ec4899; flex-shrink: 0;"
                    />
                    <div style="min-width: 0; flex: 1;">
                      <h3 style="font-weight: 600; margin: 0; font-size: 13px; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${closestMarker.profiles.name}</h3>
                      <div style="display: flex; align-items: center; gap: 3px; font-size: 12px; margin-top: 2px;">
                        <span style="color: #f59e0b;">⭐</span>
                        <span style="color: #666; font-weight: 500;">${closestMarker.rating || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>`
              )
              .setLngLat([closestMarker.longitude, closestMarker.latitude])
              .addTo(map.current);
              
              lastShownMasterId = closestMarker.id;
            }
          } else {
            // Remove popup when zoomed out
            if (activePopup) {
              activePopup.remove();
              activePopup = null;
              lastShownMasterId = null;
            }
          }
        }, 300);
      });
    } catch (error) {
      console.error('Error creating map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [masters, loading, navigate]);

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
