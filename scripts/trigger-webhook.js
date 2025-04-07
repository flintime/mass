/**
 * This script simulates a checkout.session.completed webhook event
 * with real data from your database.
 */

const Stripe = require('stripe');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Initialize Stripe with the API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
});

// Get the business ID and session ID from command line arguments or use defaults
const businessId = process.argv[2] || '67d82229ad4dfc67dc0b64b9';
const sessionId = process.argv[3] || 'cs_live_a10mwEcEXV4JuzuXVPqI1jmWAmuL6nWv6540rcMsPjbP5VwIlp40cYL4rZ';

// Function to create a subscription and trigger the webhook
async function createSubscriptionAndTriggerWebhook() {
  try {
    console.log(`Using business ID: ${businessId}`);
    console.log(`Using session ID: ${sessionId}`);
    
    // Get the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Retrieved session:', session.id);
    
    // Create a subscription for the customer
    const customerId = session.customer;
    console.log('Customer ID:', customerId);
    
    // Check if price exists for our product, create one if not
    let price;
    try {
      const prices = await stripe.prices.list({
        lookup_keys: ['flintime_pro_monthly'],
        expand: ['data.product']
      });
      
      if (prices.data.length > 0) {
        price = prices.data[0];
        console.log('Using existing price:', price.id);
      } else {
        // Create a product
        const product = await stripe.products.create({
          name: 'Flintime Pro Subscription',
          description: 'AI-powered business subscription'
        });
        console.log('Created product:', product.id);
        
        // Create a price
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: 4999,
          currency: 'usd',
          recurring: { interval: 'month' },
          lookup_key: 'flintime_pro_monthly'
        });
        console.log('Created price:', price.id);
      }
    } catch (error) {
      console.error('Error getting/creating price:', error);
      throw error;
    }
    
    // Create a subscription
    let subscription;
    try {
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        metadata: {
          businessId: businessId
        }
      });
      console.log('Created subscription:', subscription.id);
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
    
    // Update the session with the subscription ID
    const updatedSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Create a checkout.session.completed event
    const eventPayload = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      api_version: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          ...updatedSession,
          status: 'complete',
          payment_status: 'paid',
          subscription: subscription.id
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: 'req_test',
        idempotency_key: 'TEST_IDEMPOTENCY_KEY'
      },
      type: 'checkout.session.completed'
    };
    
    console.log('Created webhook event payload');
    
    // Get the webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Webhook secret not found in environment variables');
    }
    
    // Convert payload to string
    const payloadString = JSON.stringify(eventPayload);
    
    // Get current timestamp in seconds
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create signature
    const signedPayload = `${timestamp}.${payloadString}`;
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');
    
    // Construct Stripe signature header
    const stripeSignature = `t=${timestamp},v1=${signature}`;
    
    // Send the webhook event to your local endpoint
    console.log('Sending webhook event to http://localhost:3000/api/stripe/webhook');
    
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
      
      console.log('Webhook response:', response.status, response.statusText);
      console.log('Webhook sent successfully!');
    } catch (error) {
      console.error('Error sending webhook:', error.response?.data || error.message);
    }
    
    // Create additional events
    console.log('\nTo trigger other events like invoice.payment_succeeded:');
    console.log(`1. Look up the subscription ID: ${subscription.id}`);
    console.log('2. Run similar code but with a different event type');
    
    return {
      businessId,
      customerId,
      subscriptionId: subscription.id
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Run the script
createSubscriptionAndTriggerWebhook()
  .then(result => {
    console.log('\nSummary:');
    console.log(`Business ID: ${result.businessId}`);
    console.log(`Customer ID: ${result.customerId}`);
    console.log(`Subscription ID: ${result.subscriptionId}`);
    console.log('\nCheck your application logs to verify the webhook was processed!');
  })
  .catch(error => {
    console.error('Script failed:', error);
  }); 