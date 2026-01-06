import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '@/lib/mapbox-config';

interface EditableLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number, address: string, city: string) => void;
  className?: string;
}

const EditableLocationMap = ({ 
  latitude, 
  longitude, 
  onLocationChange,
  className = '' 
}: EditableLocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Default to Riga center if no coordinates
    const initialLat = latitude || 56.9496;
    const initialLng = longitude || 24.1052;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialLng, initialLat],
      zoom: 13,
      attributionControl: false,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Wait for map to load
    map.current.on('load', () => {
      setIsMapReady(true);
      // Resize map after load
      map.current?.resize();
    });

    // Reverse geocode function using OpenStreetMap Nominatim for updated street names
    const reverseGeocode = async (lat: number, lng: number) => {
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

    // Add initial marker if coordinates exist
    if (latitude && longitude) {
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-map-marker draggable-marker';
      markerEl.innerHTML = '📍';
      
      marker.current = new mapboxgl.Marker({ 
        element: markerEl,
        draggable: true 
      })
        .setLngLat([longitude, latitude])
        .addTo(map.current);

      // Handle marker drag
      marker.current.on('dragend', async () => {
        if (marker.current) {
          const lngLat = marker.current.getLngLat();
          const { address, city } = await reverseGeocode(lngLat.lat, lngLat.lng);
          onLocationChange(lngLat.lat, lngLat.lng, address, city);
        }
      });
    }

    // Handle map click to set/move marker
    map.current.on('click', async (e) => {
      if (!map.current) return;

      const { lng, lat } = e.lngLat;

      if (marker.current) {
        // Move existing marker
        marker.current.setLngLat([lng, lat]);
      } else {
        // Create new marker
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-map-marker draggable-marker';
        markerEl.innerHTML = '📍';
        
        marker.current = new mapboxgl.Marker({ 
          element: markerEl,
          draggable: true 
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

        // Handle marker drag for newly created marker
        marker.current.on('dragend', async () => {
          if (marker.current) {
            const lngLat = marker.current.getLngLat();
            const { address, city } = await reverseGeocode(lngLat.lat, lngLat.lng);
            onLocationChange(lngLat.lat, lngLat.lng, address, city);
          }
        });
      }

      const { address, city } = await reverseGeocode(lat, lng);
      onLocationChange(lat, lng, address, city);
    });

    // Handle window resize
    const handleResize = () => {
      map.current?.resize();
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update marker position when coordinates change externally
  useEffect(() => {
    if (!map.current || !isMapReady) return;
    
    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=lv`
        );
        const data = await response.json();
        
        if (data && data.address) {
          const addr = data.address;
          let streetAddress = '';
          if (addr.road) {
            streetAddress = addr.road;
            if (addr.house_number) {
              streetAddress += ' ' + addr.house_number;
            }
          }
          
          const city = addr.city || addr.town || addr.village || addr.municipality || '';
          return { address: streetAddress, city };
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
      }
      return { address: '', city: '' };
    };

    if (map.current && latitude && longitude) {
      if (marker.current) {
        marker.current.setLngLat([longitude, latitude]);
      } else {
        const markerEl = document.createElement('div');
        markerEl.className = 'custom-map-marker draggable-marker';
        markerEl.innerHTML = '📍';
        
        marker.current = new mapboxgl.Marker({ 
          element: markerEl,
          draggable: true 
        })
          .setLngLat([longitude, latitude])
          .addTo(map.current);

        marker.current.on('dragend', async () => {
          if (marker.current) {
            const lngLat = marker.current.getLngLat();
            const { address, city } = await reverseGeocode(lngLat.lat, lngLat.lng);
            onLocationChange(lngLat.lat, lngLat.lng, address, city);
          }
        });
      }
      
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 1000
      });
    }
  }, [latitude, longitude]);

  return (
    <div className={`relative w-full h-full min-h-[300px] ${className}`}>
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'pan-x pan-y' }}
      />
    </div>
  );
};

export default EditableLocationMap;
