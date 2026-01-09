import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin } from 'lucide-react';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
  };
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
        // Search for addresses with city context using OpenStreetMap Nominatim
        // This will have updated street names like Latgales iela instead of Maskavas iela
        const searchQuery = `${value}, ${city}, Latvija`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=lv&limit=10&addressdetails=1&accept-language=lv`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Filter to prioritize addresses from selected city
          const filteredResults = (data || []).filter((item: AddressSuggestion) => {
            const itemCity = item.address?.city || item.address?.town || item.address?.village || '';
            return itemCity.toLowerCase() === city.toLowerCase() || 
                   item.display_name.toLowerCase().includes(city.toLowerCase());
          });
          
          const results = filteredResults.length > 0 ? filteredResults : data || [];
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
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    // Build street address from address components
    let streetName = '';
    if (suggestion.address?.road) {
      streetName = suggestion.address.road;
      if (suggestion.address?.house_number) {
        streetName += ' ' + suggestion.address.house_number;
      }
    } else {
      // Fallback to first part of display name
      streetName = suggestion.display_name.split(',')[0].trim();
    }
    
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
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
            className="pl-10"
          />
        </div>
      </PopoverTrigger>
      {suggestions.length > 0 && (
        <PopoverContent 
          className="p-0 w-[calc(100vw-2.5rem)] max-w-[400px]" 
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
                      value={suggestion.display_name}
                      onSelect={() => handleSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{suggestion.display_name}</span>
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
