interface Coordinates {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key not configured');
    throw new Error('Google Maps API key is not configured');
  }

  if (!address || address.trim() === '') {
    console.error('Empty address provided to geocodeAddress');
    throw new Error('No address provided for geocoding');
  }

  try {
    console.log('Geocoding address:', address);
    
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );

    if (!response.ok) {
      console.error('Failed to geocode address - bad response:', response.status);
      throw new Error('Failed to geocode address');
    }

    const data = await response.json();
    console.log('Geocoding response status:', data.status);
    
    if (data.status === 'ZERO_RESULTS') {
      console.error('No results found for the address');
      // Return a fallback position (center of US) instead of throwing an error
      return { lat: 37.0902, lng: -95.7129 };
    }

    if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
      console.error('Geocoding error:', data.status, data.error_message);
      // Return a fallback position (center of US) instead of throwing an error
      return { lat: 37.0902, lng: -95.7129 };
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch (error) {
    console.error('Error in geocodeAddress:', error);
    // Return a fallback position (center of US) instead of throwing an error
    return { lat: 37.0902, lng: -95.7129 };
  }
}

export function formatAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string
): string {
  return `${address}, ${city}, ${state} ${zipCode}`;
} 