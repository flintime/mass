const mongoose = require('mongoose');
require('dotenv').config();

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    
    // Get the businesses collection
    const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false }));
    
    // Count total businesses
    const count = await Business.countDocuments();
    console.log(`Total businesses in database: ${count}`);
    
    // Sample a few businesses to check categories
    const sample = await Business.find().limit(5).select('business_name Business_Category');
    console.log('\nSample businesses:');
    console.log(JSON.stringify(sample, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDB(); 