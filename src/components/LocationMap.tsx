import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '@/lib/mapbox-config';
import { MapPin } from 'lucide-react';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  className?: string;
  showOpenButton?: boolean;
  professionalName?: string;
  rating?: number | null;
}

const LocationMap = ({ latitude, longitude, address, className = '', showOpenButton = true, professionalName, rating }: LocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 15,
      attributionControl: false,
    });

    // Wait for map to load
    map.current.on('load', () => {
      setIsMapReady(true);
      map.current?.resize();
    });

    // Create custom marker - same style as AllMastersMap with rating
    const markerEl = document.createElement('div');
    markerEl.className = 'custom-map-marker';
    
    const displayRating = rating ? rating.toFixed(1) : '0.0';
    
    markerEl.innerHTML = `
      <div class="marker-container">
        <div class="marker-badge" style="background: #000000; border: 2px solid #FFFFFF; border-radius: 100px; padding: 5px 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; min-width: 48px;">
          <span class="marker-rating" style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #FFFFFF; line-height: 1;">${displayRating}</span>
        </div>
        <div class="marker-pointer" style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #000000; margin-top: -2px;"></div>
      </div>
    `;

    new mapboxgl.Marker({ 
      element: markerEl,
      anchor: 'bottom'
    })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Pievienot navigācijas kontroles
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Handle window resize
    const handleResize = () => {
      map.current?.resize();
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude]);

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
  };

  return (
    <div className="relative w-full space-y-2 sm:space-y-3">
      <div 
        ref={mapContainer} 
        className={`relative w-full h-[280px] sm:h-[320px] rounded-2xl overflow-hidden border shadow-sm ${className}`}
        style={{ 
          touchAction: 'pan-x pan-y',
          maxWidth: '100%'
        }}
      />
      {showOpenButton && (
        <button
          onClick={openInGoogleMaps}
          className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-primary tap-feedback whitespace-nowrap"
        >
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          Skatīt kartē →
        </button>
      )}
    </div>
  );
};

export default LocationMap;
