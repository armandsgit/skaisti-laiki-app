import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, X } from 'lucide-react';
import { CityAutocomplete } from './CityAutocomplete';
import { AddressAutocomplete } from './AddressAutocomplete';
import { getUserLocation } from '@/lib/distance-utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SavedLocation {
  name: string;
  lat: number;
  lon: number;
  isManual: boolean;
}

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (location: SavedLocation) => void;
  currentLocation?: SavedLocation | null;
}

export const LocationPickerModal = ({
  open,
  onOpenChange,
  onLocationSelect,
  currentLocation
}: LocationPickerModalProps) => {
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setCity('');
      setAddress('');
      setSelectedCoords(null);
    }
  }, [open]);

  const handleCityChange = (value: string) => {
    setCity(value);
    setAddress('');
    setSelectedCoords(null);
  };

  const handleAddressSelect = (addressValue: string, lat: number, lng: number) => {
    setAddress(addressValue);
    setSelectedCoords({ lat, lon: lng });
  };

  const handleSave = () => {
    if (!city || !address || !selectedCoords) return;

    const locationName = `${address}, ${city}`;
    onLocationSelect({
      name: locationName,
      lat: selectedCoords.lat,
      lon: selectedCoords.lon,
      isManual: true
    });
    onOpenChange(false);
  };

  const handleUseCurrentLocation = async () => {
    setIsLoadingGPS(true);
    try {
      const location = await getUserLocation();
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lon}&zoom=18&addressdetails=1&accept-language=lv`
      );
      const data = await response.json();
      
      let locationName = 'Pašreizējā atrašanās vieta';
      if (data && data.address) {
        const addr = data.address;
        const parts: string[] = [];
        
        if (addr.road) {
          let street = addr.road;
          if (addr.house_number) {
            street += ' ' + addr.house_number;
          }
          parts.push(street);
        }
        
        const cityName = addr.city || addr.town || addr.village || '';
        if (cityName) {
          parts.push(cityName);
        }
        
        locationName = parts.join(', ') || 'Latvija';
      }
      
      onLocationSelect({
        name: locationName,
        lat: location.lat,
        lon: location.lon,
        isManual: false
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setIsLoadingGPS(false);
    }
  };

  const handleClearSavedLocation = () => {
    localStorage.removeItem('userSavedLocation');
    handleUseCurrentLocation();
  };

  const content = (
    <div className="space-y-4">
      <Button
        variant="outline"
        className="w-full justify-start gap-3 h-12 text-sm"
        onClick={handleUseCurrentLocation}
        disabled={isLoadingGPS}
      >
        <Navigation className="h-5 w-5 text-primary flex-shrink-0" />
        <span className="truncate">
          {isLoadingGPS ? 'Nosaka atrašanās vietu...' : 'Izmantot pašreizējo atrašanās vietu'}
        </span>
      </Button>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">vai ievadiet manuāli</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Pilsēta</label>
        <CityAutocomplete
          value={city}
          onChange={handleCityChange}
          placeholder="Izvēlieties pilsētu"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Adrese</label>
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={handleAddressSelect}
          city={city}
          placeholder={city ? "Ievadiet adresi" : "Vispirms izvēlieties pilsētu"}
          disabled={!city}
        />
      </div>

      <Button
        className="w-full h-12 mt-2"
        onClick={handleSave}
        disabled={!city || !address || !selectedCoords}
      >
        <MapPin className="h-4 w-4 mr-2" />
        Saglabāt atrašanās vietu
      </Button>

      {currentLocation?.isManual && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground h-10"
          onClick={handleClearSavedLocation}
        >
          <X className="h-4 w-4 mr-2" />
          Noņemt saglabāto adresi
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="text-center pb-4">
            <DrawerTitle className="text-lg font-semibold">
              Izvēlieties atrašanās vietu
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold">
            Izvēlieties atrašanās vietu
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
