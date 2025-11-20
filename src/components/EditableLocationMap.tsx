import { useEffect, useRef } from 'react';
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
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Reverse geocode function
    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&country=LV&types=address`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const place = feature.place_name;
          
          // Extract street address (first part before comma)
          const addressParts = place.split(',');
          const streetAddress = addressParts[0] || '';
          
          // Extract city from context
          let city = '';
          if (feature.context) {
            const cityContext = feature.context.find((c: any) => c.id.startsWith('place'));
            city = cityContext?.text || '';
          }
          
          return { address: streetAddress, city };
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
      }
      return { address: '', city: '' };
    };

    // Add initial marker if coordinates exist
    const isMobile = window.innerWidth < 640;
    
    if (latitude && longitude) {
      const markerEl = document.createElement('div');
      markerEl.style.cssText = `
        width: ${isMobile ? '40px' : '32px'};
        height: ${isMobile ? '40px' : '32px'};
        background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(236, 72, 153, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isMobile ? '20px' : '16px'};
        cursor: grab;
      `;
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

      const isMobile = window.innerWidth < 640;
      
      if (marker.current) {
        // Move existing marker
        marker.current.setLngLat([lng, lat]);
      } else {
        // Create new marker
        const markerEl = document.createElement('div');
        markerEl.style.cssText = `
          width: ${isMobile ? '40px' : '32px'};
          height: ${isMobile ? '40px' : '32px'};
          background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isMobile ? '20px' : '16px'};
          cursor: grab;
        `;
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

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update marker position when coordinates change externally
  useEffect(() => {
    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&country=LV&types=address`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const place = feature.place_name;
          
          // Extract street address (first part before comma)
          const addressParts = place.split(',');
          const streetAddress = addressParts[0] || '';
          
          // Extract city from context
          let city = '';
          if (feature.context) {
            const cityContext = feature.context.find((c: any) => c.id.startsWith('place'));
            city = cityContext?.text || '';
          }
          
          return { address: streetAddress, city };
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
      }
      return { address: '', city: '' };
    };

    if (map.current && latitude && longitude) {
      const isMobile = window.innerWidth < 640;
      
      if (marker.current) {
        marker.current.setLngLat([longitude, latitude]);
      } else {
        const markerEl = document.createElement('div');
        markerEl.style.cssText = `
          width: ${isMobile ? '40px' : '32px'};
          height: ${isMobile ? '40px' : '32px'};
          background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isMobile ? '20px' : '16px'};
          cursor: grab;
        `;
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

  const isMobile = window.innerWidth < 640;
  
  return (
    <div className="space-y-2 w-full">
      <div 
        ref={mapContainer} 
        className={`map-container rounded-2xl overflow-hidden border shadow-sm w-full ${className}`}
        style={{ 
          height: isMobile ? '320px' : '220px',
          maxHeight: isMobile ? '320px' : '220px',
          minHeight: isMobile ? '320px' : '220px',
          maxWidth: '100%',
          width: '100%'
        }}
      />
      <p className="text-xs text-muted-foreground">
        Noklikšķiniet uz kartes, lai atzīmētu savu atrašanās vietu. Marķieri var arī vilkt.
      </p>
    </div>
  );
};

export default EditableLocationMap;
