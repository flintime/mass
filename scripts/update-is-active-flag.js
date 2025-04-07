// Script to update all businesses with the is_active flag based on subscription status
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the businesses collection
    const db = mongoose.connection.db;
    const businessesCollection = db.collection('businesses');
    
    // Get current timestamp in seconds
    const now = Math.floor(Date.now() / 1000);
    
    console.log('Updating businesses...');
    
    // Get all businesses without is_active flag
    const businesses = await businessesCollection.find({}).toArray();
    console.log(`Found ${businesses.length} businesses to check`);
    
    let activatedCount = 0;
    let deactivatedCount = 0;
    
    // Process each business
    for (const business of businesses) {
      let isActive = false;
      let reason = '';
      
      // Check new subscription format
      if (business.subscription) {
        if (business.subscription.status === 'active' || business.subscription.status === 'trialing') {
          isActive = true;
          reason = `subscription.status is ${business.subscription.status}`;
        } else if (business.subscription.current_period_end && business.subscription.current_period_end > now) {
          isActive = true;
          reason = 'subscription period not yet ended';
        }
      }
      
      // Check old subscription format as fallback
      if (!isActive && business.subscription_status === 'active') {
        isActive = true;
        reason = 'subscription_status is active';
      }
      
      // Update the business
      await businessesCollection.updateOne(
        { _id: business._id },
        { $set: { is_active: isActive } }
      );
      
      // Log the result
      if (isActive) {
        activatedCount++;
        console.log(`Activated: ${business.business_name || business.email || business._id} (${reason})`);
      } else {
        deactivatedCount++;
        console.log(`Deactivated: ${business.business_name || business.email || business._id}`);
      }
    }
    
    console.log('\nSummary:');
    console.log(`- Activated: ${activatedCount} businesses`);
    console.log(`- Deactivated: ${deactivatedCount} businesses`);
    console.log(`- Total: ${businesses.length} businesses`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
main(); 