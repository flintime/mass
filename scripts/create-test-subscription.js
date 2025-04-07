/**
 * This script creates a test business and initiates a real Stripe checkout session.
 * It's useful for local testing of the subscription workflow.
 */

const mongoose = require('mongoose');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

// Initialize Stripe with the API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
});

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
  unique_id: { type: String, default: () => Math.random().toString(36).substring(2, 15) },
  is_active: { type: Boolean, default: false },
  subscription: {
    status: { type: String, default: 'inactive' },
    stripe_customer_id: String,
    stripe_subscription_id: String,
    current_period_end: Number,
    canceled_at: Number
  }
});

// For backward compatibility
businessSchema.add({
  subscription_status: String,
  stripe_customer_id: String,
  stripe_subscription_id: String,
  subscription_start_date: Date,
  subscription_end_date: Date
});

const Business = mongoose.model('Business', businessSchema);

// Create a test business
async function createTestBusiness() {
  try {
    // Check if test business already exists
    let testBusiness = await Business.findOne({ business_name: 'Test Business for Webhooks' });
    
    if (!testBusiness) {
      console.log('Creating new test business...');
      testBusiness = await Business.create({
        business_name: 'Test Business for Webhooks',
        email: 'test-webhooks@example.com',
        is_active: false,
        subscription: {
          status: 'inactive'
        },
        subscription_status: 'inactive'
      });
      console.log('Created test business:', testBusiness._id);
    } else {
      console.log('Using existing test business:', testBusiness._id);
    }
    
    return testBusiness;
  } catch (error) {
    console.error('Error creating test business:', error);
    throw error;
  }
}

// Create a Stripe checkout session
async function createCheckoutSession(business) {
  try {
    console.log('Creating Stripe checkout session for business:', business._id);
    
    // Create or get a customer
    let customer;
    if (business.stripe_customer_id) {
      console.log('Using existing Stripe customer:', business.stripe_customer_id);
      customer = await stripe.customers.retrieve(business.stripe_customer_id);
    } else {
      console.log('Creating new Stripe customer');
      customer = await stripe.customers.create({
        email: business.email,
        metadata: {
          businessId: business._id.toString()
        }
      });
      
      // Update business with customer ID
      await Business.findByIdAndUpdate(business._id, {
        $set: { 'subscription.stripe_customer_id': customer.id, stripe_customer_id: customer.id }
      });
      
      console.log('Created Stripe customer:', customer.id);
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Subscribe to Flintime Pro',
              description: 'Gain access to AI-powered customer engagement, appointment scheduling, and business discovery on Flintime.',
              images: [
                'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png'
              ],
            },
            unit_amount: 4999, // $49.99 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `http://localhost:3000/business/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/business/subscription`,
      metadata: {
        businessId: business._id.toString(),
      },
    });
    
    console.log('Checkout session created');
    console.log('Session ID:', session.id);
    console.log('Checkout URL:', session.url);
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Simulate a completed checkout (for testing)
async function simulateCompletedCheckout(sessionId) {
  try {
    console.log('Retrieving session:', sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Creating webhook event for checkout.session.completed');
    // Create a test event
    const event = {
      id: `evt_test_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: session
      }
    };
    
    // Print the webhook event payload
    console.log('=============================================');
    console.log('WEBHOOK PAYLOAD (checkout.session.completed):');
    console.log('=============================================');
    console.log(JSON.stringify(event, null, 2));
    console.log('=============================================');
    
    console.log('\nTo test this webhook, you can:');
    console.log('1. Make sure stripe listen is running');
    console.log('2. Use curl to send this payload to your webhook endpoint:');
    console.log(`curl -X POST http://localhost:3000/api/stripe/webhook \\
  -H "Content-Type: application/json" \\
  -H "Stripe-Signature: (get this from your stripe listen output)" \\
  -d '${JSON.stringify(event)}'`);
    
    return event;
  } catch (error) {
    console.error('Error simulating completed checkout:', error);
    throw error;
  }
}

// Main function
async function main() {
  await connectDB();
  
  try {
    // Create a test business
    const business = await createTestBusiness();
    
    // Create a checkout session
    const session = await createCheckoutSession(business);
    
    // For webhook testing, simulate a completed checkout
    await simulateCompletedCheckout(session.id);
    
    console.log('\nCheckout process completed successfully!');
    console.log(`Go to this URL to complete the checkout: ${session.url}`);
    console.log(`Business ID: ${business._id}`);
    console.log(`Session ID: ${session.id}`);
    
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
main(); 