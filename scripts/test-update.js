const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://doadmin:27SZj4OPv536c1w0@flintime-44dbf222.mongo.ondigitalocean.com/admin?authSource=admin&replicaSet=flintime&tls=true';

async function testUpdate() {
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

    // Test update with new coordinates
    const updateData = {
      latitude: 42.4103113,
      longitude: -71.1097569,
      location: {
        type: 'Point',
        coordinates: [-71.1097569, 42.4103113]
      }
    };

    // Update using findByIdAndUpdate
    const updatedBusiness = await Business.findByIdAndUpdate(
      business._id,
      { $set: updateData },
      { new: true }
    );

    console.log('Updated business data:', {
      id: updatedBusiness._id,
      address: updatedBusiness.address,
      city: updatedBusiness.city,
      state: updatedBusiness.state,
      zip_code: updatedBusiness.zip_code,
      latitude: updatedBusiness.latitude,
      longitude: updatedBusiness.longitude,
      location: updatedBusiness.location
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testUpdate(); 