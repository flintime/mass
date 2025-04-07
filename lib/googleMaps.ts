import { Loader } from '@googlemaps/js-api-loader';

// Create a single loader instance with all required libraries
export const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
  libraries: ['places'],
});

// Initialize the loader once
export const initializeGoogleMaps = () => {
  return loader.load();
}; 