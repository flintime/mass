/**
 * Local Vector Store Fallback Implementation
 * 
 * This module provides a fallback implementation of the vector store
 * that uses simple keyword matching instead of embeddings.
 * It's designed to be used when OpenAI API is not available or when
 * running in development/test environments.
 */

import fs from 'fs';
import path from 'path';

// Types
export interface VectorMetadata {
  businessId: string;
  type: string;
  source: string;
  content: string;
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

// Vector store directory
const VECTOR_STORE_DIR = path.join(process.cwd(), 'data', 'vector-store');

// In-memory cache of loaded vectors
const vectorCache: Record<string, Vector[]> = {};

// Ensure vector store directory exists
function ensureVectorStoreDir() {
  if (!fs.existsSync(VECTOR_STORE_DIR)) {
    fs.mkdirSync(VECTOR_STORE_DIR, { recursive: true });
    console.log(`[LocalVectorStoreFallback] Storage directory created at ${VECTOR_STORE_DIR}`);
  }
}

// Load vectors for a business
function loadVectorsForBusiness(businessId: string): Vector[] {
  try {
    // Check if we have cached vectors
    if (vectorCache[businessId]) {
      return vectorCache[businessId];
    }
    
    // Check if business file exists
    const businessFilePath = path.join(VECTOR_STORE_DIR, `${businessId}.json`);
    if (!fs.existsSync(businessFilePath)) {
      console.log(`[LocalVectorStoreFallback] No vector file found for business ${businessId}`);
      return [];
    }
    
    // Read the file
    const vectors = JSON.parse(fs.readFileSync(businessFilePath, 'utf8'));
    console.log(`[LocalVectorStoreFallback] Loaded ${vectors.length} vectors for business ${businessId}`);
    
    // Cache the vectors
    vectorCache[businessId] = vectors;
    
    return vectors;
  } catch (error) {
    console.error(`[LocalVectorStoreFallback] Error loading vectors for business ${businessId}:`, error);
    return [];
  }
}

// Load all vectors
function loadAllVectors(): Record<string, Vector[]> {
  try {
    ensureVectorStoreDir();
    
    // Get all JSON files in the directory
    const files = fs.readdirSync(VECTOR_STORE_DIR)
      .filter(file => file.endsWith('.json') && !file.startsWith('.'));
    
    // Load each file
    const allVectors: Record<string, Vector[]> = {};
    
    for (const file of files) {
      const businessId = file.replace('.json', '');
      const vectors = loadVectorsForBusiness(businessId);
      allVectors[businessId] = vectors;
    }
    
    console.log(`[LocalVectorStoreFallback] Loaded vectors for ${Object.keys(allVectors).length} businesses`);
    
    return allVectors;
  } catch (error) {
    console.error('[LocalVectorStoreFallback] Error loading all vectors:', error);
    return {};
  }
}

// Simple keyword-based retrieval function
export function simpleRetrieve(businessId: string, query: string, limit: number = 5): QueryMatch[] {
  try {
    // Load vectors for the business
    const vectors = loadVectorsForBusiness(businessId);
    
    if (vectors.length === 0) {
      return [];
    }
    
    // Prepare query for matching
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Score each vector based on keyword matches
    const scoredVectors = vectors.map(vector => {
      const content = vector.metadata.content.toLowerCase();
      
      // Calculate a simple score based on word matches
      let score = 0;
      for (const word of queryWords) {
        if (content.includes(word)) {
          score += 1;
        }
      }
      
      // Boost score for certain vector types based on query
      if (query.includes('hour') && vector.metadata.type === 'business_hours') {
        score += 3;
      }
      if (query.includes('service') && vector.metadata.type === 'service') {
        score += 3;
      }
      if (query.includes('contact') && vector.metadata.type === 'contact_info') {
        score += 3;
      }
      if (query.includes('payment') && vector.metadata.type === 'payment_methods') {
        score += 3;
      }
      if (query.includes('promotion') && vector.metadata.type === 'promotion') {
        score += 3;
      }
      
      return {
        id: vector.id,
        score,
        metadata: vector.metadata
      };
    });
    
    // Sort by score (descending) and take top results
    scoredVectors.sort((a, b) => b.score - a.score);
    return scoredVectors.slice(0, limit);
  } catch (error) {
    console.error('[LocalVectorStoreFallback] Error in simple retrieval:', error);
    return [];
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
    const { filter, topK, includeMetadata } = options;
    
    // If no businessId is provided, return empty results
    if (!filter?.businessId) {
      console.log('[LocalVectorStoreFallback] No businessId provided in filter');
      return { matches: [], namespace: '' };
    }
    
    // Use simple keyword-based retrieval as a fallback
    // We'll use the filter.businessId as the business ID and construct a query from the filter
    const businessId = filter.businessId;
    
    // Construct a query from the filter
    let query = '';
    
    // Add type-specific queries
    if (filter.type) {
      query += filter.type + ' ';
    }
    
    // Add source-specific queries
    if (filter.source) {
      query += filter.source + ' ';
    }
    
    // Add content-specific queries if available
    if (filter.content) {
      query += filter.content;
    }
    
    // If no specific query was constructed, use a generic one
    if (!query.trim()) {
      query = 'information about business';
    }
    
    console.log(`[LocalVectorStoreFallback] Using fallback query: "${query}" for business ${businessId}`);
    
    // Get matches using simple retrieval
    const matches = simpleRetrieve(businessId, query, topK);
    
    // Filter metadata if needed
    if (!includeMetadata) {
      matches.forEach(match => {
        match.metadata = {
          businessId: match.metadata.businessId,
          type: match.metadata.type,
          source: match.metadata.source,
          content: ''
        };
      });
    }
    
    return {
      matches,
      namespace: ''
    };
  } catch (error) {
    console.error('[LocalVectorStoreFallback] Error in query:', error);
    return { matches: [], namespace: '' };
  }
}

// Upsert vectors
export async function upsert(vectors: Vector[]): Promise<boolean> {
  try {
    ensureVectorStoreDir();
    
    // Group vectors by business ID
    const vectorsByBusiness: Record<string, Vector[]> = {};
    
    for (const vector of vectors) {
      const businessId = vector.metadata.businessId;
      
      if (!vectorsByBusiness[businessId]) {
        vectorsByBusiness[businessId] = [];
      }
      
      vectorsByBusiness[businessId].push(vector);
    }
    
    // Process each business
    for (const [businessId, businessVectors] of Object.entries(vectorsByBusiness)) {
      // Load existing vectors
      const existingVectors = loadVectorsForBusiness(businessId);
      
      // Create a map of existing vectors by ID for quick lookup
      const existingVectorsMap = new Map<string, Vector>();
      existingVectors.forEach(vector => {
        existingVectorsMap.set(vector.id, vector);
      });
      
      // Update or add new vectors
      for (const vector of businessVectors) {
        existingVectorsMap.set(vector.id, vector);
      }
      
      // Convert map back to array
      const updatedVectors = Array.from(existingVectorsMap.values());
      
      // Save to file
      const businessFilePath = path.join(VECTOR_STORE_DIR, `${businessId}.json`);
      fs.writeFileSync(businessFilePath, JSON.stringify(updatedVectors, null, 2));
      
      // Update cache
      vectorCache[businessId] = updatedVectors;
      
      console.log(`[LocalVectorStoreFallback] Saved ${updatedVectors.length} vectors for business ${businessId}`);
    }
    
    return true;
  } catch (error) {
    console.error('[LocalVectorStoreFallback] Error in upsert:', error);
    return false;
  }
}

// Delete vectors by filter
export async function deleteMany(filter: Partial<VectorMetadata>): Promise<number> {
  try {
    // If no businessId is provided, return 0
    if (!filter.businessId) {
      console.log('[LocalVectorStoreFallback] No businessId provided in filter for deleteMany');
      return 0;
    }
    
    const businessId = filter.businessId;
    
    // Load existing vectors
    const existingVectors = loadVectorsForBusiness(businessId);
    
    if (existingVectors.length === 0) {
      return 0;
    }
    
    // Filter vectors to keep
    const vectorsToKeep = existingVectors.filter(vector => {
      // Check if vector matches all filter criteria
      for (const [key, value] of Object.entries(filter)) {
        if (vector.metadata[key] !== value) {
          return true; // Keep this vector (it doesn't match the filter)
        }
      }
      return false; // Delete this vector (it matches all filter criteria)
    });
    
    const deletedCount = existingVectors.length - vectorsToKeep.length;
    
    if (deletedCount > 0) {
      // Save updated vectors
      const businessFilePath = path.join(VECTOR_STORE_DIR, `${businessId}.json`);
      fs.writeFileSync(businessFilePath, JSON.stringify(vectorsToKeep, null, 2));
      
      // Update cache
      vectorCache[businessId] = vectorsToKeep;
      
      console.log(`[LocalVectorStoreFallback] Deleted ${deletedCount} vectors for business ${businessId}`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('[LocalVectorStoreFallback] Error in deleteMany:', error);
    return 0;
  }
}

// Get statistics about the vector store
export async function getStats(): Promise<any> {
  try {
    const allVectors = loadAllVectors();
    
    // Calculate statistics
    const businesses = Object.keys(allVectors).length;
    let totalVectors = 0;
    const vectorsByBusiness: Record<string, number> = {};
    
    for (const [businessId, vectors] of Object.entries(allVectors)) {
      totalVectors += vectors.length;
      vectorsByBusiness[businessId] = vectors.length;
    }
    
    return {
      businesses,
      totalVectors,
      vectorsByBusiness
    };
  } catch (error) {
    console.error('[LocalVectorStoreFallback] Error getting stats:', error);
    return { error: 'Failed to get stats' };
  }
} 