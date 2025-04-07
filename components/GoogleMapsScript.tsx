'use client'

import { useEffect, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

declare global {
  interface Window {
    googleMapsLoaded?: boolean;
    googleMapsInitialized?: boolean;
    googleMapsError?: string;
  }
}

const GoogleMapsScript = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [loadAttempts, setLoadAttempts] = useState(0)

  useEffect(() => {
    console.log('GoogleMapsScript component mounted');
    
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      console.log('Google Maps already loaded on mount');
      window.googleMapsLoaded = true;
      window.googleMapsInitialized = true;
      
      // Dispatch event for components to know Google Maps is available
      try {
        window.dispatchEvent(new Event('google-maps-loaded'));
        // Also dispatch a CustomEvent with more data
        window.dispatchEvent(new CustomEvent('google-maps-status', { 
          detail: { status: 'loaded', message: 'Google Maps already loaded' } 
        }));
      } catch (e) {
        console.error('Error dispatching Google Maps event:', e);
      }
      
      setIsLoading(false);
      return;
    }

    // Function to handle successful loading
    const handleMapsLoaded = () => {
      console.log('Google Maps API loaded successfully');
      window.googleMapsLoaded = true;
      window.googleMapsInitialized = true;
      window.googleMapsError = undefined;
      setIsLoading(false);
      
      // Dispatch events
      try {
        window.dispatchEvent(new Event('google-maps-loaded'));
        window.dispatchEvent(new CustomEvent('google-maps-status', { 
          detail: { status: 'loaded', message: 'Google Maps loaded successfully' } 
        }));
      } catch (e) {
        console.error('Error dispatching Google Maps loaded event:', e);
      }
    };

    // Function to handle loading error
    const handleMapsError = (error: Error) => {
      console.error('Error loading Google Maps API:', error);
      window.googleMapsLoaded = false;
      window.googleMapsInitialized = false;
      window.googleMapsError = error.message;
      setIsLoading(false);
      
      // Dispatch error event
      try {
        window.dispatchEvent(new CustomEvent('google-maps-error', { 
          detail: { error: error.message } 
        }));
        window.dispatchEvent(new CustomEvent('google-maps-status', { 
          detail: { status: 'error', message: error.message } 
        }));
      } catch (e) {
        console.error('Error dispatching Google Maps error event:', e);
      }
    };

    // Load Google Maps API
    const loadGoogleMaps = () => {
      setLoadAttempts(prev => prev + 1);
      console.log(`Attempting to load Google Maps API (attempt ${loadAttempts + 1})`);
      
      // Check for API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        const error = new Error('Google Maps API key is missing');
        handleMapsError(error);
        return;
      }
      
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places'],
        id: 'google-maps-script'
      });

      loader.load()
        .then(handleMapsLoaded)
        .catch(handleMapsError);
    };

    // Start loading
    loadGoogleMaps();

    // Clean up
    return () => {
      // Only set to false if this component is unmounting
      // Don't actually unset the Google Maps API
      console.log('GoogleMapsScript component unmounting');
    };
  }, [loadAttempts]);

  // This component doesn't render anything
  return null;
}

export default GoogleMapsScript; 