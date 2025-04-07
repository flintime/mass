import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

// Use Edge runtime to get raw request body
export const runtime = "edge";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // @ts-ignore - We need to use the version specified in .env
  apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16' // Use standard API version
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('Webhook Error: No Stripe signature found');
    return NextResponse.json({ error: 'No signature found' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Webhook Error: Webhook secret not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event;

  try {
    // Verify the event came from Stripe
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (signatureError: any) {
      console.error('Webhook signature verification failed:', {
        message: signatureError.message,
        signatureHeader: signature?.substring(0, 20) + '...',
        webhookSecretFirstChars: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 6) + '...',
        bodyLength: body.length
      });
      throw signatureError;
    }

    console.log(`Received verified event: ${event.type}`);

    // Forward the verified event to our internal processing endpoint
    const url = new URL('/api/stripe/process-webhook', req.url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-verified': 'true',
        'x-internal-secret': process.env.INTERNAL_WEBHOOK_SECRET || 'no-secret-defined'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from processing endpoint: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to process webhook internally' },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }
} 