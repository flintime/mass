import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/app/lib/db';
import mongoose from 'mongoose';

// List of paths that don't require subscription checks
const PUBLIC_PATHS = [
  '/business/signin',
  '/business/signup',
  '/business/billing',
  '/business/payment-success',
  '/api/business/auth',
  '/api/stripe'
];

export async function subscriptionMiddleware(req: NextRequest) {
  // Skip middleware for public paths
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath))) {
    return NextResponse.next();
  }

  // Get business token from cookies
  const businessAuthToken = req.cookies.get('businessAuthToken')?.value;
  if (!businessAuthToken) {
    return NextResponse.redirect(new URL('/business/signin', req.url));
  }

  try {
    // Connect to database
    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Find business by auth token
    const business = await db.collection('businesses').findOne(
      { 'auth.tokens': businessAuthToken },
      { projection: { subscription_status: 1, subscription_end: 1 } }
    );

    if (!business) {
      return NextResponse.redirect(new URL('/business/signin', req.url));
    }

    // Check subscription status
    if (business.subscription_status === 'past_due' || 
        business.subscription_status === 'cancelled') {
      // Allow access to billing page even with past_due status
      if (!path.startsWith('/business/billing')) {
        return NextResponse.redirect(new URL('/business/billing', req.url));
      }
    }

    // Check if subscription has expired
    if (business.subscription_end && business.subscription_end < Date.now()) {
      if (!path.startsWith('/business/billing')) {
        return NextResponse.redirect(new URL('/business/billing', req.url));
      }
    }

    // Add subscription status to request headers for use in the application
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-subscription-status', business.subscription_status);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Subscription middleware error:', error);
    // On error, allow the request to proceed but log the error
    return NextResponse.next();
  }
} 