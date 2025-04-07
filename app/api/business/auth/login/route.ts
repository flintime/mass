import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { JWT_SECRET } from '@/lib/config';
import { cookies } from 'next/headers';
import { validateToken } from '@/lib/csrf';
import bcrypt from 'bcryptjs';

// Simple in-memory store for rate limiting
// In production, use Redis or another distributed cache
const loginAttempts = new Map<string, { count: number, resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT_MAX_REQUESTS = 5; // Maximum requests allowed
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

// Function to get client IP address
function getClientIp(request: Request): string {
  // Try to get IP from headers that might be set by proxies
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, the first one is the client
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback if no forwarded IP found
  return '127.0.0.1'; // Local IP as fallback
}

// Check rate limit for a given key (IP address)
function checkRateLimit(key: string): { allowed: boolean, remaining: number, resetTime: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);
  
  // If no record exists or it's expired, create a new one
  if (!record || now > record.resetTime) {
    loginAttempts.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
  }
  
  // Increment the count and check if it exceeds the limit
  record.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count);
  
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  return { allowed: true, remaining, resetTime: record.resetTime };
}

// Input validation functions
function validateEmail(email: string): boolean {
  // Email regex pattern - basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && 
         email.length <= 255 && 
         emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  // Password should be a string and not too long to prevent DOS attacks
  return typeof password === 'string' && 
         password.length > 0 && 
         password.length <= 128;
}

function sanitizeInput(input: string): string {
  // Basic sanitization - remove potential XSS characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export async function POST(request: Request) {
  try {
    // Check for CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      console.log('Business login: Missing CSRF token');
      return NextResponse.json({ 
        error: 'Your session appears to be invalid. Please refresh the page and try again.' 
      }, { status: 403 });
    }

    // Get cookies from the request and validate CSRF token
    const cookieHeader = request.headers.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      console.log('Business login: Invalid CSRF token');
      return NextResponse.json({ 
        error: 'Your session has expired or is invalid. Please refresh the page and try again.' 
      }, { status: 403 });
    }
    
    // Implement rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp);
    
    // If rate limit exceeded, return 429 Too Many Requests
    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return NextResponse.json(
        { error: `For security reasons, we've temporarily limited login attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.` },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      );
    }
    
    console.log('Business login API route called');
    
    // Parse request body
    const body = await request.json();
    
    // Validate input fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { email, password } = body;
    
    // Validate email
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      );
    }
    
    // Validate password
    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password format' },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      );
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    
    console.log(`Attempting login for email: ${sanitizedEmail}`);
    
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Find business in MongoDB
    const business = await db.collection('businesses').findOne({ email: sanitizedEmail });

    if (!business) {
      console.log('Business not found');
      return NextResponse.json(
        { error: 'The email or password you entered is incorrect. Please check your business credentials and try again.' },
        { 
          status: 401,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      );
    }
    
    // Proper password verification using bcrypt
    let passwordValid = false;
    try {
      // Check if password is hashed (starts with $2a$, $2b$, etc.)
      if (business.password && typeof business.password === 'string' && business.password.startsWith('$2')) {
        // Password is hashed, use bcrypt compare
        passwordValid = await bcrypt.compare(password, business.password);
      } else if (business.password === password) {
        // Fallback for non-hashed passwords (backwards compatibility)
        console.warn('Business account using non-hashed password. Consider migrating to bcrypt hashing.');
        passwordValid = true;
        
        // Optionally, hash the password now for future logins
        // This would update the plaintext password to a hashed one
        try {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          // Update the password in the database
          await db.collection('businesses').updateOne(
            { _id: business._id },
            { $set: { password: hashedPassword } }
          );
          console.log('Updated business password to use bcrypt hashing');
        } catch (hashError) {
          console.error('Error updating password hash:', hashError);
          // Continue with login even if hash update fails
        }
      }
    } catch (bcryptError) {
      console.error('Error comparing passwords:', bcryptError);
      // Default to false on error
      passwordValid = false;
    }
    
    if (!passwordValid) {
      console.log('Invalid password');
      return NextResponse.json(
        { error: 'The email or password you entered is incorrect. Please check your business credentials and try again.' },
        { 
          status: 401,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      );
    }

    // On successful login, reset the rate limit counter
    loginAttempts.delete(clientIp);

    console.log(`Business found: ${business._id}`);
    
    // Generate JWT token
    const token = sign(
      { 
        businessId: business._id,
        email: business.email,
        name: business.business_name,
        type: 'business'
      }, 
      JWT_SECRET,
      { 
        expiresIn: '30d',
        algorithm: 'HS256'
      }
    );
    
    console.log(`JWT token generated successfully. Token length: ${token.length}`);
    
    // Create the response with business data and explicit token
    const response = NextResponse.json({
      businessAuthToken: token,
      business: {
        id: business._id,
        email: business.email,
        business_name: business.business_name,
        account_type: business.account_type || 'free',
        created_at: business.created_at || Date.now()
      }
    });
    
    // Set HTTP-only cookie for server-side authentication
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days to match token expiration
      path: '/',
    };
    
    // Also set a non-HttpOnly cookie for client-side detection
    const clientCookieOptions = {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days to match token expiration
      path: '/',
    };
    
    // Clear any existing cookies first
    cookies().delete('businessAuthToken');
    cookies().delete('businessAuthTokenClient');
    
    // Set the cookies
    cookies().set('businessAuthToken', token, cookieOptions);
    cookies().set('businessAuthTokenClient', token, clientCookieOptions);
    
    // Also set in response object for redundancy
    response.cookies.set('businessAuthToken', token, cookieOptions);
    response.cookies.set('businessAuthTokenClient', token, clientCookieOptions);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    console.log('HTTP-only cookies set for server-side auth');
    console.log('Login successful, returning token and business data');
    
    return response;
  } catch (error: any) {
    console.error('Business login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  // Handle CORS preflight request
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
} 