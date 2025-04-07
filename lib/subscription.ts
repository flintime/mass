import { Business } from '@/models/Business';
import dbConnect from '@/lib/db';
import { ObjectId } from 'mongodb';

export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'cancelled' | 'past_due';

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return ['active', 'trial'].includes(status);
}

export function isSubscriptionExpired(endTime: number): boolean {
  return Date.now() > endTime;
}

export function getSubscriptionTimeRemaining(endTime: number): number {
  return Math.max(0, endTime - Date.now());
}

export function formatSubscriptionTimeRemaining(endTime: number): string {
  const remainingMs = getSubscriptionTimeRemaining(endTime);
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} remaining`;
  } else {
    return 'Expiring soon';
  }
}

export function getSubscriptionStatusDetails(status: SubscriptionStatus, endTime?: number) {
  const details = {
    label: '',
    color: '',
    message: ''
  };

  switch (status) {
    case 'active':
      details.label = 'Active';
      details.color = 'green';
      details.message = endTime ? formatSubscriptionTimeRemaining(endTime) : 'Subscription active';
      break;
    case 'trial':
      details.label = 'Trial';
      details.color = 'blue';
      details.message = endTime ? `Trial ${formatSubscriptionTimeRemaining(endTime)}` : 'Trial active';
      break;
    case 'past_due':
      details.label = 'Past Due';
      details.color = 'yellow';
      details.message = 'Payment required to continue service';
      break;
    case 'cancelled':
      details.label = 'Cancelled';
      details.color = 'red';
      details.message = endTime ? `Access until ${new Date(endTime).toLocaleDateString()}` : 'Subscription ended';
      break;
    case 'inactive':
      details.label = 'Inactive';
      details.color = 'gray';
      details.message = 'Subscription inactive';
      break;
  }

  return details;
}

export function shouldShowPaymentReminder(status: SubscriptionStatus, endTime: number): boolean {
  if (status === 'past_due') return true;
  if (!['active', 'trial'].includes(status)) return false;
  
  const daysRemaining = getSubscriptionTimeRemaining(endTime) / (1000 * 60 * 60 * 24);
  return daysRemaining <= 7; // Show reminder if 7 or fewer days remaining
}

export function getTrialDuration(): number {
  return 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
}

export function calculateNextBillingDate(currentPeriodEnd: number): Date {
  return new Date(currentPeriodEnd);
}

export function getSubscriptionPrice(): { monthly: number; annual: number } {
  return {
    monthly: 4999, // $49.99
    annual: 49990 // $499.90 (two months free)
  };
}

/**
 * Check if a business has an active subscription
 * @param businessId - The business ID or ObjectId
 * @returns true if subscription is active, throws error otherwise
 */
export const checkSubscription = async (businessId: string) => {
  await dbConnect();
  
  // Normalize the businessId to handle both string and ObjectId
  const id = typeof businessId === 'string' ? businessId : businessId.toString();
  
  // Find the business by ID
  const business = await Business.findById(id);
  
  // Check if business exists
  if (!business) {
    throw new Error("Business not found.");
  }
  
  // Check for subscription status in the nested subscription object (new format)
  if (business.subscription && business.subscription.status === "active") {
    return true;
  }
  
  // Fallback to check old subscription_status field (backward compatibility)
  if (business.subscription_status === "active") {
    return true;
  }
  
  // Check if the subscription has expired
  if (business.subscription && business.subscription.current_period_end) {
    const now = Math.floor(Date.now() / 1000);
    if (business.subscription.current_period_end > now) {
      return true;
    }
  }
  
  throw new Error("Active subscription required to access this feature.");
};

/**
 * Get subscription details for a business
 * @param businessId - The business ID or ObjectId
 * @returns Subscription details or null if not found
 */
export const getSubscriptionDetails = async (businessId: string) => {
  await dbConnect();
  
  const business = await Business.findById(businessId);
  if (!business) {
    return null;
  }
  
  // Return the new format subscription object if available
  if (business.subscription) {
    return {
      status: business.subscription.status,
      currentPeriodEnd: business.subscription.current_period_end 
        ? new Date(business.subscription.current_period_end * 1000)
        : null,
      stripeCustomerId: business.subscription.stripe_customer_id,
      stripeSubscriptionId: business.subscription.stripe_subscription_id,
      isActive: business.subscription.status === 'active'
    };
  }
  
  // Fallback to old format
  return {
    status: business.subscription_status || 'inactive',
    currentPeriodEnd: business.subscription_end_date || null,
    stripeCustomerId: business.stripe_customer_id || null,
    stripeSubscriptionId: business.stripe_subscription_id || null,
    isActive: business.subscription_status === 'active'
  };
}; 