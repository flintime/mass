// Script to add subscription fields to Salem Haircuts business
require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

async function main() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the businesses collection
    const db = mongoose.connection.db;
    const businessesCollection = db.collection('businesses');

    // Look for Salem Haircuts by ID or name
    const businessId = '67d768b4d10caa1ff4c2470d'; 
    const businessName = 'Salem Haircuts';
    
    let business = await businessesCollection.findOne({ 
      $or: [
        { _id: new ObjectId(businessId) },
        { business_name: businessName, unique_id: 'salemcleaner' }
      ]
    });

    if (!business) {
      console.error('Business not found');
      return;
    }

    console.log(`Found business: ${business.business_name} with ID: ${business._id}`);

    // Create the subscription data
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60); // 30 days in seconds
    
    const subscriptionData = {
      status: 'active',
      stripe_customer_id: 'cus_' + Math.random().toString(36).substring(2, 12),
      stripe_subscription_id: 'sub_' + Math.random().toString(36).substring(2, 12),
      current_period_end: thirtyDaysFromNow,
      canceled_at: null
    };

    // Update the business record
    const result = await businessesCollection.updateOne(
      { _id: business._id },
      { 
        $set: { 
          subscription: subscriptionData,
          subscription_status: 'active',
          subscription_start_date: new Date(),
          subscription_end_date: new Date(thirtyDaysFromNow * 1000)
        } 
      }
    );

    if (result.modifiedCount === 1) {
      console.log('Subscription fields added successfully:');
      console.log(JSON.stringify(subscriptionData, null, 2));
    } else {
      console.log('No document was updated');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

main(); 