/**
 * This script simulates a webhook event and adds detailed logging for debugging.
 */

const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Business ID from the test business we created
const businessId = '67d82229ad4dfc67dc0b64b9';
const customerId = 'cus_RxYkFj0q9hv1J2';
const subscriptionId = 'sub_test_' + Date.now();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
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
      subscription_status: String,
      stripe_customer_id: String,
      stripe_subscription_id: String,
      subscription_start_date: Date,
      subscription_end_date: Date
    });
    
    return mongoose.model('Business', businessSchema);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Simulate a checkout.session.completed webhook
async function simulateWebhook(Business) {
  console.log('Creating webhook payload for checkout.session.completed');
  
  const eventPayload = {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test_' + Math.random().toString(36).substring(2, 15),
        object: 'checkout.session',
        customer: customerId,
        subscription: subscriptionId,
        mode: 'subscription',
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          businessId: businessId
        },
        customer_email: 'test-webhooks@example.com',
        client_reference_id: businessId,
        currency: 'usd',
        amount_total: 4999,
        created: Math.floor(Date.now() / 1000) - 60
      }
    },
    livemode: false,
    type: 'checkout.session.completed',
    pending_webhooks: 1
  };
  
  // Get the webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log(`Using webhook secret: ${webhookSecret ? 'Found (length: ' + webhookSecret.length + ')' : 'Not found!'}`);
  
  if (!webhookSecret) {
    throw new Error('Webhook secret not found in environment variables');
  }
  
  // Convert payload to string
  const payloadString = JSON.stringify(eventPayload);
  console.log('Event payload created');
  
  // Get current timestamp in seconds
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create signature - this is the critical part
  const signedPayload = `${timestamp}.${payloadString}`;
  console.log('Created signed payload for signature generation');
  
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');
  console.log(`Generated signature: ${signature.substring(0, 10)}...`);
  
  // Construct Stripe signature header
  const stripeSignature = `t=${timestamp},v1=${signature}`;
  console.log(`Constructed Stripe-Signature header: t=${timestamp},v1=${signature.substring(0, 10)}...`);
  
  // First, check the business before sending the webhook
  const businessBefore = await Business.findById(businessId);
  console.log('\nBusiness subscription state BEFORE webhook:');
  console.log('------------------------------------------');
  if (businessBefore) {
    console.log(`Is active: ${businessBefore.is_active}`);
    console.log(`Subscription status (new): ${businessBefore.subscription?.status}`);
    console.log(`Subscription status (old): ${businessBefore.subscription_status}`);
    console.log(`Stripe subscription ID: ${businessBefore.subscription?.stripe_subscription_id || businessBefore.stripe_subscription_id}`);
  } else {
    console.log('Business not found!');
    return;
  }
  
  // Send the webhook event to your local endpoint
  console.log('\nSending webhook to http://localhost:3000/api/stripe/webhook');
  
  try {
    const response = await axios.post(
      'http://localhost:3000/api/stripe/webhook',
      payloadString,
      {
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': stripeSignature
        }
      }
    );
    
    console.log(`Webhook response status: ${response.status} ${response.statusText}`);
    console.log('Response data:', response.data);
    
    // Wait a moment for database updates
    console.log('\nWaiting 2 seconds for database updates...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the business after sending the webhook
    const businessAfter = await Business.findById(businessId);
    console.log('\nBusiness subscription state AFTER webhook:');
    console.log('------------------------------------------');
    if (businessAfter) {
      console.log(`Is active: ${businessAfter.is_active}`);
      console.log(`Subscription status (new): ${businessAfter.subscription?.status}`);
      console.log(`Subscription status (old): ${businessAfter.subscription_status}`);
      console.log(`Stripe subscription ID: ${businessAfter.subscription?.stripe_subscription_id || businessAfter.stripe_subscription_id}`);
      
      if (businessAfter.is_active === businessBefore.is_active &&
          businessAfter.subscription?.status === businessBefore.subscription?.status &&
          businessAfter.subscription_status === businessBefore.subscription_status) {
        console.log('\n⚠️ WARNING: Subscription state did not change! Check webhook processing.');
      } else {
        console.log('\n✅ SUCCESS: Subscription state changed successfully!');
      }
    } else {
      console.log('Business not found after webhook!');
    }
    
    return true;
  } catch (error) {
    console.error('Error sending webhook:', error.response?.data || error.message);
    throw error;
  }
}

// Main function
async function main() {
  const Business = await connectDB();
  
  try {
    await simulateWebhook(Business);
    console.log('\nWebhook simulation completed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
main(); 