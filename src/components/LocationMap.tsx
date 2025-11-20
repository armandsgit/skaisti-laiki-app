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

    // Check if token is available
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === '' || MAPBOX_TOKEN === 'YOUR_MAPBOX_PUBLIC_TOKEN') {
      console.error('Mapbox token is not configured. Please add VITE_MAPBOX_PUBLIC_TOKEN to secrets.');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 14,
    });

    // Pievienot marķieri
    new mapboxgl.Marker({ color: '#ec4899' })
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

  // Show error message if token is not configured
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === '' || MAPBOX_TOKEN === 'YOUR_MAPBOX_PUBLIC_TOKEN') {
    return (
      <div className="space-y-3">
        <div className="p-4 border rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            Karte nav pieejama. Mapbox tokens nav konfigurēts.
          </p>
        </div>
        {showOpenButton && (
          <button
            onClick={openInGoogleMaps}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Atvērt Google Maps
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div 
        ref={mapContainer} 
        className={`rounded-lg overflow-hidden border shadow-sm ${className}`}
        style={{ height: '300px' }}
      />
      {showOpenButton && (
        <button
          onClick={openInGoogleMaps}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          Atvērt Google Maps
        </button>
      )}
    </div>
  );
};

export default LocationMap;
