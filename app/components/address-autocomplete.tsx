"use client"

import { useEffect, useRef, useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from 'lucide-react'
import { GoogleMapsLoader } from '@/app/lib/google-maps-loader'

interface AddressAutocompleteProps {
  onAddressSelect: (address: {
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
  }) => void;
  defaultValue?: string;
  error?: string;
}

export function AddressAutocomplete({ onAddressSelect, defaultValue = '', error }: AddressAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState(defaultValue)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const autoCompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMountedRef = useRef(true)
  const [isInputMounted, setIsInputMounted] = useState(false)

  // Set up the input mounted state
  useEffect(() => {
    if (inputRef.current) {
      setIsInputMounted(true);
    }
  }, []);

  // Handle Google Maps initialization
  useEffect(() => {
    // Only proceed if the input is mounted
    if (!isInputMounted) return;
    
    isMountedRef.current = true;
    setIsLoading(true);
    setScriptError(null);
    
    const initAutocomplete = () => {
      // Guard against unmounted component
      if (!isMountedRef.current) return;
      
      try {
        if (!inputRef.current) {
          console.error('Input reference is not available');
          setIsLoading(false);
          return;
        }
        
        if (!window.google?.maps?.places) {
          const error = 'Google Maps Places library not available';
          console.error(error);
          setScriptError(error);
          setIsLoading(false);
          return;
        }

        // Use a short delay to ensure DOM stability
        setTimeout(() => {
          if (!isMountedRef.current || !inputRef.current) return;
          
          try {
            // Clear any existing autocomplete to prevent duplicates
            if (autoCompleteRef.current && window.google?.maps?.event) {
              window.google.maps.event.clearInstanceListeners(autoCompleteRef.current);
              autoCompleteRef.current = null;
            }
            
            // Create new autocomplete instance
            autoCompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
              componentRestrictions: { country: 'us' },
              fields: ['address_components', 'formatted_address'],
              types: ['address']
            });

            autoCompleteRef.current.addListener('place_changed', () => {
              const place = autoCompleteRef.current?.getPlace();
              if (place?.address_components) {
                let streetNumber = '';
                let streetName = '';
                let city = '';
                let state = '';
                let zipCode = '';

                place.address_components.forEach((component) => {
                  const types = component.types;

                  if (types.includes('street_number')) {
                    streetNumber = component.long_name;
                  }
                  if (types.includes('route')) {
                    streetName = component.long_name;
                  }
                  if (types.includes('locality')) {
                    city = component.long_name;
                  }
                  if (types.includes('administrative_area_level_1')) {
                    state = component.short_name;
                  }
                  if (types.includes('postal_code')) {
                    zipCode = component.long_name;
                  }
                });

                const streetAddress = `${streetNumber} ${streetName}`.trim();
                setInputValue(streetAddress);
                
                onAddressSelect({
                  street_address: streetAddress,
                  city,
                  state,
                  zip_code: zipCode
                });
              }
            });
            
            console.log('Autocomplete initialized successfully');
          } catch (error) {
            console.error('Error during autocomplete initialization:', error);
            if (isMountedRef.current) {
              setScriptError(error instanceof Error ? error.message : 'Failed to initialize autocomplete');
            }
          } finally {
            if (isMountedRef.current) {
              setIsLoading(false);
            }
          }
        }, 100);
        
      } catch (error) {
        if (!isMountedRef.current) return;
        
        console.error('Error initializing autocomplete:', error);
        setScriptError(error instanceof Error ? error.message : 'Unknown error initializing autocomplete');
        setIsLoading(false);
      }
    };

    // Use the singleton GoogleMapsLoader
    GoogleMapsLoader.load()
      .then(() => {
        if (isMountedRef.current) {
          initAutocomplete();
        }
      })
      .catch((error) => {
        if (isMountedRef.current) {
          console.error('Failed to load Google Maps:', error);
          setScriptError(error.message);
          setIsLoading(false);
        }
      });

    return () => {
      // Mark component as unmounted to prevent state updates
      isMountedRef.current = false;
      
      // Clean up event listeners
      if (autoCompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autoCompleteRef.current);
        autoCompleteRef.current = null;
      }
    };
  }, [onAddressSelect, isInputMounted]);

  return (
    <div className="space-y-2">
      <Label htmlFor="address">Street Address</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          id="address"
          placeholder="Enter your street address"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className={error || scriptError ? 'border-red-500' : ''}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {scriptError && <p className="text-sm text-red-500">Address autocomplete error: {scriptError}</p>}
    </div>
  )
} 