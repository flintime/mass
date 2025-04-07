/**
 * Local Vector Store RAG Implementation
 * This file provides RAG (Retrieval Augmented Generation) functions using LocalVectorStore.
 * It replaces the Pinecone-based implementation for vector search and storage.
 */

import { localVectorStore, getEmbedding } from './local-vector-store';

// Document interface for RAG chunks
export interface Document {
  id: string;
  text: string;
  source: string;
  metadata: {
    type: string;
    businessId: string;
    [key: string]: any;
  };
}

/**
 * Index business data to the local vector store
 * @param businessId Business ID to index
 */
export async function indexBusinessDataToVectorStore(businessId: string) {
  console.log(`Indexing business data for ${businessId} to local vector store`);
  try {
    // This function should already exist and handle vector store updates
    const { indexBusinessData } = require('./vector-store');
    await indexBusinessData(businessId);
    console.log(`Successfully indexed business data for ${businessId}`);
    return true;
  } catch (error) {
    console.error(`Error indexing business data for ${businessId}:`, error);
    return false;
  }
}

// For backward compatibility
export const indexBusinessDataToPinecone = indexBusinessDataToVectorStore;

/**
 * Format chunks for context
 * @param documents Array of Document objects
 * @returns Formatted context string
 */
export function formatChunksForContext(documents: Document[] | null): string {
  if (!documents || documents.length === 0) {
    return '';
  }

  return documents.map(doc => {
    let contextStr = `== ${doc.source} ==\n${doc.text}`;
    
    // Add structured metadata if available
    if (doc.metadata && Object.keys(doc.metadata).length > 0) {
      const metaEntries = Object.entries(doc.metadata)
        .filter(([key]) => key !== 'businessId' && key !== 'type')
        .map(([key, value]) => `${key}: ${value}`);
      
      if (metaEntries.length > 0) {
        contextStr += `\nAdditional Info: ${metaEntries.join(', ')}`;
      }
    }
    
    return contextStr;
  }).join('\n\n');
}

/**
 * Retrieve relevant chunks from the local vector store
 * @param businessId Business ID to search for
 * @param query Query text
 * @param limit Maximum number of results to return
 * @returns Array of Document objects
 */
export async function retrieveRelevantChunks(businessId: string, query: string, limit: number = 5): Promise<Document[]> {
  try {
    console.log(`Retrieving chunks for business ${businessId} with query: ${query}`);
    
    // First get the embedding for the query
    const queryEmbedding = await getEmbedding(query);
    
    // Get the vector store results with the correct parameters
    const results = await localVectorStore.query({
      vector: queryEmbedding,
      filter: { businessId },
      topK: limit,
      includeMetadata: true
    });
    
    if (!results || !results.matches) {
      console.log('No results found');
      return [];
    }
    
    // Map to Document format
    const documents: Document[] = results.matches.map(match => {
      // Extract metadata we need for the Document
      const { text, source, type, businessId: docBusinessId, ...otherMetadata } = match.metadata;
      
      return {
        id: match.id,
        text: text || '',
        source: source || 'unknown',
        metadata: {
          type: type || 'text',
          businessId: docBusinessId || businessId,
          ...otherMetadata
        }
      };
    });
    
    console.log(`Retrieved ${documents.length} documents from local vector store`);
    return documents;
  } catch (error) {
    console.error('Error retrieving chunks from local vector store:', error);
    return [];
  }
} 