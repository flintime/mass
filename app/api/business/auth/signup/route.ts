import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import Business from '@/backend/src/models/business.model';
import mongoose from 'mongoose';
import dbConnect from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Simple in-memory store for rate limiting
// In production, use Redis or another distributed cache
const signupAttempts = new Map<string, { count: number, resetTime: number }>();

// Rate limit configuration - stricter for business registration
const RATE_LIMIT_MAX_REQUESTS = 3; // Maximum signup requests allowed
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

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
  const record = signupAttempts.get(key);
  
  // If no record exists or it's expired, create a new one
  if (!record || now > record.resetTime) {
    signupAttempts.set(key, {
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
  // Password should be a string, at least 8 characters, and not too long to prevent DOS attacks
  return typeof password === 'string' && 
         password.length >= 8 && 
         password.length <= 128;
}

function validateUniqueId(uniqueId: string): boolean {
  // Unique ID should match the pattern
  return typeof uniqueId === 'string' && 
         /^[a-z0-9_.]{3,30}$/.test(uniqueId.toLowerCase());
}

function validatePhone(phone: string | number): boolean {
  if (typeof phone === 'number') {
    return phone > 1000000000; // At least 10 digits
  }
  // If string, must contain only digits
  return typeof phone === 'string' && 
         phone.length >= 10 &&
         /^\+?[\d\s()-]{10,20}$/.test(phone);
}

function sanitizeInput(input: string): string {
  if (!input) return '';
  // Basic sanitization - remove potential XSS characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  address_components: AddressComponent[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    location_type: string;
  };
}

interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
  error_message?: string;
}

async function geocodeAddress(address: string, city: string, state: string, zip_code: string) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is missing');
    throw new Error('Google Maps API key is required for geocoding');
  }

  const fullAddress = `${address}, ${city}, ${state} ${zip_code}, USA`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  console.log('Geocoding address:', fullAddress);
  console.log('API Key present:', !!GOOGLE_MAPS_API_KEY);
  
  try {
    const response = await fetch(url);
    const data: GeocodeResponse = await response.json();
    
    console.log('Raw geocoding response:', data);
    
    if (data.status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied:', data.error_message);
      throw new Error('Geocoding request denied. Please check API key configuration.');
    }
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', {
        status: data.status,
        error: data.error_message,
        results: data.results?.length || 0
      });
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'No results found'}`);
    }

    // Get the first (most relevant) result
    const result = data.results[0];
    
    // Extract coordinates
    const { lat, lng } = result.geometry.location;
    
    // Log success
    console.log('Successfully geocoded address:', {
      formattedAddress: result.formatted_address,
      coordinates: { latitude: lat, longitude: lng },
      accuracy: result.geometry.location_type
    });

    return { 
      latitude: lat, 
      longitude: lng,
      formattedAddress: result.formatted_address
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // Implement rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp);
    
    // If rate limit exceeded, return 429 Too Many Requests
    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return NextResponse.json(
        { error: `For security reasons, we've temporarily limited business registration attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''} or contact our business support team if you need immediate assistance.` },
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
    
    // Connect to MongoDB first with increased timeout
    console.log('Connecting to database for business signup...');
    try {
      await dbConnect();
      console.log('Successfully connected to database for business signup');
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: `Database connection failed: ${dbError.message}` },
        { 
          status: 500,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      );
    }
    
    let businessData;
    try {
      businessData = await request.json();
      console.log('Raw business data received:', {
        ...businessData,
        password: businessData.password ? '[REDACTED]' : '[MISSING]'
      });
    } catch (parseError: any) {
      console.error('Error parsing request JSON:', parseError);
      return NextResponse.json(
        { error: `Invalid JSON data: ${parseError.message}` },
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
    
    // Validate required fields
    const requiredFields = [
      'business_name',
      'unique_id',
      'email',
      'password',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'description',
      'Business_Category',
      'latitude',
      'longitude'
    ];

    const missingFields = requiredFields.filter(field => !businessData[field]);
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
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

    // Perform deeper validation on critical fields
    const validationErrors = [];
    
    // Validate unique_id format
    if (!validateUniqueId(businessData.unique_id)) {
      validationErrors.push('Unique ID must be 3-30 characters and can contain only letters, numbers, dots, and underscores');
    }
    
    // Validate email format
    if (!validateEmail(businessData.email)) {
      validationErrors.push('Invalid email format');
    }
    
    // Validate password strength
    if (!validatePassword(businessData.password)) {
      validationErrors.push('Password must be at least 8 characters long');
    }
    
    // Validate phone
    if (!validatePhone(businessData.phone)) {
      validationErrors.push('Invalid phone number format');
    }
    
    // Validate coordinates
    if (typeof businessData.latitude !== 'number' || typeof businessData.longitude !== 'number' ||
        isNaN(businessData.latitude) || isNaN(businessData.longitude)) {
      validationErrors.push('Invalid coordinates. Please ensure the address is correct.');
    }
    
    // Return all validation errors at once
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { errors: validationErrors },
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
    
    // Sanitize inputs for XSS prevention
    businessData.business_name = sanitizeInput(businessData.business_name);
    businessData.unique_id = sanitizeInput(businessData.unique_id.toLowerCase());
    businessData.email = sanitizeInput(businessData.email.toLowerCase());
    businessData.address = sanitizeInput(businessData.address);
    businessData.city = sanitizeInput(businessData.city);
    businessData.state = sanitizeInput(businessData.state);
    businessData.description = sanitizeInput(businessData.description);
    
    // Format ZIP code as 5-digit string with leading zeros
    businessData.zip_code = businessData.zip_code.toString().padStart(5, '0');
    console.log('Formatted ZIP code:', businessData.zip_code);
    
    // Validate ZIP code format
    if (!/^\d{5}$/.test(businessData.zip_code)) {
      console.log('Invalid ZIP code format:', businessData.zip_code);
      return NextResponse.json(
        { error: 'ZIP code must be exactly 5 digits' },
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

    // Convert phone to number if it's a string
    if (typeof businessData.phone === 'string') {
      const phoneNum = parseInt(businessData.phone.replace(/\D/g, ''), 10);
      if (isNaN(phoneNum)) {
        console.log('Invalid phone number:', businessData.phone);
        return NextResponse.json(
          { error: 'Invalid phone number' },
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
      businessData.phone = phoneNum;
    }

    // Use direct MongoDB operations instead of Mongoose models
    // This bypasses any model-specific timeouts
    let db;
    try {
      if (!mongoose.connection || !mongoose.connection.db) {
        throw new Error('Database connection not established');
      }
      db = mongoose.connection.db;
    } catch (dbError: any) {
      console.error('Error accessing MongoDB connection:', dbError);
      return NextResponse.json(
        { error: `Database access failed: ${dbError.message}` },
        { status: 500 }
      );
    }
    
    // Check if the businesses collection exists
    try {
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      console.log('Available collections:', collectionNames);
      
      if (!collectionNames.includes('businesses')) {
        console.error('Error: businesses collection not found in the database');
        return NextResponse.json(
          { error: 'Database schema error. Please contact support.' },
          { status: 500 }
        );
      }
    } catch (collectionError: any) {
      console.error('Error listing collections:', collectionError);
      return NextResponse.json(
        { error: `Failed to access collections: ${collectionError.message}` },
        { status: 500 }
      );
    }
    
    // Check if business already exists with the same email - using native MongoDB driver
    console.log('Checking if email already exists:', businessData.email);
    const existingBusiness = await db.collection('businesses').findOne(
      { email: businessData.email }, 
      { maxTimeMS: 5000 } // 5 second timeout for this query
    );
    
    if (existingBusiness) {
      console.log('Business already exists with email:', businessData.email);
      return NextResponse.json(
        { error: 'An account with this email already exists. Please use a different email or try signing in instead.' },
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

    // Check if business already exists with the same unique_id - using native MongoDB driver
    console.log('Checking if unique_id already exists:', businessData.unique_id.toLowerCase());
    const existingBusinessWithId = await db.collection('businesses').findOne(
      { unique_id: businessData.unique_id.toLowerCase() },
      { maxTimeMS: 5000 } // 5 second timeout for this query
    );
    
    if (existingBusinessWithId) {
      console.log('Business already exists with unique ID:', businessData.unique_id);
      return NextResponse.json(
        { error: 'This unique ID is already taken. Please choose a different one for your business.' },
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
    
    // Hash the password 
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(businessData.password, salt);

    // Track consent
    const now = new Date();
    const consentRecords = {
      termsAndConditions: {
        accepted: !!businessData.agreeToTerms,
        timestamp: now
      },
      aiAcknowledgment: {
        accepted: !!businessData.acknowledgeAI,
        timestamp: now
      }
    };

    // Create new business with all required fields
    const businessDoc = {
      ...businessData,
      password: hashedPassword,
      unique_id: businessData.unique_id.toLowerCase(), // Ensure lowercase for consistency
      Business_Subcategories: businessData.Business_Subcategories || [],
      business_features: businessData.business_features || [],
      images: businessData.images || [],
      preferences: {
        emailNotifications: true,
        appointmentReminders: true,
        marketingEmails: false,
        autoConfirm: false,
        displayInSearch: true
      },
      consentRecords,
      // Set both location and individual lat/lng fields
      location: {
        type: 'Point',
        coordinates: [businessData.longitude, businessData.latitude] // GeoJSON format is [longitude, latitude]
      },
      // Add Stripe-related fields
      subscription_status: businessData.payment?.status === 'active' ? 'active' : 'inactive',
      subscription_start: businessData.payment?.status === 'active' ? Date.now() : null,
      subscription_end: businessData.payment?.status === 'active' ? Date.now() + (30 * 24 * 60 * 60 * 1000) : null, // 30 days from now
      stripe_subscription_id: businessData.payment?.subscription_id || null,
      stripe_customer_id: businessData.payment?.customer_id || null,
      visible: businessData.payment?.status === 'active', // Only visible if payment is active
      is_active: businessData.payment?.status === 'active', // Set is_active to match payment status
      // Add the new subscription object format
      subscription: businessData.payment?.status === 'active' ? {
        status: 'active',
        stripe_customer_id: businessData.payment.customer_id,
        stripe_subscription_id: businessData.payment.subscription_id,
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now in seconds
        canceled_at: null
      } : {
        status: 'inactive',
        stripe_customer_id: businessData.payment?.customer_id || null,
        stripe_subscription_id: businessData.payment?.subscription_id || null,
        current_period_end: null,
        canceled_at: null
      },
      created_at: new Date()
    };

    console.log('Creating business with Stripe details:', {
      subscription_status: businessDoc.subscription_status,
      subscription_start: businessDoc.subscription_start,
      subscription_end: businessDoc.subscription_end,
      stripe_subscription_id: businessDoc.stripe_subscription_id,
      stripe_customer_id: businessDoc.stripe_customer_id,
      visible: businessDoc.visible,
      is_active: businessDoc.is_active
    });

    // Insert directly using MongoDB driver with error handling
    let result;
    try {
      result = await db.collection('businesses').insertOne(businessDoc, { maxTimeMS: 20000 });
      
      if (!result.acknowledged) {
        console.error('Failed to insert business document - not acknowledged');
        return NextResponse.json(
          { error: 'Failed to create business account. The database did not acknowledge the operation.' },
          { status: 500 }
        );
      }
    } catch (insertError: any) {
      console.error('Error inserting business document:', insertError);
      // Check for duplicate key error
      if (insertError.code === 11000) {
        console.log('Duplicate key error detected:', insertError.keyPattern);
        return NextResponse.json(
          { error: 'An account with this email or business ID already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Database insert failed: ${insertError.message}` },
        { status: 500 }
      );
    }
    
    console.log('Successfully created new business with ID:', result.insertedId);

    // On successful business creation, reset rate limit
    signupAttempts.delete(clientIp);

    // Create JWT token with error handling
    let token;
    try {
      token = sign({ 
        businessId: result.insertedId.toString(),
        email: businessData.email,
        name: businessData.business_name,
        type: 'business'
      }, JWT_SECRET, { 
        expiresIn: '30d',
        algorithm: 'HS256'
      });
    } catch (tokenError: any) {
      console.error('Error creating JWT token:', tokenError);
      // Still return success since the account was created
      return NextResponse.json({ 
        success: true,
        message: 'Account created but session could not be initialized. Please log in manually.',
        tokenError: tokenError.message
      });
    }
    
    // Create response with business data and token
    const response = NextResponse.json({ 
      businessAuthToken: token, 
      business: {
        id: result.insertedId.toString(),
        business_name: businessData.business_name,
        email: businessData.email,
        unique_id: businessData.unique_id,
        created_at: Date.now()
      },
      success: true 
    });

    // Set HttpOnly cookie with token
    response.cookies.set({
      name: 'businessAuthToken',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    console.log('Signup successful for business:', result.insertedId.toString());
    console.log('Cookie set:', response.cookies.get('businessAuthToken')); // Debug cookie
    return response;
  } catch (error: any) {
    console.error('Unhandled error in business signup:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
} 