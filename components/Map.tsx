'use client';

import { useEffect, useState } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isHighlighted?: boolean;
  images?: { url: string }[];
  rating?: number;
  totalReviews?: number;
}

interface MapProps {
  center: { lat: number; lng: number };
  locations: Location[];
  zoom?: number;
  onMarkerClick?: (locationId: string) => void;
  showUserLocation?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem'
};

const defaultOptions = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Add new NavigationButtons component
function NavigationButtons({ latitude, longitude, name = '' }: { latitude: number; longitude: number; name?: string }) {
  const encodedName = encodeURIComponent(name);
  
  const navigationLinks = [
    {
      name: 'Google Maps',
      url: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodedName}`,
      icon: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="#4285F4" d="M12 2C7.6 2 4 5.6 4 10c0 3.4 4 9.6 8 14 4-4.4 8-10.6 8-14 0-4.4-3.6-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
        </svg>
      `)}`
    },
    {
      name: 'Apple Maps',
      url: `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
      icon: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="#000000" d="M12 2C7.6 2 4 5.6 4 10c0 3.4 4 9.6 8 14 4-4.4 8-10.6 8-14 0-4.4-3.6-8-8-8zm0 4.5c1.9 0 3.5 1.6 3.5 3.5s-1.6 3.5-3.5 3.5S8.5 11.9 8.5 10 10.1 6.5 12 6.5z"/>
        </svg>
      `)}`
    },
    {
      name: 'Waze',
      url: `https://www.waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
      icon: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="#33CCFF" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
          <circle fill="#33CCFF" cx="12" cy="12" r="3"/>
        </svg>
      `)}`
    }
  ];

  return (
    <div className="flex gap-2 mt-2">
      {navigationLinks.map((nav) => (
        <a
          key={nav.name}
          href={nav.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-100 rounded-full border border-gray-200 shadow-sm transition-colors duration-200"
        >
          <img src={nav.icon} alt={nav.name} className="w-4 h-4" />
          <span className="text-xs font-medium text-gray-700">{nav.name}</span>
        </a>
      ))}
    </div>
  );
}

export default function Map({ center, locations, zoom = 12, onMarkerClick, showUserLocation = true }: MapProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [hasInitializedBounds, setHasInitializedBounds] = useState(false);

  // Listen for Google Maps loaded event
  useEffect(() => {
    const handleGoogleMapsLoaded = () => {
      setIsGoogleMapsLoaded(true);
    };

    // Check if already loaded
    if (window.google?.maps && window.googleMapsLoaded) {
      setIsGoogleMapsLoaded(true);
    } else {
      window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    }

    return () => {
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    };
  }, []);

  // Add debug logging for locations prop
  useEffect(() => {
    if (isGoogleMapsLoaded) {
      console.log('Locations prop:', locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        hasImages: !!loc.images,
        imageCount: loc.images?.length,
        firstImageUrl: loc.images?.[0]?.url
      })));
    }
  }, [locations, isGoogleMapsLoaded]);

  // Reset image index and validate images when location changes
  useEffect(() => {
    if (selectedLocation) {
      console.log('Selected location changed:', {
        id: selectedLocation.id,
        name: selectedLocation.name,
        hasImages: !!selectedLocation.images,
        imageCount: selectedLocation.images?.length,
        images: selectedLocation.images
      });
      
      // Validate images array and reset index if needed
      if (!selectedLocation.images || selectedLocation.images.length === 0) {
        setCurrentImageIndex(0);
      } else if (currentImageIndex >= selectedLocation.images.length) {
        setCurrentImageIndex(0);
      }
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (isGoogleMapsLoaded) {
    console.log('Map props:', { center, locations, zoom });
    }
  }, [center, locations, zoom, isGoogleMapsLoaded]);

  // Single bounds fitting effect that only runs once on initial load
  useEffect(() => {
    if (map && locations.length > 0 && isGoogleMapsLoaded && !hasInitializedBounds) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach(location => {
        bounds.extend({ lat: location.latitude, lng: location.longitude });
      });
      
      // Add user location to bounds
      if (showUserLocation && center) {
        bounds.extend(center);
      }

      map.fitBounds(bounds);

      // Set zoom if bounds zoom is too high
      const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      if (map.getZoom()! > zoom) {
        map.setZoom(zoom);
      }
        setHasInitializedBounds(true);
      });

      return () => {
        google.maps.event.removeListener(listener);
      };
    }
  }, [map, locations, zoom, isGoogleMapsLoaded, center, showUserLocation]);

  if (!isGoogleMapsLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      options={{
        ...defaultOptions,
        gestureHandling: 'greedy' // Add this to make map more responsive to zoom
      }}
      onLoad={setMap}
    >
      {/* User's location marker */}
      {showUserLocation && (
        <Marker
          position={center}
          icon={{
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Shadow -->
                <ellipse cx="16" cy="29" rx="5" ry="1.5" fill="rgba(0,0,0,0.2)"/>
                
                <!-- Base circle with gradient -->
                <circle cx="16" cy="16" r="13" fill="url(#gradient)" stroke="white" stroke-width="1.5"/>
                
                <!-- 3D Human figure -->
                <path d="M16 8c1.5 0 2.7 1.2 2.7 2.7s-1.2 2.7-2.7 2.7-2.7-1.2-2.7-2.7S14.5 8 16 8z" fill="white"/>
                <path d="M21.3 18.7c0-2.9-2.4-5.3-5.3-5.3s-5.3 2.4-5.3 5.3v4h10.6v-4z" fill="white"/>
                
                <!-- Highlights for 3D effect -->
                <path d="M16 13.3c1.5 0 2.7-1.2 2.7-2.7 0-.3-.1-.5-.1-.8-.3.9-1.2 1.5-2.2 1.5s-1.9-.6-2.2-1.5c-.1.3-.1.5-.1.8-.1 1.5 1.1 2.7 2.6 2.7z" fill="rgba(255,255,255,0.3)"/>
                <path d="M18.7 22.7v-4c0-2.9-2.4-5.3-5.3-5.3-.3 0-.5 0-.8.1.9.3 1.5 1.2 1.5 2.2s-.6 1.9-1.5 2.2c.1.3.1.5.1.8v4h6z" fill="rgba(255,255,255,0.3)"/>
                
                <!-- Gradient definition -->
                <defs>
                  <linearGradient id="gradient" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" style="stop-color:#2E7D32"/>
                    <stop offset="100%" style="stop-color:#4CAF50"/>
                  </linearGradient>
                </defs>
              </svg>
            `)}`,
            anchor: new google.maps.Point(16, 29),
            scaledSize: new google.maps.Size(32, 32)
          }}
          title="Your Location"
          zIndex={1000}
        />
      )}

      {/* Business location markers */}
      {locations.map((location, index) => (
        <Marker
          key={location.id}
          position={{ lat: location.latitude, lng: location.longitude }}
          onClick={() => {
            console.log('Marker clicked:', {
              id: location.id,
              name: location.name,
              hasImages: !!location.images,
              imageCount: location.images?.length,
              firstImageUrl: location.images?.[0]?.url
            });
            setSelectedLocation(location);
            onMarkerClick?.(location.id);
          }}
          icon={{
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="${location.isHighlighted ? '#6A0DAD' : '#8A2BE2'}" stroke="white" stroke-width="2"/>
                <text x="16" y="21" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">
                  ${index + 1}
                </text>
              </svg>
            `)}`,
            anchor: new google.maps.Point(16, 16),
            scaledSize: new google.maps.Size(32, 32)
          }}
          animation={location.isHighlighted ? google.maps.Animation.BOUNCE : undefined}
        />
      ))}

      {selectedLocation && (
        <InfoWindow
          position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
          onCloseClick={() => setSelectedLocation(null)}
        >
          <div className="p-2 w-[300px]">
            {(() => {
              const validImages = selectedLocation.images?.filter(img => img && img.url) || [];
              const hasValidImage = validImages.length > 0 && currentImageIndex < validImages.length;
              
              console.log('InfoWindow render:', {
                locationId: selectedLocation.id,
                locationName: selectedLocation.name,
                hasImages: !!selectedLocation.images,
                imageCount: selectedLocation.images?.length,
                validImageCount: validImages.length,
                currentImageIndex,
                hasValidImage,
                currentImageUrl: hasValidImage ? validImages[currentImageIndex].url : null
              });
              return null;
            })()}
            
            {(() => {
              const validImages = selectedLocation.images?.filter(img => img && img.url) || [];
              const hasValidImage = validImages.length > 0 && currentImageIndex < validImages.length;
              
              if (!hasValidImage) {
                return (
                  <div className="mb-3 h-[200px] bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">No images available</p>
                  </div>
                );
              }

              return (
                <div className="relative mb-3 h-[200px] group">
                  <img
                    src={validImages[currentImageIndex].url}
                    alt={selectedLocation.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {validImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(prev => 
                            prev === 0 ? validImages.length - 1 : prev - 1
                          );
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(prev => 
                            prev === validImages.length - 1 ? 0 : prev + 1
                          );
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {validImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(index);
                            }}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              index === currentImageIndex 
                                ? 'bg-white w-3' 
                                : 'bg-white/60 hover:bg-white/80'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{selectedLocation.name}</h3>
              {selectedLocation.rating !== undefined && selectedLocation.rating !== null && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 font-medium">
                      {typeof selectedLocation.rating === 'number' 
                        ? selectedLocation.rating.toFixed(1) 
                        : 'N/A'}
                    </span>
                  </div>
                  {typeof selectedLocation.totalReviews === 'number' && (
                    <span className="text-gray-500 text-sm">
                      ({selectedLocation.totalReviews} {selectedLocation.totalReviews === 1 ? 'review' : 'reviews'})
                    </span>
                  )}
                </div>
              )}
              <NavigationButtons 
                latitude={selectedLocation.latitude} 
                longitude={selectedLocation.longitude}
                name={selectedLocation.name}
              />
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
} 