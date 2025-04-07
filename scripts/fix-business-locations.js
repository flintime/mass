const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://doadmin:27SZj4OPv536c1w0@flintime-44dbf222.mongo.ondigitalocean.com/admin?authSource=admin&replicaSet=flintime&tls=true';

async function fixBusinessLocations() {
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
      const updates = {};

      // If we have coordinates but no location field
      if (business.latitude && business.longitude && (!business.location || !business.location.coordinates)) {
        console.log('Adding missing location field');
        updates.location = {
          type: 'Point',
          coordinates: [business.longitude, business.latitude]
        };
        needsUpdate = true;
      }

      // If location field exists but coordinates are wrong
      if (business.location && business.location.coordinates && 
          business.location.coordinates[0] !== business.longitude || 
          business.location.coordinates[1] !== business.latitude) {
        console.log('Fixing mismatched coordinates');
        updates.location = {
          type: 'Point',
          coordinates: [business.longitude, business.latitude]
        };
        needsUpdate = true;
      }

      // If location type is missing or wrong
      if (business.location && business.location.type !== 'Point') {
        console.log('Fixing location type');
        if (!updates.location) {
          updates.location = { ...business.location };
        }
        updates.location.type = 'Point';
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log('Updating with:', updates);
        const updated = await Business.findByIdAndUpdate(
          business._id,
          { $set: updates },
          { new: true }
        );
        console.log('Updated data:', {
          address: updated.address,
          city: updated.city,
          state: updated.state,
          zip_code: updated.zip_code,
          latitude: updated.latitude,
          longitude: updated.longitude,
          location: updated.location
        });
      } else {
        console.log('No updates needed');
      }
    }

    console.log('\nLocation fixes completed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixBusinessLocations(); 