import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Stripe } from 'stripe';
import dbConnect from '@/lib/db';
import { Business } from '@/models/Business';

// Configure Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // @ts-ignore - We need to use the version specified in .env
  apiVersion: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
});

// This is an internal webhook endpoint that processes verified webhook events
export async function POST(req: Request) {
  const headersList = headers();
  const internalSecret = headersList.get('x-internal-secret');
  const webhookVerified = headersList.get('x-webhook-verified');

  // Security checks
  if (internalSecret !== process.env.INTERNAL_WEBHOOK_SECRET) {
    console.error('Invalid internal secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (webhookVerified !== 'true') {
    console.error('Webhook not verified');
    return NextResponse.json({ error: 'Webhook not verified' }, { status: 403 });
  }

  try {
    // Parse the event data
    const event = await req.json();

    console.log(`Processing webhook: ${event.type}`);

    // Connect to the database
    await dbConnect();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'billing_portal.session.created':
        // Just log and acknowledge this event type
        console.log('Billing portal session created:', {
          id: event.data.object.id,
          customer: event.data.object.customer,
          created: new Date(event.data.object.created * 1000).toISOString()
        });
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}

// Handle completed checkout sessions
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed');
  console.log('Session details:', JSON.stringify({
    id: session.id,
    customer: session.customer,
    subscription: session.subscription,
    metadata: session.metadata,
    status: session.status,
    payment_status: session.payment_status
  }, null, 2));
  
  try {
    // Get the business ID from the metadata
    const businessId = session.metadata?.businessId;
    
    if (!businessId) {
      console.error('No businessId found in session metadata');
      return;
    }
    
    console.log(`Updating business with ID: ${businessId}`);
    
    // Get subscription details
    const subscriptionId = session.subscription as string;
    console.log(`Subscription ID from session: ${subscriptionId}`);
    
    let subscription;
    
    if (subscriptionId) {
      try {
        console.log(`Retrieving subscription with ID: ${subscriptionId}`);
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('Retrieved subscription successfully');
      } catch (error: any) {
        console.error(`Error retrieving subscription: ${error.message}`);
        console.log('Continuing with fallback subscription data');
      }
    } else {
      console.log('No subscription ID found in session, using fallback data');
    }
    
    // Prepare the subscription data
    const subscriptionData = {
      status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      current_period_end: subscription ? subscription.current_period_end : Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
      canceled_at: null
    };
    
    console.log('Subscription data to set:', JSON.stringify(subscriptionData, null, 2));
    
    // Update the business record with the new subscription format
    console.log(`Executing findByIdAndUpdate for business: ${businessId}`);
    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      {
        $set: {
          subscription: subscriptionData,
          // Set is_active to true when subscription is active
          is_active: true,
          // Keep the old fields for backward compatibility
          subscription_status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          subscription_start_date: subscription ? new Date(subscription.current_period_start * 1000) : new Date(),
          subscription_end_date: subscription ? new Date(subscription.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!updatedBusiness) {
      console.error(`Business with ID ${businessId} not found`);
      
      // Try with string conversion if the ID might be an ObjectId
      console.log('Attempting string conversion of business ID');
      const updatedBusinessWithString = await Business.findByIdAndUpdate(
        String(businessId),
        {
          $set: {
            subscription: subscriptionData,
            is_active: true,
            subscription_status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            subscription_start_date: subscription ? new Date(subscription.current_period_start * 1000) : new Date(),
            subscription_end_date: subscription ? new Date(subscription.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            updatedAt: new Date()
          }
        },
        { new: true }
      );
      
      if (updatedBusinessWithString) {
        console.log(`Successfully updated business with string ID: ${updatedBusinessWithString.business_name}`);
      } else {
        console.error(`Still could not find business with ID ${businessId}`);
        
        // List a few businesses to debug
        console.log('Listing a few businesses to debug:');
        const someBusiness = await Business.find().limit(3);
        console.log(`Found ${someBusiness.length} businesses`);
        someBusiness.forEach(b => console.log(`Business ID: ${b._id}, Name: ${b.business_name}`));
      }
      
      return;
    }
    
    console.log(`Successfully updated business subscription for: ${updatedBusiness.business_name}`);
    console.log(`Updated subscription ID: ${subscriptionId}, customer ID: ${session.customer as string}`);
    
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

// Handle successful invoice payments (for recurring subscriptions)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_succeeded');
  
  try {
    // Get the subscription ID from the invoice
    const subscriptionId = invoice.subscription as string;
    
    if (!subscriptionId) {
      console.error('No subscription ID found in invoice');
      return;
    }
    
    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer as string;
    
    // Find the business by subscription ID
    let business = await Business.findOne({ 'subscription.stripe_subscription_id': subscriptionId });
    
    if (!business) {
      // Try the old field
      const businessOldField = await Business.findOne({ stripe_subscription_id: subscriptionId });
      if (businessOldField) {
        business = businessOldField;
      } else {
        // Try to find by customer ID if subscription ID not found (fallback for race condition)
        console.log(`Subscription ID not found, trying customer ID: ${customerId}`);
        const businessByCustomer = await Business.findOne({ 
          $or: [
            { 'subscription.stripe_customer_id': customerId },
            { stripe_customer_id: customerId }
          ]
        });
        
        if (businessByCustomer) {
          business = businessByCustomer;
          console.log(`Found business by customer ID: ${business.business_name}`);
        } else {
          console.error(`No business found with subscription ID: ${subscriptionId} or customer ID: ${customerId}`);
          return;
        }
      }
    }
    
    // Prepare the subscription data
    const subscriptionData = {
      status: 'active',
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscriptionId,
      current_period_end: subscription.current_period_end,
      canceled_at: subscription.canceled_at
    };
    
    // Update the subscription dates
    await Business.findByIdAndUpdate(
      business._id,
      {
        $set: {
          subscription: subscriptionData,
          // Keep the old fields for backward compatibility
          subscription_status: 'active',
          subscription_start_date: new Date(subscription.current_period_start * 1000),
          subscription_end_date: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Successfully updated recurring subscription for business: ${business.business_name}`);
    
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

// Handle failed invoice payments
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed');
  
  try {
    // Get the subscription ID from the invoice
    const subscriptionId = invoice.subscription as string;
    
    if (!subscriptionId) {
      console.error('No subscription ID found in failed invoice');
      return;
    }
    
    // Find the business by subscription ID
    let business = await Business.findOne({ 'subscription.stripe_subscription_id': subscriptionId });
    
    if (!business) {
      // Try the old field
      const businessOldField = await Business.findOne({ stripe_subscription_id: subscriptionId });
      if (!businessOldField) {
        console.error(`No business found with subscription ID: ${subscriptionId}`);
        return;
      }
      business = businessOldField;
    }
    
    // Update the subscription status to past_due and set is_active based on retry count
    const retryCount = invoice.attempt_count || 0;
    
    // Only set is_active to false after multiple failed attempts (typically 3)
    // This gives the customer a grace period to update payment method
    const shouldDeactivate = retryCount >= 3;
    
    await Business.findByIdAndUpdate(
      business._id,
      {
        $set: {
          'subscription.status': 'past_due',
          // Only set is_active to false after multiple retry attempts
          ...(shouldDeactivate ? { is_active: false } : {}),
          subscription_status: 'past_due',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Updated business subscription to past_due: ${business.business_name}${shouldDeactivate ? ' (deactivated)' : ' (still active)'}`);
    
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.updated');
  
  try {
    const customerId = subscription.customer as string;
    
    // Find the business by subscription ID
    let business = await Business.findOne({ 'subscription.stripe_subscription_id': subscription.id });
    
    if (!business) {
      // Try the old field
      const businessOldField = await Business.findOne({ stripe_subscription_id: subscription.id });
      if (businessOldField) {
        business = businessOldField;
      } else {
        // Try to find by customer ID if subscription ID not found (fallback for race condition)
        console.log(`Subscription ID not found, trying customer ID: ${customerId}`);
        const businessByCustomer = await Business.findOne({ 
          $or: [
            { 'subscription.stripe_customer_id': customerId },
            { stripe_customer_id: customerId }
          ]
        });
        
        if (businessByCustomer) {
          business = businessByCustomer;
          console.log(`Found business by customer ID: ${business.business_name}`);
        } else {
          console.error(`No business found with subscription ID: ${subscription.id} or customer ID: ${customerId}`);
          return;
        }
      }
    }
    
    // Determine the subscription status
    let status: 'active' | 'past_due' | 'canceled' | 'trialing' = 'active';
    
    if (subscription.status === 'active') {
      status = 'active';
    } else if (subscription.status === 'past_due') {
      status = 'past_due';
    } else if (subscription.status === 'canceled') {
      status = 'canceled';
    } else if (subscription.status === 'trialing') {
      status = 'trialing';
    }
    
    // Determine if the business should be active
    // Only active and trialing subscriptions should set is_active to true
    const isActive = ['active', 'trialing'].includes(status);
    
    // Prepare the subscription data
    const subscriptionData = {
      status,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      current_period_end: subscription.current_period_end,
      canceled_at: subscription.canceled_at
    };
    
    // Update the business subscription data
    await Business.findByIdAndUpdate(
      business._id,
      {
        $set: {
          subscription: subscriptionData,
          // Set is_active based on subscription status
          is_active: isActive,
          // Keep the old fields for backward compatibility
          subscription_status: status,
          subscription_start_date: new Date(subscription.current_period_start * 1000),
          subscription_end_date: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Updated subscription for business: ${business.business_name}, status: ${status} (${isActive ? 'active' : 'inactive'})`);
    
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

// Handle subscription deletions/cancellations
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.deleted');
  
  try {
    const customerId = subscription.customer as string;
    
    // Find the business by subscription ID
    let business = await Business.findOne({ 'subscription.stripe_subscription_id': subscription.id });
    
    if (!business) {
      // Try the old field
      const businessOldField = await Business.findOne({ stripe_subscription_id: subscription.id });
      if (businessOldField) {
        business = businessOldField;
      } else {
        // Try to find by customer ID if subscription ID not found (fallback for race condition)
        console.log(`Subscription ID not found, trying customer ID: ${customerId}`);
        const businessByCustomer = await Business.findOne({ 
          $or: [
            { 'subscription.stripe_customer_id': customerId },
            { stripe_customer_id: customerId }
          ]
        });
        
        if (businessByCustomer) {
          business = businessByCustomer;
          console.log(`Found business by customer ID: ${business.business_name}`);
        } else {
          console.error(`No business found with subscription ID: ${subscription.id} or customer ID: ${customerId}`);
          return;
        }
      }
    }
    
    // Update the subscription status to canceled and set is_active to false
    await Business.findByIdAndUpdate(
      business._id,
      {
        $set: {
          'subscription.status': 'canceled',
          'subscription.canceled_at': Math.floor(Date.now() / 1000),
          // When subscription is canceled, set is_active to false
          is_active: false,
          subscription_status: 'canceled',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Marked subscription as canceled for business: ${business.business_name} (deactivated)`);
    
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
} 