import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '@/lib/mapbox-config';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Master {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  rating: number;
  profiles: {
    name: string;
    avatar?: string;
  };
}

const AllMastersMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select(`
          id,
          latitude,
          longitude,
          address,
          category,
          rating,
          profiles!professional_profiles_user_id_fkey(name, avatar)
        `)
        .eq('approved', true)
        .eq('is_blocked', false)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('Error loading masters:', error);
        return;
      }

      setMasters(data as any);
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

        // Create custom marker element with modern beauty icon
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-marker';
        markerEl.innerHTML = '✨';
        markerEl.style.cssText = `
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
          border-radius: 50% 50% 50% 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
          transform: rotate(-45deg);
          border: 3px solid white;
          transition: all 0.2s ease;
        `;
        
        markerEl.querySelector('span') || (markerEl.innerHTML = `<span style="transform: rotate(45deg); display: block;">✨</span>`);

        const marker = new mapboxgl.Marker({ 
          element: markerEl,
          anchor: 'bottom'
        })
          .setLngLat([master.longitude, master.latitude])
          .addTo(map.current);

        const markerElement = marker.getElement();

        // Hover effects
        markerElement.addEventListener('mouseenter', () => {
          markerEl.style.transform = 'rotate(-45deg) scale(1.1)';
          markerEl.style.boxShadow = '0 6px 16px rgba(236, 72, 153, 0.6)';
          console.log('Hover on:', master.profiles.name);
          if (map.current) {
            hoverPopup.setLngLat([master.longitude, master.latitude]).addTo(map.current);
          }
        });

        markerElement.addEventListener('mouseleave', () => {
          markerEl.style.transform = 'rotate(-45deg) scale(1)';
          markerEl.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.4)';
          console.log('Leave:', master.profiles.name);
          hoverPopup.remove();
        });

        // Click event - remove hover popup and show detailed one
        markerElement.addEventListener('click', () => {
          console.log('Click on:', master.profiles.name);
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
