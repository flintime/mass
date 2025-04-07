require('dotenv').config();
const mongoose = require('mongoose');
const { syncBusinessToPinecone } = require('../app/lib/pinecone-sync');

// Define the business schema
const businessSchema = new mongoose.Schema({
  business_name: String,
  Business_Category: String,
  Business_Subcategories: [String],
  business_features: [String],
  description: String,
  address: String,
  city: String,
  state: String,
  zip_code: String,
  latitude: Number,
  longitude: Number
});

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Get the business model
    const Business = mongoose.model('Business', businessSchema);

    // Find the specific business
    const business = await Business.findOne({ business_name: /jkr cleaning services/i });

    if (!business) {
      console.error('Business not found in MongoDB');
      process.exit(1);
    }

    console.log('Found business:', business.business_name);

    // Sync to Pinecone
    const result = await syncBusinessToPinecone(business);
    
    if (result) {
      console.log('Successfully synced business to Pinecone');
    } else {
      console.error('Failed to sync business to Pinecone');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main(); 