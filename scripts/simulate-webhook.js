/**
 * This script simulates a Stripe webhook event for local testing.
 */

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Business ID from the test business we created
const businessId = '67d82229ad4dfc67dc0b64b9';
const customerId = 'cus_RxYkFj0q9hv1J2';
const subscriptionId = 'sub_' + Math.random().toString(36).substring(2, 15);

// Function to create and send a simulated webhook
async function simulateWebhook(event_type) {
  try {
    console.log(`Simulating ${event_type} webhook event`);
    
    // Create the webhook payload based on event type
    let eventPayload;
    
    if (event_type === 'checkout.session.completed') {
      eventPayload = {
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
            livemode: false,
            client_reference_id: businessId,
            currency: 'usd',
            amount_total: 4999,
            created: Math.floor(Date.now() / 1000) - 60
          }
        },
        livemode: false,
        type: event_type,
        pending_webhooks: 1
      };
    } else if (event_type === 'invoice.payment_succeeded') {
      eventPayload = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        api_version: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'in_test_' + Math.random().toString(36).substring(2, 15),
            object: 'invoice',
            customer: customerId,
            subscription: subscriptionId,
            status: 'paid',
            paid: true,
            total: 4999
          }
        },
        type: event_type
      };
    } else if (event_type === 'customer.subscription.updated') {
      eventPayload = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        api_version: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: subscriptionId,
            object: 'subscription',
            customer: customerId,
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
            metadata: {
              businessId: businessId
            }
          }
        },
        type: event_type
      };
    } else if (event_type === 'customer.subscription.deleted') {
      eventPayload = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        api_version: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: subscriptionId,
            object: 'subscription',
            customer: customerId,
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000),
            metadata: {
              businessId: businessId
            }
          }
        },
        type: event_type
      };
    } else {
      throw new Error(`Unsupported event type: ${event_type}`);
    }
    
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
    console.log(`Sending ${event_type} webhook event to http://localhost:3000/api/stripe/webhook`);
    
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
      console.log(`Webhook ${event_type} sent successfully!`);
      return true;
    } catch (error) {
      console.error('Error sending webhook:', error.response?.data || error.message);
      return false;
    }
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Simulating subscription lifecycle events...');
  console.log(`Using business ID: ${businessId}`);
  console.log(`Using customer ID: ${customerId}`);
  console.log(`Using subscription ID: ${subscriptionId}\n`);
  
  // Send a checkout.session.completed event
  const checkout = await simulateWebhook('checkout.session.completed');
  if (checkout) {
    console.log('\nCheckout webhook sent successfully');
    console.log('This should create an active subscription for the business\n');
  }
  
  // Ask if user wants to simulate a canceled subscription
  console.log('\nTo simulate a canceled subscription, run:');
  console.log('node scripts/simulate-webhook.js cancel\n');
}

// Check command line arguments
if (process.argv[2] === 'cancel') {
  simulateWebhook('customer.subscription.deleted')
    .then(() => console.log('\nSubscription cancellation event sent'))
    .catch(error => console.error('Error:', error));
} else {
  main()
    .then(() => console.log('Webhook simulation completed'))
    .catch(error => console.error('Error:', error));
} 