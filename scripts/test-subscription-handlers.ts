import mongoose from 'mongoose';
import {
  handleTrialEnding,
  handleSubscriptionCancelled,
  handlePaymentFailed,
  handleSubscriptionRenewed,
} from '@/lib/subscription-handlers';
import { IBusiness } from '@/models/business.model';

async function testSubscriptionHandlers() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to database');

    // Create a test business
    const Business = mongoose.model<IBusiness>('Business');
    const testBusiness = await Business.create({
      email: process.env.TEST_EMAIL || 'test@example.com',
      business_name: 'Test Business',
      password: 'test123',
      subscription_status: 'trial',
      trialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
    });

    console.log('Created test business:', testBusiness._id);

    // Test trial ending handler
    console.log('\nTesting trial ending handler...');
    await handleTrialEnding(testBusiness);

    // Test subscription cancelled handler
    console.log('\nTesting subscription cancelled handler...');
    await handleSubscriptionCancelled(testBusiness);

    // Test payment failed handler
    console.log('\nTesting payment failed handler...');
    await handlePaymentFailed(testBusiness);

    // Test subscription renewed handler
    console.log('\nTesting subscription renewed handler...');
    await handleSubscriptionRenewed(testBusiness, 'sub_test');

    // Clean up test data
    await Business.findByIdAndDelete(testBusiness._id);
    console.log('\nCleaned up test data');

    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from database');
  } catch (error) {
    console.error('Error running subscription handler tests:', error);
    process.exit(1);
  }
}

testSubscriptionHandlers(); 