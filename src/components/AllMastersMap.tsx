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
    if (!mapContainer.current || !masters.length || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Noteikt kartes centru (vidējās koordinātes)
    const avgLat = masters.reduce((sum, m) => sum + m.latitude, 0) / masters.length;
    const avgLng = masters.reduce((sum, m) => sum + m.longitude, 0) / masters.length;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [avgLng, avgLat],
      zoom: 10,
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
    <div 
      ref={mapContainer} 
      className="w-full h-full rounded-lg overflow-hidden border shadow-sm"
      style={{ minHeight: '500px' }}
    />
  );
};

export default AllMastersMap;
