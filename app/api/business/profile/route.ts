import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import Business from '@/models/business.model';
import { updateBusinessVectorStore } from '@/app/lib/vector-store';
import { validateToken } from '@/lib/csrf';
import { headers } from 'next/headers';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to get business from token
async function getBusinessFromToken(request: Request) {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // Get the token from cookies as fallback
    if (!token) {
      const cookieStore = cookies();
      token = cookieStore.get('businessAuthToken')?.value || null;
      if (!token) {
        return null;
      }
    }

    // Verify the token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Get the business from the database
    const business = await Business.findById(payload.sub);
    if (!business) {
      return null;
    }

    return business;
  } catch (error) {
    console.error('Error getting business from token:', error);
    return null;
  }
}

// Function to geocode an address
async function geocodeAddress(address: string, city: string, state: string, zip_code: string) {
  console.log('Starting geocoding process...');
  console.log('API Key status:', GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not set');
    throw new Error('Google Maps API key is not configured');
  }

  const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  console.log('Geocoding address:', fullAddress);
  console.log('Using API key:', GOOGLE_MAPS_API_KEY.substring(0, 8) + '...');
  
  try {
    console.log('Making geocoding request...');
    const response = await fetch(url);
    console.log('Received response:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('Full geocoding response:', JSON.stringify(data, null, 2));
    
    if (data.status === 'OK' && data.results && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      console.log('Successfully geocoded address:', { lat, lng });
      return { latitude: lat, longitude: lng };
    }
    
    if (data.status !== 'OK') {
      console.error('Geocoding error status:', data.status);
      console.error('Error message:', data.error_message);
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
    
    throw new Error('Could not geocode address: No results found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

export async function PUT(request: Request) {
  try {
    console.log('Starting profile update...');
    
    // 1. Check for CSRF token
    const headersList = headers();
    const csrfToken = headersList.get('x-csrf-token');
    if (!csrfToken) {
      return NextResponse.json(
        { message: 'Your session appears to be invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // 2. Get cookies from the request and validate CSRF token
    const cookieHeader = headersList.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      return NextResponse.json(
        { message: 'Your session has expired or is invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }
    
    // 3. Authenticate the business
    const business = await getBusinessFromToken(request);
    if (!business) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updateData = await request.json();
    console.log('Current business data:', {
      id: business._id,
      address: business.address,
      city: business.city,
      state: business.state,
      zip_code: business.zip_code,
      latitude: business.latitude,
      longitude: business.longitude,
      location: business.location
    });
    console.log('Received update data:', JSON.stringify(updateData, null, 2));

    // Always geocode if any address field is present in the update data
    if ('address' in updateData || 'city' in updateData || 'state' in updateData || 'zip_code' in updateData) {
      try {
        const fullAddress = {
          address: updateData.address || business.address,
          city: updateData.city || business.city,
          state: updateData.state || business.state,
          zip_code: updateData.zip_code || business.zip_code
        };
        console.log('Geocoding address:', fullAddress);

        const { latitude, longitude } = await geocodeAddress(
          fullAddress.address,
          fullAddress.city,
          fullAddress.state,
          fullAddress.zip_code
        );
        
        // Add coordinates to update data
        updateData.latitude = latitude;
        updateData.longitude = longitude;
        // Add location field for geospatial queries
        updateData.location = {
          type: 'Point',
          coordinates: [longitude, latitude]
        };
        
        console.log('Setting coordinates:', { latitude, longitude, location: updateData.location });
      } catch (error) {
        console.error('Geocoding error:', error);
        return NextResponse.json(
          { message: 'Failed to geocode address. Please verify the address is correct.' },
          { status: 400 }
        );
      }
    }

    // Log the final update data
    console.log('Final update data to be sent to MongoDB:', JSON.stringify({
      ...updateData,
      latitude: updateData.latitude,
      longitude: updateData.longitude,
      location: updateData.location,
      services: updateData.services,
      faqs: updateData.faqs
    }, null, 2));

    // Update the business with all fields including location
    const updatedBusiness = await Business.findByIdAndUpdate(
      business._id,
      { 
        $set: {
          ...updateData,
          latitude: updateData.latitude,
          longitude: updateData.longitude,
          location: updateData.location
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedBusiness) {
      console.error('Business not found after update');
      return NextResponse.json(
        { message: 'Business not found after update' },
        { status: 404 }
      );
    }

    console.log('Updated business in database:', {
      id: updatedBusiness._id,
      address: updatedBusiness.address,
      city: updatedBusiness.city,
      state: updatedBusiness.state,
      zip_code: updatedBusiness.zip_code,
      latitude: updatedBusiness.latitude,
      longitude: updatedBusiness.longitude,
      location: updatedBusiness.location,
      services: updatedBusiness.services,
      faqs: updatedBusiness.faqs
    });

    // Update vector store
    await updateBusinessVectorStore(updatedBusiness._id.toString());

    return NextResponse.json(updatedBusiness);
  } catch (error) {
    console.error('Profile update error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update profile' },
      { status: 500 }
    );
  }
} 