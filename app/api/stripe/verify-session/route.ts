import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Business } from '@/models/Business';
import dbConnect from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore - TypeScript expects a newer version, but we need to match CLI version
  apiVersion: '2024-11-20.acacia',
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Connect to the database
    await dbConnect();

    // Check if a business account exists for this session using stripe_customer_id
    // which is set by our webhook handler
    const business = await Business.findOne({
      stripe_customer_id: session.customer
    });

    console.log('Verify session:', {
      sessionId,
      customer: session.customer,
      businessFound: !!business
    });

    if (business) {
      // Business account exists, payment was successful and processed
      return NextResponse.json({
        status: 'complete',
        message: 'Payment successful and business account created'
      });
    }

    // Business account doesn't exist yet, webhook might still be processing
    return NextResponse.json({
      status: 'pending',
      message: 'Payment successful, setting up business account'
    });

  } catch (error: any) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to verify session'
      },
      { status: 500 }
    );
  }
} 