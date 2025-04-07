const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://doadmin:27SZj4OPv536c1w0@flintime-44dbf222.mongo.ondigitalocean.com/admin?authSource=admin&replicaSet=flintime&tls=true';

async function geocodeAddress(address, city, state, zip_code) {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  console.log('Geocoding address:', fullAddress);
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'OK' && data.results && data.results[0]) {
    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  }
  
  throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
}

async function updateMinnuLocation() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the Business model
    const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false }));

    // Find Minnu Industries
    const business = await Business.findOne({ business_name: 'Minnu Industries' });
    if (!business) {
      console.log('Business not found');
      return;
    }

    console.log('Current location:', {
      address: business.address,
      city: business.city,
      state: business.state,
      zip_code: business.zip_code,
      latitude: business.latitude,
      longitude: business.longitude,
      location: business.location
    });

    // Get new coordinates
    const { latitude, longitude } = await geocodeAddress(
      business.address,
      business.city,
      business.state,
      business.zip_code
    );

    // Update location data
    business.latitude = latitude;
    business.longitude = longitude;
    business.location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    await business.save();
    console.log('Updated location:', {
      latitude,
      longitude,
      location: business.location
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateMinnuLocation(); 