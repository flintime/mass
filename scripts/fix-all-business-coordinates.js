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

async function fixAllBusinessCoordinates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all businesses with location data but missing latitude/longitude
    const businesses = await Business.find({
      'location.coordinates': { $exists: true, $type: 'array', $ne: [] },
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { latitude: null },
        { longitude: null },
        { latitude: { $type: 'undefined' } },
        { longitude: { $type: 'undefined' } }
      ]
    });
    
    console.log(`Found ${businesses.length} businesses with GeoJSON location but missing latitude/longitude fields`);
    
    // Update each business
    let updatedCount = 0;
    
    for (const business of businesses) {
      if (business.location?.coordinates?.length === 2) {
        // GeoJSON coordinates are stored as [longitude, latitude]
        const [longitude, latitude] = business.location.coordinates;
        
        console.log(`Updating ${business.business_name}, ID: ${business._id}`);
        console.log(`  Coordinates: [${longitude}, ${latitude}]`);
        
        // Update the business with explicit lat/long fields
        business.latitude = latitude;
        business.longitude = longitude;
        await business.save();
        
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated ${updatedCount} businesses with explicit latitude/longitude fields`);
    
    // Now check if any businesses still have missing coordinates
    const remainingBusinesses = await Business.find({
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { latitude: null },
        { longitude: null }
      ]
    }).limit(5);
    
    if (remainingBusinesses.length > 0) {
      console.log(`\nStill found ${remainingBusinesses.length} businesses with missing coordinates.`);
      console.log('Sample businesses:');
      
      for (const business of remainingBusinesses) {
        console.log(`- ${business.business_name}, ID: ${business._id}`);
        console.log(`  Address: ${business.address}, ${business.city}, ${business.state} ${business.zip_code}`);
        console.log(`  Location data: ${JSON.stringify(business.location || 'No location data')}`);
      }
    } else {
      console.log('\nAll businesses now have proper latitude/longitude fields!');
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
fixAllBusinessCoordinates(); 