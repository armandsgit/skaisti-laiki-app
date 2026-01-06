import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin } from 'lucide-react';

interface CitySuggestion {
  display_name: string;
  name: string;
  lat: string;
  lon: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CityAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Ievadiet pilsētu",
  disabled = false 
}: CityAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (value.length < 2) {
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
        // Search for cities in Latvia using OpenStreetMap Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=lv&limit=10&featuretype=city&accept-language=lv`
        );
        
        if (response.ok) {
          const data = await response.json();
          // Filter to only show places that look like cities/towns
          const filteredData = (data || []).filter((item: any) => 
            item.type === 'city' || 
            item.type === 'town' || 
            item.type === 'village' ||
            item.type === 'administrative' ||
            item.class === 'place'
          );
          setSuggestions(filteredData);
          if (filteredData.length > 0) {
            setOpen(true);
          }
        }
      } catch (error) {
        console.error('City search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value]);

  const handleSelect = (suggestion: CitySuggestion) => {
    // Extract just the city name from display_name
    const cityName = suggestion.display_name.split(',')[0].trim();
    onChange(cityName);
    setOpen(false);
    setSuggestions([]);
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
              // Only show suggestions if we have them
              if (suggestions.length > 0 && value.length >= 2) {
                setOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
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
                <CommandEmpty>Meklē pilsētas...</CommandEmpty>
              ) : (
                <CommandGroup>
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={index}
                      value={suggestion.display_name}
                      onSelect={() => handleSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{suggestion.display_name}</span>
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
