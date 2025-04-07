// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

// Business schema - simplified for this script
const BusinessSchema = new mongoose.Schema({
  business_name: String,
  unique_id: String,
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

// Create model
const Business = mongoose.model('Business', BusinessSchema);

async function checkSpecificBusiness() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find Boston Pets business
    const business = await Business.findOne({ business_name: 'Boston Pets' });
    
    if (!business) {
      console.log('Boston Pets business not found');
      return;
    }
    
    console.log('Found business:', {
      id: business._id,
      name: business.business_name,
      unique_id: business.unique_id,
      address: business.address,
      city: business.city,
      state: business.state,
      zip_code: business.zip_code
    });
    
    console.log('Coordinates info:', {
      latitude: business.latitude,
      longitude: business.longitude,
      location: business.location
    });
    
    // Check if GeoJSON location exists but latitude/longitude fields don't
    if (business.location?.coordinates?.length === 2 && 
        (business.latitude === undefined || business.longitude === undefined)) {
      console.log('Business has GeoJSON location but missing latitude/longitude fields');
      
      // Extract coordinates from GeoJSON
      const [longitude, latitude] = business.location.coordinates;
      console.log('Extracted coordinates:', { latitude, longitude });
      
      // Update the business with explicit lat/long fields
      business.latitude = latitude;
      business.longitude = longitude;
      await business.save();
      
      console.log('Updated business with explicit latitude/longitude fields');
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

// Run the function
checkSpecificBusiness(); 