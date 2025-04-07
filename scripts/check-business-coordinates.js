require('dotenv').config({ path: '../.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
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
    checkBusinessCoordinates();
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

// Main function to check and update business coordinates
async function checkBusinessCoordinates() {
  try {
    // Count total businesses
    const totalBusinesses = await Business.countDocuments();
    console.log(`Total businesses in database: ${totalBusinesses}`);
    
    // Count businesses with valid coordinates
    const businessesWithCoordinates = await Business.countDocuments({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    });
    console.log(`Businesses with coordinates: ${businessesWithCoordinates}`);
    
    // Find businesses with missing coordinates
    const businessesWithoutCoordinates = await Business.find({
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { latitude: null },
        { longitude: null }
      ]
    }).limit(10);
    
    console.log(`Found ${businessesWithoutCoordinates.length} businesses with missing coordinates (showing first 10)`);
    
    // Log some of these businesses
    businessesWithoutCoordinates.forEach(business => {
      console.log('-'.repeat(50));
      console.log(`Business: ${business.business_name}`);
      console.log(`Address: ${business.address}, ${business.city}, ${business.state} ${business.zip_code}`);
      console.log(`Coordinates: Lat ${business.latitude}, Lng ${business.longitude}`);
    });
    
    // Find businesses with invalid coordinates (0,0)
    const businessesWithZeroCoordinates = await Business.find({
      latitude: 0,
      longitude: 0
    }).limit(10);
    
    console.log(`\nFound ${businessesWithZeroCoordinates.length} businesses with zero coordinates (showing first 10)`);
    
    // Update a business with missing coordinates for testing
    if (businessesWithoutCoordinates.length > 0) {
      const businessToUpdate = businessesWithoutCoordinates[0];
      
      if (
        businessToUpdate.address &&
        businessToUpdate.city &&
        businessToUpdate.state &&
        businessToUpdate.zip_code
      ) {
        console.log(`\nUpdating coordinates for: ${businessToUpdate.business_name}`);
        
        try {
          const { latitude, longitude } = await geocodeAddress(
            businessToUpdate.address,
            businessToUpdate.city,
            businessToUpdate.state,
            businessToUpdate.zip_code
          );
          
          console.log(`New coordinates: Lat ${latitude}, Lng ${longitude}`);
          
          // Update the business
          businessToUpdate.latitude = latitude;
          businessToUpdate.longitude = longitude;
          businessToUpdate.location = {
            type: 'Point',
            coordinates: [longitude, latitude] // GeoJSON uses [longitude, latitude] order
          };
          
          await businessToUpdate.save();
          console.log(`Successfully updated coordinates for ${businessToUpdate.business_name}`);
        } catch (error) {
          console.error(`Failed to update coordinates:`, error.message);
        }
      } else {
        console.log(`Business ${businessToUpdate.business_name} is missing address information`);
      }
    }
    
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
} 