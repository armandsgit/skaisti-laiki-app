import { useEffect, useRef } from 'react';
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
}

const LocationMap = ({ latitude, longitude, address, className = '', showOpenButton = true }: LocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 15,
    });

    // Create custom marker
    const markerEl = document.createElement('div');
    markerEl.className = 'custom-map-marker';
    markerEl.innerHTML = '📍';

    new mapboxgl.Marker({ element: markerEl })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Pievienot navigācijas kontroles
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [latitude, longitude]);

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
  };

  return (
    <div className="space-y-2 sm:space-y-3 w-full">
      <div 
        ref={mapContainer} 
        className={`map-container rounded-2xl overflow-hidden border shadow-sm w-full ${className}`}
        style={{ 
          height: '320px',
          maxHeight: '320px',
          minHeight: '320px',
          maxWidth: '100%',
          width: '100%',
          touchAction: 'pan-x pan-y'
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
