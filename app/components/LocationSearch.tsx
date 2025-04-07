'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, MapPin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface LocationSearchProps {
  value?: string;
  onChange?: (value: string, lat?: number, lng?: number) => void;
  onCurrentLocation?: () => void;
  isLocating?: boolean;
  onLocationSelect?: (location: google.maps.places.PlaceResult) => void;
  className?: string;
}

export function LocationSearch({ 
  value: propValue, 
  onChange, 
  onCurrentLocation,
  isLocating,
  onLocationSelect, 
  className 
}: LocationSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(propValue || '')
  const [inputValue, setInputValue] = React.useState(propValue || '')
  const [predictions, setPredictions] = React.useState<google.maps.places.AutocompletePrediction[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const autocompleteServiceRef = React.useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = React.useRef<google.maps.places.PlacesService | null>(null)

  const initializeGoogleServices = React.useCallback(() => {
    try {
      if (window.google?.maps) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
        // Create a dummy div for PlacesService (required)
        const dummyElement = document.createElement('div')
        placesServiceRef.current = new window.google.maps.places.PlacesService(dummyElement)
        setLoading(false)
        setError(null)
        console.log('Google Maps services initialized successfully')
      } else {
        setError('Google Maps not loaded')
        console.error('Google Maps not loaded')
      }
    } catch (err) {
      setError('Failed to initialize Google services')
      console.error('Error initializing Google services:', err)
    }
  }, [])

  React.useEffect(() => {
    const handleGoogleMapsLoaded = () => {
      console.log('Google Maps loaded event received')
      initializeGoogleServices()
    }

    // If Google Maps is already loaded, initialize services
    if (window.google?.maps) {
      initializeGoogleServices()
    }

    // Listen for the custom event
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded)

    return () => {
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded)
    }
  }, [initializeGoogleServices])

  const handleSearch = React.useCallback(async (input: string) => {
    if (!input.trim() || !autocompleteServiceRef.current) return

    try {
      const response = await autocompleteServiceRef.current.getPlacePredictions({
        input,
        componentRestrictions: { country: 'us' },
        types: ['geocode', 'establishment']
      })
      setPredictions(response.predictions)
    } catch (err) {
      console.error('Error getting place predictions:', err)
      setError('Failed to get location suggestions')
    }
  }, [])

  const handleSelect = React.useCallback(async (placeId: string) => {
    if (!placesServiceRef.current) {
      console.error('Places service not initialized')
      return
    }

    try {
      placesServiceRef.current.getDetails(
        {
          placeId: placeId,
          fields: ['name', 'formatted_address', 'geometry', 'place_id']
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            // Call both callbacks if provided
            if (onLocationSelect) {
              onLocationSelect(place);
            }
            if (onChange && place.geometry?.location) {
              onChange(
                place.formatted_address || '',
                place.geometry.location.lat(),
                place.geometry.location.lng()
              );
            }
            setValue(place.formatted_address || '')
            setOpen(false)
          } else {
            console.error('Error getting place details:', status)
            setError('Failed to get location details')
          }
        }
      )
    } catch (err) {
      console.error('Error in handleSelect:', err)
      setError('Failed to select location')
    }
  }, [onLocationSelect, onChange])

  React.useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (value) {
        handleSearch(value)
      } else {
        setPredictions([])
      }
    }, 300)

    return () => clearTimeout(debounceTimeout)
  }, [value, handleSearch])

  // Handle direct input changes
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setValue(newValue);
  };

  // Clear the input completely
  const handleClearInput = () => {
    setInputValue('');
    setValue('');
    setPredictions([]);
    if (onChange) {
      onChange('');
    }
  };

  // Update internal value when prop changes
  React.useEffect(() => {
    if (propValue !== undefined) {
      setValue(propValue);
      setInputValue(propValue);
    }
  }, [propValue]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (loading) {
    return <div>Loading location search...</div>
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between', className)}
          >
            {value || 'Select location...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] md:w-[400px] p-0 rounded-lg border-none shadow-lg" align="start">
          <Command className="rounded-lg">
            <div className="relative">
              <CommandInput
                placeholder="Enter location..."
                value={inputValue}
                onValueChange={handleInputChange}
                className="h-8 md:h-10 text-xs md:text-sm pr-8"
              />
              {inputValue && (
                <button 
                  onClick={handleClearInput} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-y-auto">
              {predictions.map((prediction) => (
                <CommandItem
                  key={prediction.place_id}
                  value={prediction.place_id}
                  onSelect={handleSelect}
                  className="py-1.5 px-2 text-xs md:text-sm"
                >
                  <Check
                    className={cn(
                      'mr-2 h-3 w-3 md:h-4 md:w-4',
                      value === prediction.description ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {prediction.description}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {onCurrentLocation && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCurrentLocation}
          className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-violet-600"
          disabled={isLocating}
        >
          {isLocating ? (
            <div className="h-4 w-4 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
} 