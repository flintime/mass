import { Redis } from 'ioredis';
import { Business } from '@/app/types/business';

// Initialize Redis client
const getRedisClient = () => {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  client.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  client.on('connect', () => {
    console.log('Connected to Redis successfully');
  });

  return client;
};

const redis = getRedisClient();

// Cache keys
const CACHE_KEYS = {
  SEARCH_RESULTS: 'search:results:',
  BUSINESS_DETAILS: 'business:',
  VECTOR_EMBEDDING: 'embedding:',
  POPULAR_SEARCHES: 'popular:searches',
  CATEGORY_RESULTS: 'category:',
} as const;

// Cache durations (in seconds)
const CACHE_DURATION = {
  SEARCH_RESULTS: 3600, // 1 hour
  BUSINESS_DETAILS: 86400, // 24 hours
  VECTOR_EMBEDDING: 604800, // 1 week
  POPULAR_SEARCHES: 86400, // 24 hours
  CATEGORY_RESULTS: 3600, // 1 hour
} as const;

// Cache search results
export async function cacheSearchResults(query: string, results: Business[]) {
  try {
    const key = CACHE_KEYS.SEARCH_RESULTS + query.toLowerCase();
    await redis.setex(
      key,
      CACHE_DURATION.SEARCH_RESULTS,
      JSON.stringify(results)
    );
    return true;
  } catch (error) {
    console.error('Error caching search results:', error);
    return false;
  }
}

// Get cached search results
export async function getCachedSearchResults(query: string): Promise<Business[] | null> {
  try {
    const key = CACHE_KEYS.SEARCH_RESULTS + query.toLowerCase();
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached search results:', error);
    return null;
  }
}

// Cache business details
export async function cacheBusinessDetails(businessId: string, details: Business) {
  try {
    const key = CACHE_KEYS.BUSINESS_DETAILS + businessId;
    await redis.setex(
      key,
      CACHE_DURATION.BUSINESS_DETAILS,
      JSON.stringify(details)
    );
    return true;
  } catch (error) {
    console.error('Error caching business details:', error);
    return false;
  }
}

// Get cached business details
export async function getCachedBusinessDetails(businessId: string): Promise<Business | null> {
  try {
    const key = CACHE_KEYS.BUSINESS_DETAILS + businessId;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached business details:', error);
    return null;
  }
}

// Cache vector embeddings
export async function cacheVectorEmbedding(text: string, embedding: number[]) {
  try {
    const key = CACHE_KEYS.VECTOR_EMBEDDING + text.toLowerCase();
    await redis.setex(
      key,
      CACHE_DURATION.VECTOR_EMBEDDING,
      JSON.stringify(embedding)
    );
    return true;
  } catch (error) {
    console.error('Error caching vector embedding:', error);
    return false;
  }
}

// Get cached vector embedding
export async function getCachedVectorEmbedding(text: string): Promise<number[] | null> {
  try {
    const key = CACHE_KEYS.VECTOR_EMBEDDING + text.toLowerCase();
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached vector embedding:', error);
    return null;
  }
}

// Track popular searches
export async function trackPopularSearch(query: string) {
  try {
    await redis.zincrby(CACHE_KEYS.POPULAR_SEARCHES, 1, query.toLowerCase());
    return true;
  } catch (error) {
    console.error('Error tracking popular search:', error);
    return false;
  }
}

// Get popular searches
export async function getPopularSearches(limit: number = 10): Promise<string[]> {
  try {
    const searches = await redis.zrevrange(CACHE_KEYS.POPULAR_SEARCHES, 0, limit - 1);
    return searches;
  } catch (error) {
    console.error('Error getting popular searches:', error);
    return [];
  }
}

// Clear cache by pattern
export async function clearCache(pattern: string) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

export { redis, CACHE_KEYS, CACHE_DURATION }; 