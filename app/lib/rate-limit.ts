import { NextRequest, NextResponse } from 'next/server';
import { redis } from './redis';

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // Auth endpoints
  AUTH_LOGIN: { tokens: 5, window: 60 * 5 }, // 5 attempts per 5 minutes
  AUTH_SIGNUP: { tokens: 3, window: 60 * 15 }, // 3 attempts per 15 minutes
  AUTH_PASSWORD_CHANGE: { tokens: 3, window: 60 * 10 }, // 3 attempts per 10 minutes
  AUTH_PROFILE_UPDATE: { tokens: 10, window: 60 * 10 }, // 10 attempts per 10 minutes
  AUTH_ACCOUNT_DELETE: { tokens: 2, window: 60 * 30 }, // 2 attempts per 30 minutes
  
  // Generic API rate limit
  API: { tokens: 50, window: 60 }, // 50 requests per minute
};

type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

/**
 * Rate limiter function that uses Redis to track and limit requests
 * @param request Next.js request object
 * @param type Rate limit type from config
 * @returns NextResponse or null if rate limit not hit
 */
export async function rateLimiter(
  request: NextRequest,
  type: RateLimitType
): Promise<NextResponse | null> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  // Get client IP
  const ip = request.ip || 'unknown';
  const config = RATE_LIMIT_CONFIG[type];
  
  // Redis key for this IP and rate limit type
  const key = `rate-limit:${type}:${ip}`;
  
  try {
    // Get current count
    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;
    
    // If count exceeds limit, reject the request
    if (count >= config.tokens) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later.',
          retryAfter: await redis.ttl(key)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(await redis.ttl(key)),
            'X-RateLimit-Limit': String(config.tokens),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + await redis.ttl(key))
          }
        }
      );
    }
    
    // Increment the counter
    await redis.incr(key);
    
    // Set expiry on first request
    if (count === 0) {
      await redis.expire(key, config.window);
    }
    
    // Allow the request to proceed
    return null;
    
  } catch (error) {
    console.error('Error in rate limiter:', error);
    // If Redis fails, still allow the request to proceed
    return null;
  }
}

/**
 * Apply rate limiting to a handler
 * @param handler The handler function to wrap with rate limiting
 * @param type Rate limit type from config
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: RateLimitType
) {
  return async function rateLimit(request: NextRequest): Promise<NextResponse> {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiter(request, type);
    
    // If rate limited, return the response
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Otherwise, proceed with the handler
    return handler(request);
  };
} 