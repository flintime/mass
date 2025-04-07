import { Stripe } from 'stripe';
import { IBusiness } from '@/models/business.model';
import { sendEmail } from './email';
import { formatSubscriptionTimeRemaining } from './subscription';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

interface EmailTemplate {
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

function getEmailTemplate(type: string, data: any): EmailTemplate {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const billingUrl = `${baseUrl}/business/billing`;

  switch (type) {
    case 'trial-ending':
      return {
        subject: 'Your Trial Period is Ending Soon',
        title: 'Trial Period Ending Soon',
        body: `Your trial period will end in ${data.timeRemaining}. Subscribe now to continue using all features.`,
        ctaText: 'Subscribe Now',
        ctaUrl: billingUrl,
      };

    case 'subscription-cancelled':
      return {
        subject: 'Subscription Cancelled',
        title: 'Your Subscription Has Been Cancelled',
        body: 'Your subscription has been cancelled. Your account will remain active until the end of your current billing period.',
        ctaText: 'Reactivate Subscription',
        ctaUrl: billingUrl,
      };

    case 'payment-failed':
      return {
        subject: 'Payment Failed',
        title: 'Payment Failed',
        body: 'We were unable to process your latest payment. Please update your payment method to continue using our services.',
        ctaText: 'Update Payment Method',
        ctaUrl: billingUrl,
      };

    case 'subscription-renewed':
      return {
        subject: 'Subscription Renewed',
        title: 'Subscription Successfully Renewed',
        body: 'Your subscription has been renewed. Thank you for your continued support!',
        ctaText: 'View Dashboard',
        ctaUrl: `${baseUrl}/business/dashboard`,
      };

    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
}

export async function handleTrialEnding(business: IBusiness): Promise<void> {
  try {
    // Check if we've already sent a notification
    if (business.trialEndNotificationSent) {
      return;
    }

    const timeRemaining = formatSubscriptionTimeRemaining(business.trialEndsAt!);
    const template = getEmailTemplate('trial-ending', { timeRemaining });

    const success = await sendEmail({
      to: business.email,
      ...template,
    });

    if (success) {
      // Update business record to mark notification as sent
      await mongoose.model('Business').findByIdAndUpdate(business._id, {
        trialEndNotificationSent: true,
      });
    }
  } catch (error) {
    console.error('Error handling trial ending:', error);
  }
}

export async function handleSubscriptionCancelled(business: IBusiness): Promise<void> {
  try {
    const template = getEmailTemplate('subscription-cancelled', {});

    await sendEmail({
      to: business.email,
      ...template,
    });

    // Update business record
    await mongoose.model('Business').findByIdAndUpdate(business._id, {
      visible: false,
      subscription_status: 'cancelled',
    });
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

export async function handlePaymentFailed(business: IBusiness): Promise<void> {
  try {
    const template = getEmailTemplate('payment-failed', {});

    await sendEmail({
      to: business.email,
      ...template,
    });

    // Update business record
    await mongoose.model('Business').findByIdAndUpdate(business._id, {
      subscription_status: 'past_due',
    });
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

export async function handleSubscriptionRenewed(business: IBusiness, subscriptionId: string): Promise<void> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const template = getEmailTemplate('subscription-renewed', {});

    await sendEmail({
      to: business.email,
      ...template,
    });

    // Update business record with new subscription details
    await mongoose.model('Business').findByIdAndUpdate(business._id, {
      subscription_status: 'active',
      subscription_end: new Date(subscription.current_period_end * 1000),
    });
  } catch (error) {
    console.error('Error handling subscription renewal:', error);
  }
}

export async function createBillingPortalSession(customerId: string): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/dashboard`,
    });
    return session.url;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

export async function verifySubscriptionStatus(subscriptionId: string): Promise<boolean> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.status === 'active';
  } catch (error) {
    console.error('Error verifying subscription status:', error);
    return false;
  }
} 