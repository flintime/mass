import { createEmbedding } from './embeddings';
import { redis } from './redis';
import { Business } from '@/app/types/business';
import BusinessModel from '@/models/business.model';

const OFFLINE_EMBEDDING_KEY = 'offline:embeddings:';
const COMMON_PATTERNS_KEY = 'search:common_patterns';

interface EmbeddingEntry {
  embedding: number[];
  timestamp: number;
  frequency: number;
}

/**
 * Generates and stores embeddings for common search patterns
 */
export async function generateOfflineEmbeddings() {
  console.log('Starting offline embeddings generation...');

  try {
    // Get common search patterns from Redis
    const commonPatterns = await redis.zrevrange(COMMON_PATTERNS_KEY, 0, 99);
    console.log(`Found ${commonPatterns.length} common search patterns`);

    // Generate embeddings for each pattern
    for (const pattern of commonPatterns) {
      const existingEmbedding = await redis.get(`${OFFLINE_EMBEDDING_KEY}${pattern}`);
      
      if (!existingEmbedding) {
        console.log(`Generating embedding for pattern: ${pattern}`);
        const embedding = await createEmbedding(pattern);
        
        const entry: EmbeddingEntry = {
          embedding,
          timestamp: Date.now(),
          frequency: await redis.zscore(COMMON_PATTERNS_KEY, pattern) || 1
        };

        await redis.set(
          `${OFFLINE_EMBEDDING_KEY}${pattern}`,
          JSON.stringify(entry),
          'EX',
          7 * 24 * 60 * 60 // Cache for 1 week
        );
      }
    }

    console.log('Offline embeddings generation completed');
  } catch (error) {
    console.error('Error generating offline embeddings:', error);
    throw error;
  }
}

/**
 * Finds the closest matching pattern from offline embeddings
 */
export async function findClosestOfflinePattern(query: string): Promise<string | null> {
  try {
    const queryEmbedding = await createEmbedding(query);
    let closestPattern = null;
    let highestSimilarity = -1;

    // Get all offline embedding keys
    const keys = await redis.keys(`${OFFLINE_EMBEDDING_KEY}*`);
    
    // Compare with each stored embedding
    for (const key of keys) {
      const entryStr = await redis.get(key);
      if (!entryStr) continue;

      const entry: EmbeddingEntry = JSON.parse(entryStr);
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);

      if (similarity > highestSimilarity && similarity > 0.85) { // 85% similarity threshold
        highestSimilarity = similarity;
        closestPattern = key.replace(OFFLINE_EMBEDDING_KEY, '');
      }
    }

    return closestPattern;
  } catch (error) {
    console.error('Error finding closest offline pattern:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Track search pattern for future offline embedding generation
 */
export async function trackSearchPattern(pattern: string) {
  try {
    await redis.zincrby(COMMON_PATTERNS_KEY, 1, pattern);
  } catch (error) {
    console.error('Error tracking search pattern:', error);
  }
} 