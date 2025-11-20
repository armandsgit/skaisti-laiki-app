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
        
        // Search for address with city context
        const searchQuery = `${value}, ${city}, Latvija`;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&country=LV&limit=10&language=lv&types=address&proximity=${lng},${lat}`
        );
        
        if (response.ok) {
          const data = await response.json();
          // Strict filtering - check if city is in the context
          const filteredFeatures = (data.features || []).filter((feature: any) => {
            // Check if the address context includes our selected city
            const contexts = feature.context || [];
            return contexts.some((ctx: any) => 
              ctx.text_lv?.toLowerCase() === city.toLowerCase() || 
              ctx.text?.toLowerCase() === city.toLowerCase()
            );
          });
          setSuggestions(filteredFeatures);
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
  }, [value, city]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    const [lng, lat] = suggestion.center;
    onChange(suggestion.place_name);
    setOpen(false);
    setSuggestions([]);
    
    if (onSelect) {
      onSelect(suggestion.place_name, lat, lng);
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
            }}
            onFocus={() => {
              // Only show suggestions if we have them and not empty input
              if (suggestions.length > 0 && value.length >= 3) {
                setOpen(true);
              }
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
