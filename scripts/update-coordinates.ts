import dbConnect from '../lib/db';
import Business from '../backend/src/models/business.model';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function geocodeAddress(address: string, city: string, state: string, zip_code: string) {
  const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { latitude: lat, longitude: lng };
    }
    throw new Error('Could not geocode address');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

async function updateBusinessCoordinates() {
  try {
    await dbConnect();
    
    // Get all businesses without coordinates
    const businesses = await Business.find({
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } }
      ]
    });

    console.log(`Found ${businesses.length} businesses without coordinates`);

    for (const business of businesses) {
      try {
        const { latitude, longitude } = await geocodeAddress(
          business.address,
          business.city,
          business.state,
          business.zip_code.toString()
        );

        await Business.updateOne(
          { _id: business._id },
          { $set: { latitude, longitude } }
        );

        console.log(`Updated coordinates for ${business.business_name}`);
      } catch (error) {
        console.error(`Error updating coordinates for ${business.business_name}:`, error);
      }
    }

    console.log('Finished updating coordinates');
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

updateBusinessCoordinates(); 