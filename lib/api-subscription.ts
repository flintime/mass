import { Business } from '@/models/Business';
import dbConnect from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get businesses with active subscriptions
 * 
 * @returns Array of businesses with active subscriptions
 */
export const getActiveBusinesses = async () => {
  await dbConnect();
  
  const now = Math.floor(Date.now() / 1000);
  const businesses = await Business.find({
    "is_active": true,
    "subscription.current_period_end": { $gte: now }
  });

  return businesses;
};

/**
 * Check if a business has an active subscription in API routes
 * 
 * @param businessId - The business ID to check subscription for
 * @returns Boolean indicating if the business has an active subscription
 */
export const hasActiveSubscription = async (businessId: string): Promise<boolean> => {
  await dbConnect();
  
  const business = await Business.findById(businessId);
  
  if (!business) {
    return false;
  }

  // First check the is_active flag (fastest way to check)
  if (business.is_active === true) {
    return true;
  }
  
  // If is_active is false, do a deeper check to ensure we didn't miss anything
  
  // Check subscription in the new nested format
  if (business.subscription && business.subscription.status === 'active') {
    // Update is_active flag if needed
    await Business.findByIdAndUpdate(business._id, { $set: { is_active: true } });
    return true;
  }
  
  // Check if the subscription has expired
  if (business.subscription && business.subscription.current_period_end) {
    const now = Math.floor(Date.now() / 1000);
    if (business.subscription.current_period_end > now) {
      // Update is_active flag if needed
      await Business.findByIdAndUpdate(business._id, { $set: { is_active: true } });
      return true;
    }
  }
  
  // Check old subscription_status field for backward compatibility
  if (business.subscription_status === 'active') {
    // Update is_active flag if needed
    await Business.findByIdAndUpdate(business._id, { $set: { is_active: true } });
    return true;
  }
  
  return false;
};

/**
 * Middleware to restrict API access to businesses with active subscriptions
 * 
 * @param request - Next.js request object
 * @param businessId - Business ID to check
 * @returns NextResponse or undefined to continue processing
 */
export const requireSubscription = async (
  request: NextRequest, 
  businessId: string
): Promise<NextResponse | undefined> => {
  if (!businessId) {
    return NextResponse.json(
      { error: 'Unauthorized - Business ID required' }, 
      { status: 401 }
    );
  }
  
  const hasSubscription = await hasActiveSubscription(businessId);
  
  if (!hasSubscription) {
    return NextResponse.json(
      { error: 'Subscription required to access this feature' }, 
      { status: 403 }
    );
  }
  
  // Return undefined to continue processing the request
  return undefined;
};

/**
 * Example usage in an API route:
 * 
 * export async function GET(request: NextRequest) {
 *   const businessId = '...'; // Get from session, param, etc.
 *   
 *   // Check for subscription
 *   const subscriptionCheck = await requireSubscription(request, businessId);
 *   if (subscriptionCheck) return subscriptionCheck;
 *   
 *   // Continue processing for subscribed businesses
 *   return NextResponse.json({ data: '...' });
 * }
 */ 