import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/app/lib/auth';
import dbConnect from '@/app/lib/db';
import mongoose from 'mongoose';
import { IBusiness } from '@/models/business.model';
import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: process.env.STRIPE_API_VERSION as any || '2023-10-16',
});

export async function POST(request: Request) {
  try {
    // Get user from the auth token
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();
    const Business = mongoose.model<IBusiness>('Business');
    const business = await Business.findOne({ email: user.email });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Create or retrieve customer
    let customerId = business.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          businessId: business._id.toString(),
        },
      });
      customerId = customer.id;
      
      // Update business with customer ID
      await Business.updateOne(
        { _id: business._id },
        { stripe_customer_id: customerId }
      );
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/dashboard/chat?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/billing`,
      subscription_data: {
        metadata: {
          businessId: business._id.toString(),
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 