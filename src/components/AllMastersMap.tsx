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
          profiles!professional_profiles_user_id_fkey(name, avatar)
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

      // Kārto meistarus pēc prioritātes
      const sortedMasters = getSortedMasters(data || [], location.lat, location.lon);
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
    const zoom = 11;

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

        // Hover popup (name, avatar and rating)
        const avatarUrl = master.profiles.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + master.profiles.name;
        
        const hoverPopup = new mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          closeOnClick: false
        }).setHTML(
          `<div style="padding: 8px 12px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img 
                src="${avatarUrl}" 
                alt="${master.profiles.name}"
                style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #ec4899;"
              />
              <div>
                <h3 style="font-weight: 600; margin-bottom: 2px; font-size: 14px; color: #1a1a1a;">${master.profiles.name}</h3>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 13px;">
                  <span style="color: #f59e0b;">⭐</span>
                  <span style="color: #666;">${master.rating || 0}</span>
                </div>
              </div>
            </div>
          </div>`
        );

        // Create custom marker with gradient
        const markerEl = document.createElement('div');
        markerEl.style.cssText = `
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
          pointer-events: auto;
        `;
        markerEl.innerHTML = '✨';

        const marker = new mapboxgl.Marker({ 
          element: markerEl,
          anchor: 'center'
        })
          .setLngLat([master.longitude, master.latitude])
          .addTo(map.current);

        // Hover effects - directly on markerEl
        markerEl.addEventListener('mouseenter', () => {
          markerEl.style.width = '38px';
          markerEl.style.height = '38px';
          markerEl.style.fontSize = '18px';
          markerEl.style.boxShadow = '0 6px 16px rgba(236, 72, 153, 0.7)';
          if (map.current) {
            hoverPopup.setLngLat([master.longitude, master.latitude]).addTo(map.current);
          }
        });

        markerEl.addEventListener('mouseleave', () => {
          markerEl.style.width = '32px';
          markerEl.style.height = '32px';
          markerEl.style.fontSize = '16px';
          markerEl.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.5)';
          hoverPopup.remove();
        });

        // Click event
        markerEl.addEventListener('click', () => {
          hoverPopup.remove();
          if (map.current) {
            clickPopup.setLngLat([master.longitude, master.latitude]).addTo(map.current);
          }
          navigate(`/professional/${master.id}`);
        });
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
    <div className="relative w-full h-full">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 rounded-lg overflow-hidden border shadow-sm"
        style={{ minHeight: '600px' }}
      />
      {masters.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-card/95 backdrop-blur-sm p-6 rounded-lg shadow-lg border max-w-sm text-center">
            <p className="text-lg font-semibold mb-2">Nav pieejamu meistaru</p>
            <p className="text-sm text-muted-foreground">
              Pašlaik sistēmā nav reģistrētu meistaru ar adresi vai viņi gaida administratora apstiprinājumu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMastersMap;
