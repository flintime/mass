import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Attempt to extract data from token using different methods
function extractTokenData(token: string) {
  try {
    // Try JWT verify with the environment secret
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (decoded && (decoded.email || decoded.businessId)) {
        console.log('🔑 Successfully decoded with JWT_SECRET');
        return { success: true, data: decoded };
      }
    } catch (e) {
      console.log('🔑 Failed to decode with JWT_SECRET:', e);
    }

    // Try parsing as JSON Web Token without verification
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('🔑 Successfully parsed JWT without verification');
        return { success: true, data: payload };
      }
    } catch (e) {
      console.log('🔑 Failed to parse as JWT:', e);
    }

    // Try parsing as JSON
    try {
      const data = JSON.parse(token);
      if (data && (data.email || data.businessId)) {
        console.log('🔑 Successfully parsed as JSON');
        return { success: true, data };
      }
    } catch (e) {
      console.log('🔑 Failed to parse as JSON:', e);
    }

    return { success: false, error: 'Could not extract data from token' };
  } catch (error) {
    console.error('🔑 Token extraction error:', error);
    return { success: false, error: 'Token extraction failed' };
  }
}

export async function GET(request: Request) {
  try {
    console.log('📌 Subscription status API called');
    
    // Try multiple auth methods
    const cookieStore = cookies();
    const headersList = headers();
    
    // 1. Check for token in cookies
    const cookieToken = cookieStore.get('businessAuthToken')?.value;
    console.log('🔍 Cookie token found:', !!cookieToken);
    
    // 2. Check for token in Authorization header
    const authHeader = headersList.get('Authorization');
    const headerToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    console.log('🔍 Header token found:', !!headerToken);
    
    // Use whichever token we found
    const token = cookieToken || headerToken;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract data from token
    const { success, data, error } = extractTokenData(token);
    
    if (!success || !data || (!data.email && !data.businessId)) {
      console.error('🔍 Token data extraction failed:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token: ' + error },
        { status: 401 }
      );
    }
    
    // Log the extracted data
    console.log('🔍 Token data extracted:', {
      hasBusinessId: !!data.businessId,
      hasEmail: !!data.email,
      email: data.email ? `${data.email.substring(0, 5)}...` : 'none'
    });

    // Use email or businessId for lookup
    const queryParam = data.email 
      ? `email=${encodeURIComponent(data.email)}` 
      : `uniqueId=${encodeURIComponent(data.businessId)}`;
    
    // Use a full URL for lookup
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const lookupUrl = `${baseUrl}/api/business/lookup-id?${queryParam}`;
    console.log('🔍 Using lookup URL:', lookupUrl);

    // Find business record associated with session
    const response = await fetch(lookupUrl, { 
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 Business lookup failed:', errorText);
      return NextResponse.json(
        { error: 'Could not find business record: ' + errorText },
        { status: 400 }
      );
    }

    const business = await response.json();
    console.log('🔍 Business found:', {
      hasStripeCustomerId: !!business.stripe_customer_id,
      hasStripeSubscriptionId: !!business.stripe_subscription_id,
      hasSubscriptionObject: !!business.subscription
    });
    console.log('🔍 All field names:', Object.keys(business));
    console.log('🔍 All Stripe-related fields:', Object.keys(business).filter(f => f.toLowerCase().includes('stripe')));
    
    // Create a subscription info object, checking different possible locations
    let stripeCustomerId = business.stripe_customer_id;
    let stripeSubscriptionId = business.stripe_subscription_id;
    let subscriptionStatus = business.status;
    let currentPeriodEnd = business.current_period_end;
    let isActive = business.is_active;

    // Also check if data is in a nested subscription object 
    if (business.subscription) {
      console.log('🔍 Found nested subscription object:', business.subscription);
      stripeCustomerId = stripeCustomerId || business.subscription.stripe_customer_id;
      stripeSubscriptionId = stripeSubscriptionId || business.subscription.stripe_subscription_id;
      subscriptionStatus = subscriptionStatus || business.subscription.status;
      currentPeriodEnd = currentPeriodEnd || business.subscription.current_period_end;
      isActive = isActive !== undefined ? isActive : business.subscription.is_active;
    }
    
    console.log('🔍 Extracted subscription data:', {
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus,
      currentPeriodEnd,
      isActive
    });
    
    // Check if business has a Stripe customer ID
    if (!stripeCustomerId) {
      return NextResponse.json({
        subscription: {
          status: 'none',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null
        }
      });
    }

    // If there's a subscription ID, get the subscription details
    if (stripeSubscriptionId) {
      try {
        console.log('🔍 Retrieving subscription from Stripe:', stripeSubscriptionId);
        const subscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        );
        console.log('🔍 Stripe subscription retrieved:', subscription.status);

        return NextResponse.json({
          subscription: {
            status: subscription.status,
            stripeCustomerId: stripeCustomerId,
            stripeSubscriptionId: stripeSubscriptionId,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
          }
        });
      } catch (stripeError) {
        console.error('🔍 Stripe subscription retrieval error:', stripeError);
        
        // If we can't retrieve from Stripe, fall back to stored data
        if (subscriptionStatus) {
          return NextResponse.json({
            subscription: {
              status: subscriptionStatus,
              stripeCustomerId: stripeCustomerId,
              stripeSubscriptionId: stripeSubscriptionId,
              currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null
            }
          });
        }
      }
    }

    // If there's already status data in the database, use it
    if (subscriptionStatus === 'active' || isActive) {
      return NextResponse.json({
        subscription: {
          status: subscriptionStatus || 'active',
          stripeCustomerId: stripeCustomerId,
          stripeSubscriptionId: stripeSubscriptionId,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null
        }
      });
    }

    // If there's a customer but no subscription
    return NextResponse.json({
      subscription: {
        status: 'none',
        stripeCustomerId: stripeCustomerId,
        stripeSubscriptionId: null,
        currentPeriodEnd: null
      }
    });
  } catch (error: any) {
    console.error('❌ Error checking subscription status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check subscription status' },
      { status: 500 }
    );
  }
} 