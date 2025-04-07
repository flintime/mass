/**
 * This script tests the webhook endpoint by sending a simulated Stripe webhook event.
 * Run it with: node scripts/test-webhook.js
 */

const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// Get webhook secret from environment or use the one from CLI
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_cede7bcd337b69ee372c1f033326f72dad6319309bdc968f6755837624357f56';

// Create a sample payload (checkout.session.completed event)
const payload = {
  id: 'evt_test123',
  object: 'event',
  api_version: '2024-11-20.acacia',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test123',
      object: 'checkout.session',
      customer: 'cus_test123',
      customer_email: 'test@example.com',
      subscription: 'sub_test123',
      metadata: {
        businessData: JSON.stringify({
          business_name: 'Test Business',
          unique_id: 'test-business-' + Date.now(),
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip_code: '12345',
          Website: 'https://testbusiness.com',
          description: 'A test business',
          Business_Category: 'Test Category',
          Business_Subcategories: ['Test Subcategory'],
          latitude: 37.7749,
          longitude: -122.4194
        })
      }
    }
  }
};

// Convert payload to string
const payloadString = JSON.stringify(payload);

// Calculate the signature (based on Stripe's logic)
// timestamp.schemes.signature
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payloadString}`;
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signedPayload)
  .digest('hex');

// Create the signature header
const signatureHeader = `t=${timestamp},v1=${signature}`;

// Test URL (local server)
const webhookUrl = 'http://localhost:3000/api/stripe/webhook';

console.log(`Testing webhook to ${webhookUrl}`);
console.log(`Using webhook secret: ${webhookSecret.slice(0, 10)}...`);
console.log(`Generated signature: ${signatureHeader.slice(0, 30)}...`);

// Send the webhook request
async function sendWebhook() {
  try {
    // Dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signatureHeader
      },
      body: payloadString
    });

    const status = response.status;
    const text = await response.text();
    
    console.log(`Response status: ${status}`);
    console.log(`Response body: ${text}`);
    
    if (status === 200) {
      console.log('✅ Webhook test succeeded');
    } else {
      console.log('❌ Webhook test failed');
    }
  } catch (error) {
    console.error('Error sending webhook:', error.message);
  }
}

sendWebhook(); 