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
  };
}

const AllMastersMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [masters, setMasters] = useState<Master[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    const { data } = await supabase
      .from('professional_profiles')
      .select(`
        id,
        latitude,
        longitude,
        address,
        category,
        rating,
        profiles!professional_profiles_user_id_fkey(name)
      `)
      .eq('approved', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (data) {
      setMasters(data as any);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Noteikt kartes centru
    let center: [number, number];
    let zoom: number;

    if (masters.length > 0) {
      // Vidējās koordinātes, ja ir meistari
      const avgLat = masters.reduce((sum, m) => sum + m.latitude, 0) / masters.length;
      const avgLng = masters.reduce((sum, m) => sum + m.longitude, 0) / masters.length;
      center = [avgLng, avgLat];
      zoom = 10;
    } else {
      // Latvijas centrs, ja nav meistaru
      center = [24.6032, 56.8796];
      zoom = 7;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
    });

    // Pievienot navigācijas kontroles
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Pievienot marķierus katram meistaram
    masters.forEach((master) => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
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

      const marker = new mapboxgl.Marker({ color: '#ec4899' })
        .setLngLat([master.longitude, master.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Klikšķis uz marķiera atver profilu
      marker.getElement().addEventListener('click', () => {
        navigate(`/professional/${master.id}`);
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [masters, navigate]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: '500px' }}>
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg overflow-hidden border shadow-sm"
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
