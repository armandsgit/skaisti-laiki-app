// Ievietojiet savu Mapbox publisko tokenu šeit
// Iegūstiet to no: https://account.mapbox.com/access-tokens/
export const MAPBOX_TOKEN = 'YOUR_MAPBOX_PUBLIC_TOKEN';

// Mapbox Geocoding API
export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  if (!address || address.trim() === '') return null;
  
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=LV&limit=1`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding neizdevās');
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding kļūda:', error);
    return null;
  }
};
