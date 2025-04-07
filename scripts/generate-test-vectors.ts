/**
 * Generate Test Vectors
 * 
 * This script generates test vector data for a specific business ID
 * without requiring MongoDB connection.
 */

import 'dotenv/config';
import { localVectorStore, getEmbedding, Vector } from '../app/lib/local-vector-store';

// Get the business ID from environment variable or use the default
const businessId = process.env.BUSINESS_ID || '67c550f9946155c8a1630886';

async function generateTestVectors() {
  try {
    console.log(`Generating test vectors for business: ${businessId}`);
    
    // Create sample vectors for this business
    const vectors: Vector[] = [
      {
        id: `rag-${businessId}-basic_info-1`,
        values: await getEmbedding('Skill Pro Services is a professional services business offering various skill-based services.'),
        metadata: {
          businessId,
          type: 'basic_info',
          source: 'business_profile',
          content: 'Business Name: Skill Pro Services\nDescription: A professional services business offering various skill-based services.\nCategory: Professional Services'
        }
      },
      {
        id: `rag-${businessId}-contact_info-1`,
        values: await getEmbedding('Contact Skill Pro Services at contact@skillpro.com or 555-1234. Located at 123 Main St.'),
        metadata: {
          businessId,
          type: 'contact_info',
          source: 'business_profile',
          content: 'Address: 123 Main St\nPhone: 555-1234\nEmail: contact@skillpro.com\nWebsite: https://skillpro.com'
        }
      },
      {
        id: `rag-${businessId}-service-1`,
        values: await getEmbedding('Website Development service - professional website creation for businesses.'),
        metadata: {
          businessId,
          type: 'service',
          serviceId: 'service-1',
          source: 'services',
          content: 'Service: Website Development\nDescription: Professional website creation for businesses.\nPrice: $1000\nDuration: 240 minutes'
        }
      },
      {
        id: `rag-${businessId}-service-2`,
        values: await getEmbedding('Mobile App Development service - custom mobile applications for iOS and Android.'),
        metadata: {
          businessId,
          type: 'service',
          serviceId: 'service-2',
          source: 'services',
          content: 'Service: Mobile App Development\nDescription: Custom mobile applications for iOS and Android.\nPrice: $2500\nDuration: 480 minutes'
        }
      },
      {
        id: `rag-${businessId}-service-3`,
        values: await getEmbedding('SEO Optimization service - improve your website visibility in search engines.'),
        metadata: {
          businessId,
          type: 'service',
          serviceId: 'service-3',
          source: 'services',
          content: 'Service: SEO Optimization\nDescription: Improve your website visibility in search engines.\nPrice: $500\nDuration: 120 minutes'
        }
      },
      {
        id: `rag-${businessId}-faq-1`,
        values: await getEmbedding('What are your business hours? We are open Monday to Friday from 9 AM to 5 PM.'),
        metadata: {
          businessId,
          type: 'faq',
          faqId: 'faq-1',
          source: 'faqs',
          content: 'Question: What are your business hours?\nAnswer: We are open Monday to Friday from 9 AM to 5 PM.'
        }
      },
      {
        id: `rag-${businessId}-faq-2`,
        values: await getEmbedding('Do you offer support after project completion? Yes, we provide 30 days of free support.'),
        metadata: {
          businessId,
          type: 'faq',
          faqId: 'faq-2',
          source: 'faqs',
          content: 'Question: Do you offer support after project completion?\nAnswer: Yes, we provide 30 days of free support after project completion.'
        }
      },
      {
        id: `rag-${businessId}-business_hours-1`,
        values: await getEmbedding('Business Hours: Monday to Friday 9 AM - 5 PM, Closed on weekends'),
        metadata: {
          businessId,
          type: 'business_hours',
          source: 'feed_ai',
          content: 'Business Hours:\nMonday: 9 AM - 5 PM\nTuesday: 9 AM - 5 PM\nWednesday: 9 AM - 5 PM\nThursday: 9 AM - 5 PM\nFriday: 9 AM - 5 PM\nSaturday: Closed\nSunday: Closed'
        }
      },
      {
        id: `rag-${businessId}-payment_methods-1`,
        values: await getEmbedding('We accept credit cards, PayPal, and bank transfers.'),
        metadata: {
          businessId,
          type: 'payment_methods',
          source: 'feed_ai',
          content: 'Accepted Payment Methods:\nCredit Card: Visa, Mastercard, American Express\nPayPal\nBank Transfer'
        }
      },
      {
        id: `rag-${businessId}-promotion-1`,
        values: await getEmbedding('New Client Special: 15% off your first service.'),
        metadata: {
          businessId,
          type: 'promotion',
          promoId: 'promo-1',
          source: 'feed_ai',
          content: 'Promotion: New Client Special\nDescription: 15% off your first service.\nDiscount: 15%\nValid until: 2025-12-31\nFirst-time customers only: Yes'
        }
      }
    ];
    
    // Store vectors
    console.log(`Storing ${vectors.length} test vectors...`);
    const upsertResult = await localVectorStore.upsert(vectors);
    console.log(`Upsert result: ${upsertResult ? 'Success' : 'Failed'}`);
    
    // Get stats
    const stats = await localVectorStore.getStats();
    console.log('\nVector store stats after adding test data:');
    console.log(JSON.stringify(stats, null, 2));
    
    console.log(`\nSuccessfully created test vectors for business ${businessId}`);
  } catch (error) {
    console.error('Error generating test vectors:', error);
    process.exit(1);
  }
}

// Run the generator
generateTestVectors(); 