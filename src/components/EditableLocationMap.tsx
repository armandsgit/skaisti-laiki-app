import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface EditableLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number, address: string, city: string) => void;
  className?: string;
}

// Custom pin marker icon
const pinIcon = L.divIcon({
  className: 'custom-leaflet-marker draggable-marker',
  html: '<div style="font-size: 32px; text-align: center;">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Reverse geocode using OpenStreetMap Nominatim
const reverseGeocode = async (lat: number, lng: number): Promise<{ address: string; city: string }> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=lv`
    );
    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      // Build street address
      let streetAddress = '';
      if (addr.road) {
        streetAddress = addr.road;
        if (addr.house_number) {
          streetAddress += ' ' + addr.house_number;
        }
      }
      
      // Get city
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      
      return { address: streetAddress, city };
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
  }
  return { address: '', city: '' };
};

// Component to handle map clicks and marker placement
interface MapEventsHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

const MapEventsHandler = ({ onLocationSelect }: MapEventsHandlerProps) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to fly to new coordinates
interface FlyToPositionProps {
  position: [number, number] | null;
}

const FlyToPosition = ({ position }: FlyToPositionProps) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 });
    }
  }, [map, position]);
  
  return null;
};

// Component to handle map resizing
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    setTimeout(() => map.invalidateSize(), 100);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);
  
  return null;
};

// Draggable marker component
interface DraggableMarkerProps {
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}

const DraggableMarker = ({ position, onDragEnd }: DraggableMarkerProps) => {
  const markerRef = useRef<L.Marker>(null);
  
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const latlng = marker.getLatLng();
        onDragEnd(latlng.lat, latlng.lng);
      }
    },
  };
  
  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={pinIcon}
    />
  );
};

const EditableLocationMap = ({ 
  latitude, 
  longitude, 
  onLocationChange,
  className = '' 
}: EditableLocationMapProps) => {
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [flyToPosition, setFlyToPosition] = useState<[number, number] | null>(null);

  // Default center is Riga
  const defaultCenter: [number, number] = [56.9496, 24.1052];
  const center = latitude && longitude ? [latitude, longitude] as [number, number] : defaultCenter;

  const handleLocationSelect = useCallback(async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    const { address, city } = await reverseGeocode(lat, lng);
    onLocationChange(lat, lng, address, city);
  }, [onLocationChange]);

  const handleMarkerDragEnd = useCallback(async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    const { address, city } = await reverseGeocode(lat, lng);
    onLocationChange(lat, lng, address, city);
  }, [onLocationChange]);

  // Update marker when external coordinates change
  useEffect(() => {
    if (latitude && longitude) {
      const newPos: [number, number] = [latitude, longitude];
      setMarkerPosition(newPos);
      setFlyToPosition(newPos);
    }
  }, [latitude, longitude]);

  return (
    <div className={`relative w-full h-full min-h-[300px] ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'pan-x pan-y' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapEventsHandler onLocationSelect={handleLocationSelect} />
        <FlyToPosition position={flyToPosition} />
        <MapResizer />
        {markerPosition && (
          <DraggableMarker 
            position={markerPosition} 
            onDragEnd={handleMarkerDragEnd}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default EditableLocationMap;
