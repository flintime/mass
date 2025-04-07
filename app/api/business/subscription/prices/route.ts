import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function GET() {
  try {
    // Fetch all active prices with their associated products
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      type: 'recurring'
    });

    // Find monthly price
    const monthlyPrice = prices.data.find(
      price => price.recurring?.interval === 'month' && 
      (price.product as Stripe.Product).active
    );

    if (!monthlyPrice) {
      return NextResponse.json(
        { error: 'Subscription price not found' },
        { status: 404 }
      );
    }

    // Get complete product information
    const monthlyProduct = monthlyPrice.product as Stripe.Product;

    return NextResponse.json({
      monthly: {
        id: monthlyPrice.id,
        unit_amount: monthlyPrice.unit_amount,
        currency: monthlyPrice.currency,
        interval: monthlyPrice.recurring?.interval,
        product: {
          name: monthlyProduct.name,
          description: monthlyProduct.description,
          features: monthlyProduct.features?.map(f => f.name) || [],
          metadata: monthlyProduct.metadata
        }
      }
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription prices' },
      { status: 500 }
    );
  }
} 