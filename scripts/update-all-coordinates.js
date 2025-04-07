// Load environment variables from .env files
require('dotenv').config();
// Also try to load from .env.local if it exists
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('No .env.local file found, using .env only');
}

const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// For debugging, print current directory and available env files
console.log('Current directory:', process.cwd());
console.log('Environment files:');
['.env', '.env.local', '.env.development', '.env.production'].forEach(file => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`- ${file} exists`);
  } else {
    console.log(`- ${file} does not exist`);
  }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
console.log('MONGODB_URI defined:', !!MONGODB_URI);
console.log('Google Maps API Key defined:', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

// Business schema
const BusinessSchema = new mongoose.Schema({
  business_name: String,
  address: String,
  city: String,
  state: String,
  zip_code: String,
  latitude: Number,
  longitude: Number,
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: [Number]
  }
});

// Define indexes
BusinessSchema.index({ location: '2dsphere' });

// Create model
const Business = mongoose.model('Business', BusinessSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    updateAllCoordinates();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

// Function to geocode an address
async function geocodeAddress(address, city, state, zipCode) {
  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key is missing');
  }
  
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
    );
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng
      };
    } else {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }
  } catch (error) {
    console.error(`Error geocoding address ${fullAddress}:`, error.message);
    throw error;
  }
}

// Add a delay function to respect rate limits
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to update all business coordinates
async function updateAllCoordinates() {
  try {
    // Find businesses with missing coordinates
    const businessesWithoutCoordinates = await Business.find({
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { latitude: null },
        { longitude: null },
        { latitude: 0, longitude: 0 }
      ]
    });
    
    console.log(`Found ${businessesWithoutCoordinates.length} businesses with missing coordinates`);
    
    // Update each business with missing coordinates
    let successCount = 0;
    let failCount = 0;
    
    for (const business of businessesWithoutCoordinates) {
      if (
        business.address &&
        business.city &&
        business.state &&
        business.zip_code
      ) {
        console.log(`Updating coordinates for: ${business.business_name}`);
        
        try {
          const { latitude, longitude } = await geocodeAddress(
            business.address,
            business.city,
            business.state,
            business.zip_code
          );
          
          console.log(`New coordinates: Lat ${latitude}, Lng ${longitude}`);
          
          // Update the business
          business.latitude = latitude;
          business.longitude = longitude;
          business.location = {
            type: 'Point',
            coordinates: [longitude, latitude] // GeoJSON uses [longitude, latitude] order
          };
          
          await business.save();
          console.log(`Successfully updated coordinates for ${business.business_name}`);
          successCount++;
          
          // Add a delay to respect Google's rate limits
          await delay(200);
        } catch (error) {
          console.error(`Failed to update coordinates for ${business.business_name}:`, error.message);
          failCount++;
          
          // Add a longer delay if we hit a rate limit
          await delay(1000);
        }
      } else {
        console.log(`Business ${business.business_name} is missing address information`);
        failCount++;
      }
    }
    
    // Summary
    console.log('\nUpdate Summary:');
    console.log(`Total businesses processed: ${businessesWithoutCoordinates.length}`);
    console.log(`Successful updates: ${successCount}`);
    console.log(`Failed updates: ${failCount}`);
    
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
} 