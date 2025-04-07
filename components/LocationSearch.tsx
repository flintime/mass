'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Crosshair, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LocationSearchProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  onCurrentLocation?: () => void;
  isLocating?: boolean;
  className?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export function LocationSearch({ 
  value, 
  onChange, 
  onCurrentLocation, 
  isLocating,
  className 
}: LocationSearchProps) {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const dummyElement = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Google Maps services
  useEffect(() => {
    const initializeGoogleServices = () => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.log('Google Maps not yet loaded');
        return false;
      }

      try {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        dummyElement.current = document.createElement('div');
        placesService.current = new window.google.maps.places.PlacesService(dummyElement.current);
        setIsGoogleLoaded(true);
        return true;
      } catch (error) {
        console.error('Error initializing Google services:', error);
        return false;
      }
    };

    // Try to initialize immediately if Google is already loaded
    if (!isGoogleLoaded) {
      const isInitialized = initializeGoogleServices();
      if (!isInitialized) {
        // If not loaded, listen for the custom event
        const handleGoogleLoaded = () => {
          console.log('Google Maps loaded event received');
          const success = initializeGoogleServices();
          if (success) {
            window.removeEventListener('google-maps-loaded', handleGoogleLoaded);
          }
        };

        window.addEventListener('google-maps-loaded', handleGoogleLoaded);
        return () => window.removeEventListener('google-maps-loaded', handleGoogleLoaded);
      }
    }
  }, [isGoogleLoaded]);

  // Handle predictions
  useEffect(() => {
    const fetchPredictions = async () => {
      if (!value.trim() || !isGoogleLoaded || !autocompleteService.current) {
        setPredictions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
          autocompleteService.current!.getPlacePredictions(
            {
              input: value,
              componentRestrictions: { country: 'us' },
              types: ['geocode', 'establishment']
            },
            (predictions, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                resolve(predictions);
              } else {
                reject(status);
              }
            }
          );
        });

        setPredictions(response);
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchPredictions, 300);
    return () => clearTimeout(timeoutId);
  }, [value, isGoogleLoaded]);

  const handleSelect = async (prediction: Prediction) => {
    if (!placesService.current) {
      console.error('Places service not initialized');
      return;
    }

    try {
      const result = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.current!.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['geometry', 'formatted_address']
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place);
            } else {
              reject(status);
            }
          }
        );
      });

      const lat = result.geometry?.location?.lat();
      const lng = result.geometry?.location?.lng();
      onChange(result.formatted_address || prediction.description, lat, lng);
      setOpen(false);
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setOpen(newValue.trim().length >= 2);
  };

  const handleInputFocus = () => {
    setOpen(value.trim().length >= 2);
  };

  const handleClearInput = () => {
    onChange("");
    setOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center rounded-md shadow-sm border border-input overflow-hidden transition-all duration-200 hover:border-gray-400 focus-within:ring-1 focus-within:ring-violet-400 focus-within:border-violet-400">
        <Input
          ref={inputRef}
          type="text"
          placeholder={isLocating ? "Detecting location..." : "Enter location"}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={() => {
            setTimeout(() => setOpen(false), 200);
          }}
          className={`py-0 h-7 md:h-8 text-xs md:text-sm border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 ${className}`}
          autoComplete="off"
          disabled={isLocating}
        />
        {value && !isLocating && (
          <button 
            type="button"
            onClick={handleClearInput}
            className="absolute right-1.5 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            aria-label="Clear input"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full bg-white rounded-md border shadow-md mt-1 overflow-hidden">
          <Command className="rounded-lg">
            <CommandGroup>
              {onCurrentLocation && (
                <CommandItem
                  onSelect={() => {
                    onCurrentLocation();
                    setOpen(false);
                  }}
                  className="flex items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 text-violet-600 transition-colors"
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      <span className="font-medium text-xs">Detecting location...</span>
                    </>
                  ) : (
                    <>
                      <Crosshair className="h-3 w-3 mr-1.5" />
                      <span className="font-medium text-xs">Use current location</span>
                    </>
                  )}
                </CommandItem>
              )}

              {value.trim() && (
                <>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-2 text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      <span>Loading suggestions...</span>
                    </div>
                  ) : predictions.length > 0 ? (
                    predictions.map((prediction) => (
                      <CommandItem
                        key={prediction.place_id}
                        onSelect={() => handleSelect(prediction)}
                        className="flex flex-col items-start px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900 text-xs">
                          {prediction.structured_formatting.main_text}
                        </span>
                        <span className="text-xs text-gray-500">
                          {prediction.structured_formatting.secondary_text}
                        </span>
                      </CommandItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      No locations found
                    </div>
                  )}
                </>
              )}
            </CommandGroup>
          </Command>
        </div>
      )}
    </div>
  );
} 