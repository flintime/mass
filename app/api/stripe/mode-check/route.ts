import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET() {
  try {
    console.log('Checking Stripe mode');
    
    // Initialize Stripe with the API key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: process.env.STRIPE_API_VERSION as any || '2023-10-16',
    });
    
    // Check key validity by making a simple API call
    const customers = await stripe.customers.list({ limit: 1 });
    
    // For a connected account, you'd use this:
    // const account = await stripe.accounts.retrieve('acct_123');
    
    // For your platform account (default), check config
    const config = await stripe.countrySpecs.retrieve('US');
    
    // The key type is determined by the prefix
    const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') || false;
    
    return NextResponse.json({
      mode: isLiveKey ? 'live' : 'test',
      keyType: isLiveKey ? 'live' : 'test',
      apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
      customerCount: customers.data.length,
      isWorking: true,
      environment: {
        supportedCurrencies: config.supported_payment_currencies.slice(0, 5)
      }
    });
  } catch (error: any) {
    console.error('Error checking Stripe mode:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to check Stripe mode',
        keyType: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'live' : 'test',
        apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
        isWorking: false
      }, 
      { status: 500 }
    );
  }
} 