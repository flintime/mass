/**
 * Local Vector Store
 * This module provides an in-memory and file-based vector store to replace Pinecone
 */

import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { OpenAI } from 'openai';

// Types matching the existing Pinecone schema
export interface VectorMetadata {
  businessId: string;
  type: string;
  source: string;
  content: string;
  serviceId?: string;
  faqId?: string;
  promoId?: string;
  responseId?: string;
  [key: string]: any;
}

export interface Vector {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

export interface QueryMatch {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export interface QueryResult {
  matches: QueryMatch[];
  namespace: string;
}

// Initialize OpenAI for embeddings
let openai: OpenAI | null = null;

// Store vectors in memory for fast access
const vectorStore: Record<string, Vector[]> = {};

// Define storage directory for persistence
const STORAGE_DIR = process.env.VECTOR_STORAGE_DIR || path.join(process.cwd(), 'data', 'vector-store');

// Ensure storage directory exists
async function ensureStorageDirectory() {
  try {
    // Check if we're in DO App Platform
    const isDoAppPlatform = process.env.DO_APP_PLATFORM === 'true';
    
    // Create directory with recursive option
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    console.log(`[LocalVectorStore] Storage directory created at ${STORAGE_DIR}`);
    
    // In DO App Platform, also ensure the logs and backup directories exist
    if (isDoAppPlatform) {
      const logDir = path.join(process.cwd(), 'logs');
      const backupDir = path.join(process.cwd(), 'backups', 'vector-store');
      
      await fs.mkdir(logDir, { recursive: true });
      await fs.mkdir(backupDir, { recursive: true });
      console.log(`[LocalVectorStore] Created necessary directories for deployment`);
      
      // Create empty log files if they don't exist
      const logFiles = [
        'vector-store-sync.log',
        'vector-store-sync-error.log',
        'vector-store-sync-out.log',
        'vector-store-backup-error.log',
        'vector-store-backup-out.log'
      ];
      
      for (const logFile of logFiles) {
        const logPath = path.join(logDir, logFile);
        try {
          // Check if file exists
          await fs.access(logPath);
        } catch (error) {
          // Create empty file
          await fs.writeFile(logPath, '');
        }
      }
    }
  } catch (error) {
    console.error('[LocalVectorStore] Error creating storage directory:', error);
  }
}

// Initialize the vector store
export async function initVectorStore() {
  await ensureStorageDirectory();
  
  console.log(`[LocalVectorStore] Initializing from directory: ${STORAGE_DIR}`);
  
  // Try to load existing data
  try {
    const files = await fs.readdir(STORAGE_DIR);
    const businessIds = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    console.log(`[LocalVectorStore] Found ${businessIds.length} business vector files`);
    
    for (const businessId of businessIds) {
      try {
        const data = await fs.readFile(
          path.join(STORAGE_DIR, `${businessId}.json`), 
          'utf-8'
        );
        vectorStore[businessId] = JSON.parse(data);
        console.log(`[LocalVectorStore] Loaded ${vectorStore[businessId].length} vectors for business ${businessId}`);
      } catch (error) {
        // File doesn't exist yet, that's okay
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`[LocalVectorStore] Error loading vectors for business ${businessId}:`, error);
        }
      }
    }
    
    console.log(`[LocalVectorStore] Loaded vectors for ${Object.keys(vectorStore).length} businesses`);
    console.log(`[LocalVectorStore] Total vectors loaded: ${Object.values(vectorStore).reduce((sum, vectors) => sum + vectors.length, 0)}`);
  } catch (error) {
    console.error('[LocalVectorStore] Error initializing vector store:', error);
  }
}

// Get embedding from OpenAI
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    // Lazy initialization of OpenAI if needed
    if (!openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not found in environment variables');
      }
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('[LocalVectorStore] OpenAI initialized successfully (lazy)');
    }
    
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8191),
      encoding_format: "float"
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('[LocalVectorStore] Error generating embedding:', error);
    throw error;
  }
}

// Save vectors for a business
async function saveBusinessVectors(businessId: string) {
  try {
    if (!vectorStore[businessId]) return;
    
    await fs.writeFile(
      path.join(STORAGE_DIR, `${businessId}.json`),
      JSON.stringify(vectorStore[businessId], null, 2),
      'utf-8'
    );
    
    console.log(`[LocalVectorStore] Saved ${vectorStore[businessId].length} vectors for business ${businessId}`);
  } catch (error) {
    console.error(`[LocalVectorStore] Error saving vectors for business ${businessId}:`, error);
  }
}

// Compute cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Upsert vectors to the store
export async function upsert(vectors: Vector[]): Promise<boolean> {
  try {
    if (!vectors || vectors.length === 0) {
      console.warn('[LocalVectorStore] No vectors provided for upsert');
      return false;
    }
    
    // Group vectors by business ID
    const vectorsByBusiness: Record<string, Vector[]> = {};
    
    for (const vector of vectors) {
      const { businessId } = vector.metadata;
      
      if (!businessId) {
        // Don't log a warning, just skip this vector
        continue;
      }
      
      if (!vectorsByBusiness[businessId]) {
        vectorsByBusiness[businessId] = [];
      }
      
      vectorsByBusiness[businessId].push(vector);
    }
    
    // Process each business's vectors
    for (const [businessId, businessVectors] of Object.entries(vectorsByBusiness)) {
      // Initialize business vector array if needed
      if (!vectorStore[businessId]) {
        vectorStore[businessId] = [];
        
        // Try to load from disk if not in memory
        try {
          const data = await fs.readFile(
            path.join(STORAGE_DIR, `${businessId}.json`), 
            'utf-8'
          );
          vectorStore[businessId] = JSON.parse(data);
        } catch (error) {
          // File doesn't exist yet, that's okay
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`[LocalVectorStore] Error loading vectors for business ${businessId}:`, error);
          }
        }
      }
      
      // Remove existing vectors with the same IDs
      const existingIds = new Set(businessVectors.map(v => v.id));
      vectorStore[businessId] = vectorStore[businessId].filter(v => !existingIds.has(v.id));
      
      // Add new vectors
      vectorStore[businessId].push(...businessVectors);
      
      // Save to disk
      await saveBusinessVectors(businessId);
    }
    
    return true;
  } catch (error) {
    console.error('[LocalVectorStore] Error in upsert:', error);
    return false;
  }
}

// Delete one vector
export async function deleteOne(id: string): Promise<boolean> {
  try {
    let deleted = false;
    
    // Search through all businesses
    for (const businessId of Object.keys(vectorStore)) {
      const initialLength = vectorStore[businessId].length;
      vectorStore[businessId] = vectorStore[businessId].filter(v => v.id !== id);
      
      if (vectorStore[businessId].length !== initialLength) {
        deleted = true;
        await saveBusinessVectors(businessId);
      }
    }
    
    return deleted;
  } catch (error) {
    console.error('[LocalVectorStore] Error in deleteOne:', error);
    return false;
  }
}

// Delete many vectors with filter
export async function deleteMany(filter: Partial<VectorMetadata>): Promise<number> {
  try {
    let totalDeleted = 0;
    
    // If businessId is provided, only check that business
    if (filter.businessId) {
      if (vectorStore[filter.businessId]) {
        const initialLength = vectorStore[filter.businessId].length;
        
        vectorStore[filter.businessId] = vectorStore[filter.businessId].filter(vector => {
          // Check if vector matches all filter criteria
          for (const [key, value] of Object.entries(filter)) {
            if (vector.metadata[key] !== value) {
              return true; // Keep vector if it doesn't match filter
            }
          }
          return false; // Remove vector if it matches all filter criteria
        });
        
        totalDeleted = initialLength - vectorStore[filter.businessId].length;
        
        if (totalDeleted > 0) {
          await saveBusinessVectors(filter.businessId);
        }
      }
    } else {
      // Otherwise check all businesses
      for (const businessId of Object.keys(vectorStore)) {
        const initialLength = vectorStore[businessId].length;
        
        vectorStore[businessId] = vectorStore[businessId].filter(vector => {
          // Check if vector matches all filter criteria
          for (const [key, value] of Object.entries(filter)) {
            if (vector.metadata[key] !== value) {
              return true; // Keep vector if it doesn't match filter
            }
          }
          return false; // Remove vector if it matches all filter criteria
        });
        
        const businessDeleted = initialLength - vectorStore[businessId].length;
        totalDeleted += businessDeleted;
        
        if (businessDeleted > 0) {
          await saveBusinessVectors(businessId);
        }
      }
    }
    
    return totalDeleted;
  } catch (error) {
    console.error('[LocalVectorStore] Error in deleteMany:', error);
    return 0;
  }
}

// Query vectors
export async function query(options: {
  vector: number[];
  filter?: Partial<VectorMetadata>;
  topK: number;
  includeMetadata: boolean;
}): Promise<QueryResult> {
  try {
    const { vector, filter, topK, includeMetadata } = options;
    const matches: QueryMatch[] = [];
    
    // If businessId is provided, only query that business
    if (filter?.businessId) {
      if (vectorStore[filter.businessId]) {
        for (const storedVector of vectorStore[filter.businessId]) {
          // Check if vector matches all filter criteria
          let matchesFilter = true;
          
          if (filter) {
            for (const [key, value] of Object.entries(filter)) {
              if (storedVector.metadata[key] !== value) {
                matchesFilter = false;
                break;
              }
            }
          }
          
          if (matchesFilter) {
            const score = cosineSimilarity(vector, storedVector.values);
            
            matches.push({
              id: storedVector.id,
              score,
              metadata: includeMetadata 
                ? storedVector.metadata 
                : {
                    businessId: storedVector.metadata.businessId,
                    type: storedVector.metadata.type,
                    source: storedVector.metadata.source,
                    content: ''
                  }
            });
          }
        }
      }
    } else {
      // Query all businesses
      for (const businessVectors of Object.values(vectorStore)) {
        for (const storedVector of businessVectors) {
          // Check if vector matches all filter criteria
          let matchesFilter = true;
          
          if (filter) {
            for (const [key, value] of Object.entries(filter)) {
              if (storedVector.metadata[key] !== value) {
                matchesFilter = false;
                break;
              }
            }
          }
          
          if (matchesFilter) {
            const score = cosineSimilarity(vector, storedVector.values);
            
            matches.push({
              id: storedVector.id,
              score,
              metadata: includeMetadata 
                ? storedVector.metadata 
                : {
                    businessId: storedVector.metadata.businessId,
                    type: storedVector.metadata.type,
                    source: storedVector.metadata.source,
                    content: ''
                  }
            });
          }
        }
      }
    }
    
    // Sort by score and limit to topK
    matches.sort((a, b) => b.score - a.score);
    const limitedMatches = matches.slice(0, topK);
    
    return {
      matches: limitedMatches,
      namespace: ''
    };
  } catch (error) {
    console.error('[LocalVectorStore] Error in query:', error);
    return { matches: [], namespace: '' };
  }
}

// For stats and debugging
export async function getStats() {
  const stats = {
    businesses: Object.keys(vectorStore).length,
    totalVectors: 0,
    vectorsByBusiness: {} as Record<string, number>
  };
  
  for (const [businessId, vectors] of Object.entries(vectorStore)) {
    stats.totalVectors += vectors.length;
    stats.vectorsByBusiness[businessId] = vectors.length;
  }
  
  return stats;
}

// Create a local vector store interface that mimics Pinecone's interface
export const localVectorStore = {
  upsert,
  deleteOne,
  deleteMany,
  query,
  getStats
};

// Initialize on module load
initVectorStore(); 