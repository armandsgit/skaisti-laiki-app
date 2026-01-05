import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin } from 'lucide-react';
import { MAPBOX_TOKEN } from '@/lib/mapbox-config';
import { toast } from 'sonner';

interface AddressSuggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  disabled?: boolean;
  city?: string; // Add city context for better results
}

export const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onSelect,
  placeholder = "Ievadiet adresi",
  disabled = false,
  city = ''
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Only show suggestions if we have at least 3 characters and city is selected
    if (value.length < 3 || !city) {
      setSuggestions([]);
      return;
    }

    // Debounce the search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        // First get city coordinates to use as proximity
        const cityResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${MAPBOX_TOKEN}&country=LV&types=place&limit=1&language=lv`
        );
        
        if (!cityResponse.ok) {
          setSuggestions([]);
          return;
        }

        const cityData = await cityResponse.json();
        if (!cityData.features || cityData.features.length === 0) {
          setSuggestions([]);
          return;
        }

        const [lng, lat] = cityData.features[0].center;
        
        // Search for addresses with city context - use multiple types for better results
        const searchQuery = `${value}, ${city}`;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&country=LV&limit=10&language=lv&types=address,poi&proximity=${lng},${lat}&autocomplete=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Filter to prioritize addresses from selected city but allow nearby
          const filteredFeatures = (data.features || []).filter((feature: any) => {
            // Check if it's in the selected city or nearby
            const contexts = feature.context || [];
            const isInCity = contexts.some((ctx: any) => 
              ctx.text_lv?.toLowerCase() === city.toLowerCase() || 
              ctx.text?.toLowerCase() === city.toLowerCase()
            );
            // Also check if place_name contains the city
            const placeNameHasCity = feature.place_name?.toLowerCase().includes(city.toLowerCase());
            return isInCity || placeNameHasCity;
          });
          
          const results = filteredFeatures.length > 0 ? filteredFeatures : data.features || [];
          setSuggestions(results);
          // Auto-open popover when results arrive and input is focused
          if (results.length > 0 && isFocused) {
            setOpen(true);
          }
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Address search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value, city, isFocused]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    const [lng, lat] = suggestion.center;
    // Extract just street name without postcode
    const fullName = suggestion.place_name;
    // Remove postcode if present
    const nameWithoutPostcode = fullName.replace(/,\s*\d{4}\s*,/, ',');
    // Get just the street part (before first comma)
    const streetName = nameWithoutPostcode.split(',')[0].trim();
    
    onChange(streetName);
    setOpen(false);
    setSuggestions([]);
    
    if (onSelect) {
      onSelect(streetName, lat, lng);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              // Open popover if we have suggestions
              if (suggestions.length > 0) {
                setOpen(true);
              }
            }}
            onFocus={() => {
              setIsFocused(true);
              // Show suggestions if we have them
              if (suggestions.length > 0 && value.length >= 3) {
                setOpen(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setIsFocused(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder={!city ? "Vispirms izvēlieties pilsētu" : "Piemēram: Latgales iela 245"}
            disabled={disabled || !city}
            className="pl-9"
          />
        </div>
      </PopoverTrigger>
      {suggestions.length > 0 && (
        <PopoverContent 
          className="p-0 w-[400px]" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {loading ? (
                <CommandEmpty>Meklē adreses...</CommandEmpty>
              ) : (
                <CommandGroup>
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={index}
                      value={suggestion.place_name}
                      onSelect={() => handleSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{suggestion.place_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
};
