import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key is not set');
      return NextResponse.json(
        { error: 'Google Maps API key is not configured' },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    console.log('Geocoding address:', address);
    console.log('Using API key:', GOOGLE_MAPS_API_KEY.substring(0, 8) + '...');
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Geocoding response:', {
      status: data.status,
      results: data.results ? data.results.length : 0,
      location: data.results?.[0]?.geometry?.location
    });
    
    if (data.status === 'OK' && data.results && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return NextResponse.json({ latitude: lat, longitude: lng });
    }
    
    if (data.status !== 'OK') {
      console.error('Geocoding error status:', data.status);
      console.error('Error message:', data.error_message);
      return NextResponse.json(
        { error: `Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Could not geocode address: No results found' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    );
  }
} 