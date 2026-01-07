/**
 * Aprēķina attālumu starp divām ģeogrāfiskajām koordinātēm kilometros
 * Izmantojot Haversine formulu
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Zemes rādiuss kilometros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Noapaļo līdz 1 decimālzīmei
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Mēģina iegūt lietotāja pašreizējās atrašanās vietas koordinātes
 * Ja neizdodas, atgriež Rīgas koordinātes kā noklusējumu
 */
export async function getUserLocation(): Promise<{ lat: number; lon: number }> {
  // Rīgas koordinātes kā noklusējums
  const defaultLocation = { lat: 56.9496, lon: 24.1052 };
  
  if (!navigator.geolocation) {
    console.warn('Geolocation nav atbalstīta šajā pārlūkprogrammā');
    return defaultLocation;
  }
  
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Neizdevās iegūt atrašanās vietu:', error.message);
        resolve(defaultLocation);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Always get fresh location
      }
    );
  });
}
