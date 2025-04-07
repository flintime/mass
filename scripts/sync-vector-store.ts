/**
 * Sync Business Data to Local Vector Store
 * 
 * This script will synchronize all business data from MongoDB to the local vector store.
 * It can be run directly or triggered via the admin API.
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import dbConnect from '../app/lib/db';
import mongoose from 'mongoose';
import { initVectorStore, getEmbedding, localVectorStore } from '../app/lib/local-vector-store';

// Load environment variables from both .env and .env.local
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

// Define log file path
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'vector-store-sync.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Configure logging
const timestamp = new Date().toISOString();
const logEntry = `\n[${timestamp}] Starting vector store sync...\n`;
fs.appendFileSync(LOG_FILE, logEntry);

// Redirect console output to both terminal and log file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logLine);
  originalConsoleLog(message);
};

console.error = function(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ERROR: ${message}\n`;
  fs.appendFileSync(LOG_FILE, logLine);
  originalConsoleError(message);
};

interface Business {
  _id: mongoose.Types.ObjectId;
  business_name: string;
  description?: string;
  Business_Category?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  services?: Array<any>;
  [key: string]: any;
}

interface AIFeed {
  businessId: mongoose.Types.ObjectId;
  services: Array<any>;
  promotions: Array<any>;
  faqs: Array<any>;
  paymentMethods: Array<any>;
  customResponses: Array<any>;
  businessHours?: any;
  lastUpdated: Date;
  [key: string]: any;
}

/**
 * Synchronize a specific business with the vector store
 */
async function syncBusinessToVectorStore(businessId: string): Promise<number> {
  console.log(`[VectorStore] Starting sync for business ${businessId}`);
  
  try {
    // Delete existing vectors for this business
    try {
      console.log(`[VectorStore] Deleting existing vectors for business ${businessId}`);
      
      const deleteCount = await localVectorStore.deleteMany({ businessId });
      console.log(`[VectorStore] Deleted ${deleteCount} existing vectors for business ${businessId}`);
    } catch (error: any) {
      console.log(`[VectorStore] Error deleting vectors: ${error.message}`);
    }
    
    // Get business data from MongoDB
    const Business = mongoose.model('Business');
    const business = await Business.findById(businessId).lean() as Business;
    
    if (!business) {
      console.error(`[VectorStore] Business with ID ${businessId} not found`);
      throw new Error(`Business with ID ${businessId} not found`);
    }
    
    console.log(`[VectorStore] Found business: ${business.business_name}`);
    
    // Create vectors for the business data
    const vectors = [];
    
    // Basic business info
    vectors.push({
      id: `rag-${businessId}-basic_info-${Date.now()}`,
      values: await getEmbedding(`Business Name: ${business.business_name}
Description: ${business.description || 'Not provided'}
Category: ${business.Business_Category || 'Not specified'}`),
      metadata: {
        businessId,
        type: 'basic_info',
        source: 'business_profile',
        content: `Business Name: ${business.business_name}\nDescription: ${business.description || 'Not provided'}\nCategory: ${business.Business_Category || 'Not specified'}`
      }
    });
    
    // Contact info
    if (business.address || business.phone || business.email) {
      vectors.push({
        id: `rag-${businessId}-contact_info-${Date.now()}`,
        values: await getEmbedding(`Address: ${business.address || 'Not provided'}
Phone: ${business.phone || 'Not provided'}
Email: ${business.email || 'Not provided'}
Website: ${business.website || 'Not provided'}`),
        metadata: {
          businessId,
          type: 'contact_info',
          source: 'business_profile',
          content: `Address: ${business.address || 'Not provided'}\nPhone: ${business.phone || 'Not provided'}\nEmail: ${business.email || 'Not provided'}\nWebsite: ${business.website || 'Not provided'}`
        }
      });
    }
    
    // Services
    if (business.services && business.services.length > 0) {
      console.log(`[VectorStore] Processing ${business.services.length} services`);
      
      for (const service of business.services) {
        const serviceId = service._id?.toString() || service.id?.toString();
        const serviceText = `Service: ${service.name}
Description: ${service.description || 'Not provided'}
Price: $${service.price || '0'}
Duration: ${service.duration || '0'} minutes`;

        vectors.push({
          id: `rag-${businessId}-service-${serviceId}`,
          values: await getEmbedding(serviceText),
          metadata: {
            businessId,
            type: 'service',
            source: 'services',
            serviceId,
            content: serviceText
          }
        });
      }
    }
    
    // Check for AI feed data
    try {
      const AIFeed = mongoose.model('AIFeed');
      const feedData = await AIFeed.findOne({ businessId }).lean() as AIFeed;
      
      if (feedData) {
        console.log(`[VectorStore] Found AI feed data for business ${businessId}`);
        
        // Process FAQs
        if (feedData.faqs && feedData.faqs.length > 0) {
          console.log(`[VectorStore] Processing ${feedData.faqs.length} FAQs`);
          
          for (const faq of feedData.faqs) {
            const faqId = faq._id?.toString() || '';
            const faqText = `Question: ${faq.question}
Answer: ${faq.answer}`;

            vectors.push({
              id: `rag-${businessId}-faq-${faqId}`,
              values: await getEmbedding(faqText),
              metadata: {
                businessId,
                type: 'faq',
                source: 'faqs',
                faqId,
                content: faqText
              }
            });
          }
        }
        
        // Process promotions
        if (feedData.promotions && feedData.promotions.length > 0) {
          console.log(`[VectorStore] Processing ${feedData.promotions.length} promotions`);
          
          for (const promo of feedData.promotions) {
            const promoId = promo._id?.toString() || '';
            const promoText = `Promotion: ${promo.name}
Description: ${promo.description}
Discount: ${promo.discountValue}${promo.discountType === 'percentage' ? '%' : ' dollars'}
Valid until: ${promo.validUntil}
First-time customers only: ${promo.isFirstTimeOnly ? 'Yes' : 'No'}`;

            vectors.push({
              id: `rag-${businessId}-promotion-${promoId}`,
              values: await getEmbedding(promoText),
              metadata: {
                businessId,
                type: 'promotion',
                source: 'feed_ai',
                promoId,
                content: promoText
              }
            });
          }
        }
        
        // Process custom responses
        if (feedData.customResponses && feedData.customResponses.length > 0) {
          console.log(`[VectorStore] Processing ${feedData.customResponses.length} custom responses`);
          
          for (const response of feedData.customResponses) {
            const responseId = response._id?.toString() || '';
            const responseText = `Trigger: ${response.trigger}
Response: ${response.response}`;

            vectors.push({
              id: `rag-${businessId}-custom_response-${responseId}`,
              values: await getEmbedding(responseText),
              metadata: {
                businessId,
                type: 'custom_response',
                source: 'feed_ai',
                responseId,
                content: responseText
              }
            });
          }
        }
        
        // Process business hours
        if (feedData.businessHours) {
          const hours = feedData.businessHours;
          let hoursText = 'Business Hours:';
          
          for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
            if (hours[day] && hours[day].isOpen) {
              hoursText += `\n${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours[day].open} - ${hours[day].close}`;
            } else {
              hoursText += `\n${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`;
            }
          }
          
          vectors.push({
            id: `rag-${businessId}-business_hours-${Date.now()}`,
            values: await getEmbedding(hoursText),
            metadata: {
              businessId,
              type: 'business_hours',
              source: 'feed_ai',
              content: hoursText
            }
          });
        }
        
        // Process payment methods
        if (feedData.paymentMethods && feedData.paymentMethods.length > 0) {
          const paymentInfo = feedData.paymentMethods
            .filter((method: any) => method.enabled)
            .map((method: any) => `${method.type}${method.details ? `: ${method.details}` : ''}`)
            .join('\n');
          
          if (paymentInfo) {
            const paymentText = `Accepted Payment Methods:\n${paymentInfo}`;
            
            vectors.push({
              id: `rag-${businessId}-payment_methods-${Date.now()}`,
              values: await getEmbedding(paymentText),
              metadata: {
                businessId,
                type: 'payment_methods',
                source: 'feed_ai',
                content: paymentText
              }
            });
          }
        }
      }
    } catch (error: any) {
      console.log(`[VectorStore] No AI feed found or error fetching feed: ${error.message}`);
    }
    
    // Upsert vectors to the store
    console.log(`[VectorStore] Upserting ${vectors.length} vectors to the store`);
    
    if (vectors.length > 0) {
      // Process in batches of 10 to avoid overwhelming the embedding API
      const batchSize = 10;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await localVectorStore.upsert(batch);
        console.log(`[VectorStore] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
      }
    }
    
    console.log(`[VectorStore] Successfully upserted ${vectors.length} vectors for business ${businessId}`);
    return vectors.length;
  } catch (error) {
    console.error(`[VectorStore] Error in syncBusinessToVectorStore:`, error);
    throw error;
  }
}

/**
 * Synchronize all businesses with the vector store
 */
async function syncAllBusinessesToVectorStore() {
  console.log('[VectorStore] Starting sync for all businesses');
  
  try {
    // Get all business IDs
    const Business = mongoose.model('Business');
    const businesses = await Business.find({}, { _id: 1 }).lean();
    
    console.log(`[VectorStore] Found ${businesses.length} businesses to sync`);
    
    let successCount = 0;
    let failedCount = 0;
    
    // Process each business
    for (const business of businesses) {
      // Type assertion to handle unknown type
      const businessId = (business._id as mongoose.Types.ObjectId).toString();
      
      try {
        const vectorCount = await syncBusinessToVectorStore(businessId);
        console.log(`[VectorStore] Successfully synced business ${businessId} with ${vectorCount} vectors`);
        successCount++;
      } catch (error) {
        console.error(`[VectorStore] Error synchronizing business ${businessId}:`, error);
        failedCount++;
      }
      
      // Small delay between businesses to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[VectorStore] Sync complete. Results: ${successCount} successful, ${failedCount} failed out of ${businesses.length} total`);
    
    return {
      total: businesses.length,
      success: successCount,
      failed: failedCount
    };
  } catch (error) {
    console.error('[VectorStore] Error in syncAllBusinessesToVectorStore:', error);
    throw error;
  }
}

/**
 * Main function to run the sync
 */
async function runSync() {
  try {
    // Print environment check
    console.log('Environment check:');
    console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await dbConnect();
    
    // Initialize the vector store
    console.log('Initializing vector store...');
    await initVectorStore();
    
    // Check if a specific business ID was provided
    const businessId = process.env.BUSINESS_ID;
    
    if (businessId) {
      console.log(`Syncing specific business: ${businessId}`);
      const vectorCount = await syncBusinessToVectorStore(businessId);
      console.log(`Successfully synced business ${businessId} with ${vectorCount} vectors`);
    } else {
      console.log('Syncing all businesses...');
      await syncAllBusinessesToVectorStore();
    }
    
    // Log completion
    const completeTimestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${completeTimestamp}] Vector store sync completed\n`);
    
    process.exit(0);
  } catch (error) {
    console.error(`Error during vector store sync:`, error);
    
    // Log error
    const errorTimestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${errorTimestamp}] ERROR: ${error}\n`);
    
    process.exit(1);
  }
}

// Run the sync
runSync(); 