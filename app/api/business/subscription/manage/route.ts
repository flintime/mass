import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

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
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: process.env.STRIPE_API_VERSION as any || '2023-10-16',
  });

  try {
    console.log('📌 Subscription manage API called');
    
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
    
    // Also check if data is in a nested subscription object 
    if (business.subscription) {
      console.log('🔍 Found nested subscription object:', business.subscription);
      stripeCustomerId = stripeCustomerId || business.subscription.stripe_customer_id;
      stripeSubscriptionId = stripeSubscriptionId || business.subscription.stripe_subscription_id;
    }
    
    console.log('🔍 Extracted customer ID:', stripeCustomerId);
    
    // Check if business has a Stripe customer ID
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400 }
      );
    }

    // Create billing portal session
    try {
      console.log('🔍 Creating Stripe portal session for customer:', stripeCustomerId);
      
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${baseUrl}/business/dashboard/settings`
      });
      
      console.log('🔍 Successfully created portal session');
      return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
      console.error('❌ Stripe portal session error:', error.message);
      
      // Check Stripe API key issue
      if (error.message?.includes('No such customer')) {
        return NextResponse.json(
          { error: 'The customer ID is not valid or does not exist in Stripe.' },
          { status: 400 }
        );
      }
      
      // Check for configuration issue
      if (error.message?.includes('configuration') || error.message?.includes('portal settings')) {
        return NextResponse.json(
          { 
            error: 'Stripe Customer Portal configuration issue. Please follow these steps:',
            steps: [
              '1. Go to https://dashboard.stripe.com/settings/billing/portal',
              '2. Set up the portal configuration', 
              '3. Make sure live mode is selected', 
              '4. Verify your Stripe API key is correct'
            ],
            stripeError: error.message
          },
          { status: 400 }
        );
      }
      
      // Generic error
      return NextResponse.json(
        { error: `Failed to create portal session: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error creating billing portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
} 