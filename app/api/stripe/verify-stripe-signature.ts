import { Stripe } from 'stripe';
import { headers } from 'next/headers';

export async function verifyStripeSignature(
  req: Request, 
  endpointSecret: string | undefined
): Promise<{ verified: boolean; event?: Stripe.Event; error?: string }> {
  try {
    const body = await req.text();
    const headersList = headers();
    const sig = headersList.get('stripe-signature');

    // If signature or secret is missing
    if (!sig || !endpointSecret) {
      console.error('Missing webhook signature or secret');
      console.log('Signature:', sig);
      console.log('Secret exists:', !!endpointSecret);
      return { 
        verified: false, 
        error: 'Missing stripe signature or webhook secret' 
      };
    }

    // Log the signature for debugging
    console.log('Stripe-Signature:', sig);
    console.log('Request body length:', body.length);
    console.log('Request body preview:', body.substring(0, 100) + '...');
    console.log('Webhook secret first chars:', endpointSecret.substring(0, 6) + '...');
    
    // Initialize Stripe with the EXACT same API version as shown in the CLI
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
    });

    try {
      // Try to construct the event
      const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
      console.log('Stripe webhook signature verified successfully for event:', event.type);
      return { verified: true, event };
    } catch (err: any) {
      console.error('Webhook signature verification failed:');
      console.error('Error message:', err.message);
      console.error('Error type:', err.type);
      
      // Log additional information for debugging
      console.error('Signature from request:', sig);
      console.error('Signature timestamp:', sig?.split(',')[0]);
      console.error('Signature value:', sig?.split(',')[1]);
      
      // Log the error details
      if (err.raw) {
        console.error('Raw error message:', err.raw.message);
      }
      
      return { 
        verified: false, 
        error: `Webhook signature verification failed: ${err.message}` 
      };
    }
  } catch (error: any) {
    console.error('Unexpected error verifying webhook signature:', error);
    return { 
      verified: false, 
      error: `Internal error: ${error.message}` 
    };
  }
} 