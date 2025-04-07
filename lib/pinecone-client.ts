/**
 * Placeholder module for Pinecone client
 * This file provides dummy functions to satisfy imports during build
 */

/**
 * Generate an embedding for text
 * @param text Text to generate embedding for
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`[PineconePlaceholder] generateEmbedding called for: ${text.substring(0, 30)}...`);
  // Return a dummy embedding (1536 dimensions, same as OpenAI embeddings)
  return new Array(1536).fill(0);
}

/**
 * Upsert document to Pinecone
 * @param id Document ID
 * @param embedding Document embedding
 * @param metadata Document metadata
 */
export async function upsertToPinecone(id: string, embedding: number[], metadata: any): Promise<void> {
  console.log(`[PineconePlaceholder] upsertToPinecone called for ID: ${id}`);
  // No-op in this placeholder
}

/**
 * Delete document from Pinecone
 * @param id Document ID
 */
export async function deleteFromPinecone(id: string): Promise<void> {
  console.log(`[PineconePlaceholder] deleteFromPinecone called for ID: ${id}`);
  // No-op in this placeholder
} 