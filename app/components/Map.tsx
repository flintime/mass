'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MapProps {
  locations: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  hoveredId?: string;
  center?: { lat: number; lng: number };
  onViewportChange?: (
    center: { lat: number; lng: number },
    bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }
  ) => void;
}

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export function Map({ locations, hoveredId, center, onViewportChange }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializationAttempts = useRef(0);
  const maxAttempts = 10; // Increase max attempts
  const attemptDelay = 1000; // 1 second

  const initializeMap = useCallback(async () => {
    if (!mapRef.current) {
      console.error('Map container ref is null');
      return;
    }
    
    try {
      console.log('Attempting to initialize map...', {
        attempt: initializationAttempts.current + 1,
        hasGoogleMaps: !!window.google?.maps,
        center,
        locationsCount: locations.length,
        locationSample: locations.length > 0 ? locations[0] : null
      });

      // Check if Google Maps is available
      if (!window.google?.maps) {
        initializationAttempts.current += 1;
        console.log(`Attempt ${initializationAttempts.current} of ${maxAttempts}`);
        
        if (initializationAttempts.current < maxAttempts) {
          setTimeout(initializeMap, attemptDelay);
          return;
        }
        
        setError('Google Maps failed to load. Please refresh the page.');
        setIsLoading(false);
        return;
      }

      // Initialize map if not already initialized
      if (!googleMapRef.current) {
        const defaultCenter = center || { lat: 40.7128, lng: -74.0060 }; // NYC default
        console.log('Initializing map with center:', defaultCenter);
        
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 12,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Add viewport change listener
        if (onViewportChange) {
          googleMapRef.current.addListener('idle', () => {
            const newCenter = googleMapRef.current?.getCenter();
            const bounds = googleMapRef.current?.getBounds();
            if (newCenter && bounds) {
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              onViewportChange(
                { lat: newCenter.lat(), lng: newCenter.lng() },
                {
                  ne: { lat: ne.lat(), lng: ne.lng() },
                  sw: { lat: sw.lat(), lng: sw.lng() }
                }
              );
            }
          });
        }
      }

      // Update map center if provided
      if (center && googleMapRef.current) {
        console.log('Updating map center to:', center);
        googleMapRef.current.setCenter(center);
      }

      // Clear existing markers
      Object.values(markersRef.current).forEach(marker => marker.setMap(null));
      markersRef.current = {};

      // Add markers for locations
      console.log('Adding markers for locations:', {
        count: locations.length,
        sample: locations.slice(0, 3)
      });
      
      if (locations.length === 0) {
        console.warn('No valid locations to display on map');
      }
      
      locations.forEach(location => {
        if (!googleMapRef.current || !isValidCoordinates(location.lat, location.lng)) {
          console.warn('Invalid coordinates for location:', location);
          return;
        }

        console.log('Creating marker for:', {
          id: location.id,
          name: location.name,
          lat: location.lat,
          lng: location.lng,
          isHovered: hoveredId === location.id
        });

        const marker = new window.google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: googleMapRef.current,
          title: location.name,
          animation: hoveredId === location.id ? google.maps.Animation.BOUNCE : undefined
        });

        marker.addListener('click', () => {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div class="p-2"><h3 class="font-semibold">${location.name}</h3></div>`
          });
          infoWindow.open(googleMapRef.current, marker);
        });

        markersRef.current[location.id] = marker;
      });

      console.log('Map initialization complete', {
        markersAdded: Object.keys(markersRef.current).length
      });
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError(`Failed to initialize map: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [center, locations, hoveredId, onViewportChange, maxAttempts, attemptDelay]);

  // Helper function to validate coordinates
  const isValidCoordinates = (lat: number, lng: number) => {
    const valid = (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
    
    if (!valid) {
      console.warn('Invalid coordinates detected:', { lat, lng });
    }
    
    return valid;
  };

  useEffect(() => {
    console.log('Map component mounted');
    
    // Listen for Google Maps loaded event
    const handleGoogleMapsLoaded = () => {
      console.log('Google Maps loaded event received');
      initializeMap();
    };

    // Listen for Google Maps error event
    const handleGoogleMapsError = (e: Event) => {
      console.error('Google Maps error event received:', (e as CustomEvent).detail);
      setError('Failed to load Google Maps. Please refresh the page.');
      setIsLoading(false);
    };

    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    window.addEventListener('google-maps-error', handleGoogleMapsError);

    // Try to initialize immediately if Google Maps is already loaded
    if (window.google?.maps) {
      console.log('Google Maps already loaded, initializing map');
      initializeMap();
    } else {
      console.log('Google Maps not yet loaded, waiting for load event');
      // Fallback initialization after a delay if event doesn't fire
      setTimeout(() => {
        if (!window.google?.maps && initializationAttempts.current === 0) {
          console.log('Fallback initialization after timeout');
          initializeMap();
        }
      }, 2000);
    }

    return () => {
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
      window.removeEventListener('google-maps-error', handleGoogleMapsError);
    };
  }, [initializeMap]);

  useEffect(() => {
    console.log('Locations or center changed:', { 
      locationCount: locations.length,
      center,
      hoveredId
    });
    if (googleMapRef.current && window.google?.maps) {
      initializeMap();
    }
  }, [locations, center, hoveredId, onViewportChange, initializeMap]);

  if (error) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">{error}</div>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="mt-2"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={cn(
        "w-full min-h-[500px] rounded-lg",
        "transition-all duration-200 ease-in-out"
      )}
    />
  );
}

function LoadingComponent() {
  return (
    <div className="w-full h-[500px] rounded-lg bg-gray-100 flex items-center justify-center">
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading map...
      </Button>
    </div>
  )
}

function ErrorComponent({ error }: { error: string }) {
  return (
    <div className="w-full h-[500px] rounded-lg bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 mb-2">Error loading map</p>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    </div>
  )
}

