const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://doadmin:27SZj4OPv536c1w0@flintime-44dbf222.mongo.ondigitalocean.com/admin?authSource=admin&replicaSet=flintime&tls=true';

async function fixLocations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the Business model
    const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false }));

    // Find all businesses
    const businesses = await Business.find({});
    console.log(`Found ${businesses.length} businesses to check`);

    for (const business of businesses) {
      console.log(`\nChecking business: ${business.business_name}`);
      console.log('Current data:', {
        address: business.address,
        city: business.city,
        state: business.state,
        zip_code: business.zip_code,
        latitude: business.latitude,
        longitude: business.longitude,
        location: business.location
      });

      let needsUpdate = false;

      // Check if we have latitude and longitude but no location field
      if (business.latitude && business.longitude && (!business.location || !business.location.coordinates)) {
        console.log('Adding location field with GeoJSON format');
        business.location = {
          type: 'Point',
          coordinates: [business.longitude, business.latitude]
        };
        needsUpdate = true;
      }

      // Check if location field exists but coordinates are in wrong order
      if (business.location && business.location.coordinates && 
          business.location.coordinates[0] === business.latitude && 
          business.location.coordinates[1] === business.longitude) {
        console.log('Fixing coordinates order in location field');
        business.location.coordinates = [business.longitude, business.latitude];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await business.save();
        console.log('Updated business with correct location format');
      } else {
        console.log('Location data is correctly formatted');
      }
    }

    console.log('\nLocation update completed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixLocations(); 