import OpenAI from 'openai';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { localVectorStore, getEmbedding as localGetEmbedding } from './local-vector-store';
import * as localVectorStoreFallback from './local-vector-store-fallback';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables directly in this file
dotenv.config();

// Import AIFeed and Business interfaces instead of the models directly
// We'll use mongoose directly for database operations to avoid import issues
interface IBusiness {
  _id: mongoose.Types.ObjectId;
  business_name: string;
  description?: string;
  Business_Category?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface IService {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface IFAQ {
  _id?: mongoose.Types.ObjectId;
  question: string;
  answer: string;
}

interface IPromotion {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isFirstTimeOnly: boolean;
  validUntil: string;
  isActive: boolean;
}

interface IPaymentMethod {
  type: 'cash' | 'card' | 'online';
  enabled: boolean;
  details: string;
}

interface ICustomResponse {
  _id?: mongoose.Types.ObjectId;
  trigger: string;
  response: string;
  isActive: boolean;
}

interface IBusinessHours {
  monday?: { open: string; close: string; isOpen: boolean };
  tuesday?: { open: string; close: string; isOpen: boolean };
  wednesday?: { open: string; close: string; isOpen: boolean };
  thursday?: { open: string; close: string; isOpen: boolean };
  friday?: { open: string; close: string; isOpen: boolean };
  saturday?: { open: string; close: string; isOpen: boolean };
  sunday?: { open: string; close: string; isOpen: boolean };
}

interface IAIFeed {
  businessId: mongoose.Types.ObjectId;
  services: IService[];
  promotions: IPromotion[];
  faqs: IFAQ[];
  paymentMethods: IPaymentMethod[];
  customResponses: ICustomResponse[];
  businessHours?: IBusinessHours;
  lastUpdated: Date;
}

// Create a document type that doesn't depend on LangChain
export interface Document {
  pageContent: string;
  metadata: {
    businessId: string;
    type: string;
    source: string;
    serviceId?: string;
    faqId?: string;
    promoId?: string;
    responseId?: string;
    embedding?: number[];
    [key: string]: any;
  };
  embedding?: number[];
}

// Initialize OpenAI client with more robust environment handling
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 
          // If env variable is missing, throw a more helpful error
          (() => { 
            console.error("ERROR: OPENAI_API_KEY is missing from environment variables.");
            console.error("Please ensure you have an OPENAI_API_KEY=sk-... entry in your .env file.");
            console.error("You can run 'npm run rag:setup' to configure it.");
            throw new Error("OPENAI_API_KEY missing");
          })()
});

// Create a cache for embeddings
const embeddingCache = new Map<string, number[]>();

// Create a cache for documents
const documentCache = new Map<string, Document[]>();

// Create unique ID for a chunk
const createChunkId = (businessId: string, section: string, index: number) => {
  return `${businessId}-${section}-${index}`;
};

// Ensure database connection
async function ensureDbConnection() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB for vector operations');
  }
  
  if (!mongoose.connection.db) {
    throw new Error('Database connection established but db property is undefined');
  }
  
  return mongoose.connection.db;
}

// Parse business data into chunks for embedding
export const parseBusinessDataToChunks = async (businessId: string) => {
  try {
    // Ensure database connection
    const db = await ensureDbConnection();
    
    // Fetch business data
    const aiFeedData = await db
      .collection('aifeeds')
      .findOne({ businessId: new mongoose.Types.ObjectId(businessId) }) as IAIFeed | null;
    
    const businessData = await db
      .collection('businesses')
      .findOne({ _id: new mongoose.Types.ObjectId(businessId) }) as IBusiness | null;
    
    if (!aiFeedData || !businessData) {
      console.error(`No data found for business ${businessId}`);
      return [];
    }
    
    const chunks: Document[] = [];
    
    // Add basic business info
    chunks.push({
      pageContent: `Business Name: ${businessData.business_name}\nDescription: ${businessData.description || 'Not provided'}\nCategory: ${businessData.Business_Category || 'Not specified'}`,
      metadata: { 
        businessId, 
        type: 'basic_info',
        source: 'business_profile'
      }
    });
    
    // Add location and contact
    if (businessData.address || businessData.phone || businessData.email) {
      chunks.push({
        pageContent: `Address: ${businessData.address || 'Not provided'}\nPhone: ${businessData.phone || 'Not provided'}\nEmail: ${businessData.email || 'Not provided'}\nWebsite: ${businessData.website || 'Not provided'}`,
        metadata: { 
          businessId, 
          type: 'contact_info',
          source: 'business_profile'
        }
      });
    }
    
    // Add services (one chunk per service for more granular retrieval)
    if (aiFeedData.services && aiFeedData.services.length > 0) {
      aiFeedData.services.forEach((service: IService, index: number) => {
        chunks.push({
          pageContent: `Service: ${service.name}\nDescription: ${service.description}\nPrice: $${service.price}\nDuration: ${service.duration} minutes`,
          metadata: { 
            businessId, 
            type: 'service',
            serviceId: service._id?.toString() || index.toString(),
            source: 'feed_ai'
          }
        });
      });
    }
    
    // Add FAQs (one chunk per FAQ)
    if (aiFeedData.faqs && aiFeedData.faqs.length > 0) {
      aiFeedData.faqs.forEach((faq: IFAQ, index: number) => {
        chunks.push({
          pageContent: `Question: ${faq.question}\nAnswer: ${faq.answer}`,
          metadata: { 
            businessId, 
            type: 'faq',
            faqId: faq._id?.toString() || index.toString(),
            source: 'feed_ai'
          }
        });
      });
    }
    
    // Add promotions
    if (aiFeedData.promotions && aiFeedData.promotions.length > 0) {
      aiFeedData.promotions.forEach((promo: IPromotion, index: number) => {
        chunks.push({
          pageContent: `Promotion: ${promo.name}\nDescription: ${promo.description}\nDiscount: ${promo.discountValue}${promo.discountType === 'percentage' ? '%' : ' dollars'}\nValid until: ${promo.validUntil}\nFirst-time customers only: ${promo.isFirstTimeOnly ? 'Yes' : 'No'}`,
          metadata: { 
            businessId, 
            type: 'promotion',
            promoId: promo._id?.toString() || index.toString(),
            source: 'feed_ai'
          }
        });
      });
    }
    
    // Add business hours
    if (aiFeedData.businessHours) {
      const formattedHours = formatBusinessHours(aiFeedData.businessHours);
      chunks.push({
        pageContent: `Business Hours:\n${formattedHours}`,
        metadata: { 
          businessId, 
          type: 'business_hours',
          source: 'feed_ai'
        }
      });
    }
    
    // Add payment methods
    if (aiFeedData.paymentMethods && aiFeedData.paymentMethods.length > 0) {
      const paymentInfo = aiFeedData.paymentMethods
        .filter((method: IPaymentMethod) => method.enabled)
        .map((method: IPaymentMethod) => `${method.type}${method.details ? `: ${method.details}` : ''}`)
        .join('\n');
      
      chunks.push({
        pageContent: `Accepted Payment Methods:\n${paymentInfo}`,
        metadata: { 
          businessId, 
          type: 'payment_methods',
          source: 'feed_ai'
        }
      });
    }
    
    // Add custom responses (one chunk per custom response)
    if (aiFeedData.customResponses && aiFeedData.customResponses.length > 0) {
      aiFeedData.customResponses.forEach((response: ICustomResponse, index: number) => {
        chunks.push({
          pageContent: `Trigger: ${response.trigger}\nResponse: ${response.response}`,
          metadata: { 
            businessId, 
            type: 'custom_response',
            responseId: response._id?.toString() || index.toString(),
            source: 'feed_ai'
          }
        });
      });
    }
    
    // Store in cache
    documentCache.set(businessId, chunks);
    
    return chunks;
  } catch (error) {
    console.error('Error parsing business data to chunks:', error);
    return [];
  }
};

// Helper function to format business hours
function formatBusinessHours(hours: IBusinessHours): string {
  if (!hours) return 'Not provided';
  
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let formattedHours = '';
  
  daysOfWeek.forEach(day => {
    const typedDay = day as keyof IBusinessHours;
    if (hours[typedDay]) {
      const dayHours = hours[typedDay];
      if (dayHours && dayHours.isOpen) {
        formattedHours += `${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours.open} - ${dayHours.close}\n`;
      } else {
        formattedHours += `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed\n`;
      }
    }
  });
  
  return formattedHours || 'Not provided';
}

// Get embedding for text with fallback
export const getEmbedding = async (text: string): Promise<number[]> => {
  try {
    // Use the local embedding function
    return await localGetEmbedding(text);
  } catch (error) {
    console.error('Error getting embedding, using fallback zero vector:', error);
    // Return a zero vector as fallback
    return new Array(1536).fill(0);
  }
};

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be of the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

// Get or create document chunks for a business
async function getBusinessDocuments(businessId: string): Promise<Document[]> {
  // Check if we have cached documents
  if (documentCache.has(businessId)) {
    return documentCache.get(businessId)!;
  }
  
  // Parse business data to chunks
  const chunks = await parseBusinessDataToChunks(businessId);
  
  // Store in cache
  documentCache.set(businessId, chunks);
  
  return chunks;
}

// Retrieve relevant chunks based on a query
export const retrieveRelevantChunks = async (
  businessId: string, 
  query: string,
  limit: number = 5
): Promise<Document[]> => {
  try {
    console.log(`Retrieving chunks for business ${businessId} and query: "${query}"`);
    
    // Get document chunks for the business
    const documents = await getBusinessDocuments(businessId);
    
    if (documents.length === 0) {
      console.log('No documents found for business');
      return [];
    }
    
    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query);
    
    // Calculate similarity for each document
    const scoredDocuments = await Promise.all(
      documents.map(async (doc) => {
        // Get document embedding if not already cached
        if (!doc.embedding) {
          doc.embedding = await getEmbedding(doc.pageContent);
        }
        
        // Calculate similarity
        const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
        
        return { document: doc, score: similarity };
      })
    );
    
    // Sort by similarity score (descending)
    scoredDocuments.sort((a, b) => b.score - a.score);
    
    // Return top documents
    return scoredDocuments.slice(0, limit).map(item => item.document);
  } catch (error) {
    console.error(`Error retrieving chunks for business ${businessId}:`, error);
    return [];
  }
};

// Format retrieved chunks into context for OpenAI
export const formatChunksForContext = (chunks: Document[]): string => {
  if (chunks.length === 0) return '';
  
  // Group chunks by type for better organization
  const chunksByType: Record<string, Document[]> = {};
  
  chunks.forEach(chunk => {
    const type = chunk.metadata.type as string;
    if (!chunksByType[type]) {
      chunksByType[type] = [];
    }
    chunksByType[type].push(chunk);
  });
  
  // Format each section
  let formattedContext = '';
  
  // Add business info first if available
  if (chunksByType['basic_info']) {
    formattedContext += `## BUSINESS INFORMATION\n${chunksByType['basic_info'][0].pageContent}\n\n`;
  }
  
  // Add contact info
  if (chunksByType['contact_info']) {
    formattedContext += `## CONTACT INFORMATION\n${chunksByType['contact_info'][0].pageContent}\n\n`;
  }
  
  // Add services
  if (chunksByType['service']) {
    formattedContext += `## SERVICES\n${chunksByType['service'].map(doc => doc.pageContent).join('\n\n')}\n\n`;
  }
  
  // Add business hours
  if (chunksByType['business_hours']) {
    formattedContext += `## BUSINESS HOURS\n${chunksByType['business_hours'][0].pageContent}\n\n`;
  }
  
  // Add promotions
  if (chunksByType['promotion']) {
    formattedContext += `## PROMOTIONS\n${chunksByType['promotion'].map(doc => doc.pageContent).join('\n\n')}\n\n`;
  }
  
  // Add FAQs
  if (chunksByType['faq']) {
    formattedContext += `## FREQUENTLY ASKED QUESTIONS\n${chunksByType['faq'].map(doc => doc.pageContent).join('\n\n')}\n\n`;
  }
  
  // Add payment methods
  if (chunksByType['payment_methods']) {
    formattedContext += `## PAYMENT METHODS\n${chunksByType['payment_methods'][0].pageContent}\n\n`;
  }
  
  // Add any custom responses last (these are usually more specific)
  if (chunksByType['custom_response']) {
    formattedContext += `## CUSTOM RESPONSES\n${chunksByType['custom_response'].map(doc => doc.pageContent).join('\n\n')}\n\n`;
  }
  
  return formattedContext.trim();
};

// Function to update vector store when business data changes
export const updateBusinessVectorStore = async (businessId: string): Promise<void> => {
  try {
    // Clear from cache to force regeneration
    documentCache.delete(businessId);
    
    // Regenerate
    await getBusinessDocuments(businessId);
    
    console.log(`Updated vector store for business ${businessId}`);
  } catch (error) {
    console.error(`Error updating vector store for business ${businessId}:`, error);
    throw error;
  }
};

// Add indexBusinessData function as an alias for updateBusinessVectorStore
export const indexBusinessData = async (businessId: string): Promise<void> => {
  return updateBusinessVectorStore(businessId);
};

// Initialize vector stores for all businesses
export const initializeAllBusinessVectorStores = async (): Promise<void> => {
  try {
    // Ensure database connection
    const db = await ensureDbConnection();
    
    // Get all business IDs
    const businessIds = await db
      .collection('businesses')
      .find({}, { projection: { _id: 1 } })
      .toArray();
    
    console.log(`Found ${businessIds.length} businesses to initialize vector stores for`);
    
    // Initialize vector stores in batches to avoid memory issues
    const BATCH_SIZE = 10;
    for (let i = 0; i < businessIds.length; i += BATCH_SIZE) {
      const batch = businessIds.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(businessIds.length/BATCH_SIZE)}`);
      
      // Process each business in the batch
      await Promise.all(
        batch.map(async (business) => {
          const businessId = business._id.toString();
          try {
            const chunks = await getBusinessDocuments(businessId);
            console.log(`Initialized vector store for business ${businessId} with ${chunks.length} chunks`);
          } catch (error) {
            console.error(`Error initializing vector store for business ${businessId}:`, error);
          }
        })
      );
      
      // Small delay between batches to avoid overwhelming the system
      if (i + BATCH_SIZE < businessIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('All business vector stores initialized');
  } catch (error) {
    console.error('Error initializing all business vector stores:', error);
    throw error;
  }
};

/**
 * Vector Store Adapter
 * 
 * Provides a unified interface for vector operations,
 * using either Pinecone or our local vector store implementation
 */

// Determine if we should use Pinecone based on environment variables
// We force this to false to ensure we always use local vector store
const usePinecone = false; // process.env.USE_PINECONE_RAG === 'true';

// Flag to track if we should use fallback implementation
// Start with fallback disabled
let useFallbackImplementation = false;

// Export vector store operations
export const vectorStore = {
  /**
   * Store a document in the vector store
   * 
   * @param document The document to store
   * @param embedding The embedding for the document
   * @returns Whether the operation was successful
   */
  async storeDocument(document: any, embedding: number[]): Promise<boolean> {
    try {
      // Create a unique ID for the document
      const id = `rag-${document.metadata.businessId}-${document.metadata.type}-${
        document.metadata.serviceId || 
        document.metadata.faqId || 
        document.metadata.promoId || 
        document.metadata.responseId || 
        Date.now()
      }`;
      
      // Create the vector record
      const vectorRecord = {
        id,
        values: embedding,
        metadata: {
          ...document.metadata,
          content: document.pageContent, // Store content in metadata
        }
      };
      
      // Use local vector store
      return await localVectorStore.upsert([vectorRecord]);
    } catch (error) {
      console.error('[VectorStore] Error storing document:', error);
      return false;
    }
  },

  /**
   * Retrieve relevant documents based on a query
   * 
   * @param businessId The business ID to search in
   * @param queryText The query text
   * @param limit Maximum number of results to return
   * @returns Array of document objects
   */
  async retrieveRelevant(businessId: string, queryText: string, limit: number = 5): Promise<any[]> {
    try {
      console.log(`[VectorStore] Retrieving documents for business ${businessId} with query: "${queryText}"`);
      
      // Try to get embedding for query
      let queryEmbedding: number[];
      let useKeywordFallback = useFallbackImplementation;
      
      try {
        queryEmbedding = await localGetEmbedding(queryText);
      } catch (error) {
        console.error('[VectorStore] Error getting embedding, using keyword fallback for this query:', error);
        useKeywordFallback = true;
        queryEmbedding = new Array(1536).fill(0); // Dummy embedding
      }
      
      let results;
      
      if (useKeywordFallback) {
        // Use keyword-based fallback
        console.log('[VectorStore] Using keyword-based fallback retrieval');
        
        // Use the actual query text for the fallback
        const matches = localVectorStoreFallback.simpleRetrieve(businessId, queryText, limit);
        
        results = {
          matches,
          namespace: ''
        };
        
        // Do not set the fallback flag permanently, only use for this query
        console.log('[VectorStore] Using fallback implementation for this query only');
      } else {
        // Query the local store using embeddings
        results = await localVectorStore.query({
          vector: queryEmbedding,
          filter: { businessId },
          topK: limit,
          includeMetadata: true
        });
      }
      
      if (!results.matches || results.matches.length === 0) {
        console.log(`[VectorStore] No matches found for business ${businessId} with query "${queryText}"`);
        return [];
      }
      
      // Convert to documents format
      return results.matches.map(match => ({
        pageContent: match.metadata.content || '',
        metadata: {
          ...match.metadata,
          score: match.score
        }
      }));
    } catch (error) {
      console.error('[VectorStore] Error retrieving documents:', error);
      return [];
    }
  },

  /**
   * Delete all data for a business from the vector store
   * 
   * @param businessId The business ID to delete data for
   * @returns Whether the operation was successful
   */
  async deleteBusinessData(businessId: string): Promise<boolean> {
    try {
      console.log(`[VectorStore] Deleting data for business ${businessId}`);
      
      // Delete all vectors for this business
      const deletedCount = await localVectorStore.deleteMany({ businessId });
      
      console.log(`[VectorStore] Deleted ${deletedCount} vectors for business ${businessId}`);
      
      return true;
    } catch (error) {
      console.error('[VectorStore] Error deleting data for business:', error);
      return false;
    }
  },
};