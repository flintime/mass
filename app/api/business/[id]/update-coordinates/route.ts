import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Business from '@/app/models/business';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Validate request body
    const body = await request.json();
    const { latitude, longitude } = body;

    if (
      typeof latitude !== 'number' || 
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json({ 
        error: 'Invalid coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.' 
      }, { status: 400 });
    }

    // Connect to database
    await dbConnect();

    // Find business by ID
    const business = await Business.findById(id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Update coordinates
    business.latitude = latitude;
    business.longitude = longitude;
    
    // Update GeoJSON location field
    business.location = {
      type: 'Point',
      coordinates: [longitude, latitude] // GeoJSON uses [longitude, latitude] order
    };

    // Save updates
    await business.save();

    console.log(`Updated coordinates for business ${business.business_name}: Lat ${latitude}, Lng ${longitude}`);

    return NextResponse.json({ 
      message: 'Coordinates updated successfully',
      business: {
        id: business._id,
        business_name: business.business_name,
        latitude: business.latitude,
        longitude: business.longitude
      }
    });
  } catch (error) {
    console.error('Error updating business coordinates:', error);
    return NextResponse.json({ 
      error: 'Failed to update business coordinates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 