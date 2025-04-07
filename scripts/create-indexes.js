const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://doadmin:27SZj4OPv536c1w0@flintime-44dbf222.mongo.ondigitalocean.com/admin?authSource=admin&replicaSet=flintime&tls=true';

// Define the business schema
const businessSchema = new mongoose.Schema({
  business_name: String,
  email: String,
  description: String,
  Business_Category: String,
  latitude: Number,
  longitude: Number,
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
  }
});

// Create the Business model
const Business = mongoose.model('Business', businessSchema);

async function createIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create 2dsphere index on location field
    await Business.collection.createIndex({ location: '2dsphere' });
    console.log('Created 2dsphere index on location field');

    // Create text indexes for search fields
    await Business.collection.createIndex({
      business_name: 'text',
      Business_Category: 'text',
      description: 'text'
    });
    console.log('Created text indexes for search fields');

    console.log('All indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createIndexes(); 