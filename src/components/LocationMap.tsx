import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

// Custom rating marker icon
const createRatingIcon = (rating: number | null) => {
  const displayRating = rating ? rating.toFixed(1) : '0.0';
  
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="marker-container">
        <div class="marker-badge" style="background: #000000; border: 2px solid #FFFFFF; border-radius: 100px; padding: 5px 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; min-width: 48px;">
          <span class="marker-rating" style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #FFFFFF; line-height: 1;">${displayRating}</span>
        </div>
        <div class="marker-pointer" style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #000000; margin-top: -2px; margin-left: auto; margin-right: auto;"></div>
      </div>
    `,
    iconSize: [48, 40],
    iconAnchor: [24, 40],
  });
};

// Component to handle map resizing
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    // Initial resize after mount
    setTimeout(() => map.invalidateSize(), 100);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);
  
  return null;
};

const LocationMap = ({ latitude, longitude, address, className = '', showOpenButton = true, professionalName, rating }: LocationMapProps) => {
  const [isMapReady, setIsMapReady] = useState(false);

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
  };

  const ratingIcon = createRatingIcon(rating);

  return (
    <div className="relative w-full space-y-2 sm:space-y-3">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        className={`relative w-full h-[280px] sm:h-[320px] rounded-2xl overflow-hidden border shadow-sm ${className}`}
        style={{ 
          touchAction: 'pan-x pan-y',
          maxWidth: '100%'
        }}
        zoomControl={true}
        attributionControl={false}
        whenReady={() => setIsMapReady(true)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={[latitude, longitude]} icon={ratingIcon} />
        <MapResizer />
      </MapContainer>
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
