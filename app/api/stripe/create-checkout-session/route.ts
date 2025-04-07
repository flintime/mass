import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

// Initialize Stripe with the API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore - We need to use the version specified in .env
  apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
});

export async function POST(req: Request) {
  try {
    console.log('Creating checkout session');
    
    // Parse request body
    const { businessId, businessEmail } = await req.json();
    
    if (!businessId) {
      console.error('Missing businessId in request');
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    if (!businessEmail) {
      console.error('Missing businessEmail in request');
      return NextResponse.json({ error: 'Business email is required' }, { status: 400 });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'amazon_pay', 'cashapp'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Subscribe to Flintime Pro',
              description: 'Gain access to AI-powered customer engagement, appointment scheduling, and business discovery on Flintime. Your business profile remains active as long as your subscription is valid. Cancel anytime.',
              tax_code: 'txcd_10000000', // General service tax code
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
      success_url: `${req.headers.get('origin')}/business/dashboard/chat?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/business/signup`,
      customer_email: businessEmail,
      allow_promotion_codes: true, // Enable coupon code input on checkout page
      automatic_tax: {
        enabled: true, // Enable automatic tax calculation
      },
      tax_id_collection: {
        enabled: true, // Allow customers to provide their tax ID
      },
      metadata: {
        businessId: businessId,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
} 