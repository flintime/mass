/**
 * Vector Sync Service
 * 
 * This service manages real-time synchronization between MongoDB and the vector store.
 * It provides a queue system to prevent overlapping sync operations and improve performance.
 */

import { updateBusinessVectorStore } from './vector-store';
import { vectorStore } from './vector-store';
import dbConnect from './db';

// Simple in-memory queue to prevent concurrent syncs for the same business
const syncQueue: Set<string> = new Set();
// Track failed syncs to enable retry logic
const failedSyncAttempts: Map<string, number> = new Map();
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Queue a sync operation for a business
 * @param businessId The business ID to sync
 * @param immediate Whether to process immediately or defer
 * @returns Promise that resolves when sync is queued (not when completed)
 */
export async function queueVectorStoreSync(businessId: string, immediate = true): Promise<void> {
  // Normalize business ID
  const normalizedId = businessId.toString();
  
  // Check if already in queue
  if (syncQueue.has(normalizedId)) {
    console.log(`Sync for business ${normalizedId} already queued, skipping`);
    return;
  }
  
  // Add to queue
  syncQueue.add(normalizedId);
  console.log(`Queued vector store sync for business ${normalizedId}`);
  
  // Process immediately if requested
  if (immediate) {
    processSyncQueue(normalizedId);
  }
}

/**
 * Process the sync queue for a specific business ID
 * @param businessId The business ID to process
 */
async function processSyncQueue(businessId: string): Promise<void> {
  try {
    // Ensure database connection
    await dbConnect();
    
    console.log(`Processing vector store sync for business ${businessId}`);
    
    // Attempt to update vector store
    await updateBusinessVectorStore(businessId);
    
    // If successful, remove from failed attempts
    failedSyncAttempts.delete(businessId);
    
    console.log(`Vector store sync completed for business ${businessId}`);
  } catch (error) {
    // Handle failure
    const attempts = (failedSyncAttempts.get(businessId) || 0) + 1;
    failedSyncAttempts.set(businessId, attempts);
    
    console.error(`Error syncing vector store for business ${businessId} (attempt ${attempts}/${MAX_RETRY_ATTEMPTS}):`, error);
    
    // Retry if under max attempts
    if (attempts < MAX_RETRY_ATTEMPTS) {
      console.log(`Scheduling retry for business ${businessId} in ${attempts * 5} seconds`);
      setTimeout(() => {
        processSyncQueue(businessId);
      }, attempts * 5000); // Exponential backoff: 5s, 10s, 15s
    } else {
      console.error(`Max retry attempts reached for business ${businessId}, giving up`);
      // Could implement notification system here for critical failures
    }
  } finally {
    // Always remove from queue when done
    syncQueue.delete(businessId);
  }
}

/**
 * Retry failed syncs (can be called periodically)
 */
export async function retryFailedSyncs(): Promise<void> {
  console.log(`Retrying failed vector store syncs (${failedSyncAttempts.size} pending)`);
  
  for (const [businessId, attempts] of failedSyncAttempts.entries()) {
    if (attempts < MAX_RETRY_ATTEMPTS && !syncQueue.has(businessId)) {
      queueVectorStoreSync(businessId, true);
    }
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<any> {
  const vectorStoreStats = await vectorStore.getStats();
  
  return {
    queueSize: syncQueue.size,
    failedSyncs: failedSyncAttempts.size,
    queuedBusinessIds: Array.from(syncQueue),
    failedBusinessIds: Array.from(failedSyncAttempts.keys()),
    vectorStoreStats
  };
}

// Setup periodic retry of failed syncs (every 15 minutes)
if (typeof window === 'undefined') { // Only run on server
  setInterval(() => {
    retryFailedSyncs();
  }, 15 * 60 * 1000);
} 