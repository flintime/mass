/**
 * This script checks the subscription status of a business in the database.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Get the business ID from command line arguments or use default
const businessId = process.argv[2] || '67d82229ad4dfc67dc0b64b9';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Define a simplified Business schema for this script
const businessSchema = new mongoose.Schema({
  business_name: String,
  email: String,
  is_active: Boolean,
  subscription: {
    status: String,
    stripe_customer_id: String,
    stripe_subscription_id: String,
    current_period_end: Number,
    canceled_at: Number
  },
  // For backward compatibility
  subscription_status: String,
  stripe_customer_id: String,
  stripe_subscription_id: String,
  subscription_start_date: Date,
  subscription_end_date: Date
});

const Business = mongoose.model('Business', businessSchema);

// Check business subscription
async function checkBusinessSubscription() {
  try {
    console.log(`Checking subscription for business with ID: ${businessId}`);
    
    const business = await Business.findById(businessId);
    
    if (!business) {
      console.error('Business not found');
      return;
    }
    
    console.log('\nBusiness information:');
    console.log('---------------------------------');
    console.log(`Name: ${business.business_name}`);
    console.log(`Email: ${business.email}`);
    console.log(`Is active: ${business.is_active}`);
    
    console.log('\nSubscription information (new format):');
    console.log('---------------------------------');
    if (business.subscription) {
      console.log(`Status: ${business.subscription.status}`);
      console.log(`Stripe customer ID: ${business.subscription.stripe_customer_id}`);
      console.log(`Stripe subscription ID: ${business.subscription.stripe_subscription_id}`);
      
      if (business.subscription.current_period_end) {
        const endDate = new Date(business.subscription.current_period_end * 1000);
        console.log(`Current period end: ${endDate.toLocaleString()}`);
      }
      
      if (business.subscription.canceled_at) {
        const cancelDate = new Date(business.subscription.canceled_at * 1000);
        console.log(`Canceled at: ${cancelDate.toLocaleString()}`);
      }
    } else {
      console.log('No subscription data (new format)');
    }
    
    console.log('\nSubscription information (legacy format):');
    console.log('---------------------------------');
    console.log(`Status: ${business.subscription_status}`);
    console.log(`Stripe customer ID: ${business.stripe_customer_id}`);
    console.log(`Stripe subscription ID: ${business.stripe_subscription_id}`);
    
    if (business.subscription_start_date) {
      console.log(`Start date: ${business.subscription_start_date.toLocaleString()}`);
    }
    
    if (business.subscription_end_date) {
      console.log(`End date: ${business.subscription_end_date.toLocaleString()}`);
    }
    
    return business;
  } catch (error) {
    console.error('Error checking business subscription:', error);
  }
}

// Main function
async function main() {
  await connectDB();
  
  try {
    await checkBusinessSubscription();
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
main(); 