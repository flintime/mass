import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import User, { IUser } from '@/backend/src/models/user.model';
import dbConnect from '@/app/lib/db';
import { JWT_SECRET } from '@/lib/config';
import { validateToken } from '@/lib/csrf';
import bcrypt from 'bcryptjs';  // Add this for password comparison
import { withRateLimit } from '@/app/lib/rate-limit';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI || '';
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
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

// Find user with Mongoose and handle potential operation buffering timeouts
async function findUserWithRetry(email: string, maxRetries = 3): Promise<any> {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries} to find user with email: ${email}`);
      
      // Add a small delay between retries
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
      
      // Explicitly set a timeout for this operation
      const userPromise = User.findOne({ email });
      
      // Apply a timeout to the operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), 5000)
      );
      
      // Race the operation against the timeout
      const user = await Promise.race([userPromise, timeoutPromise]);
      console.log('User lookup completed successfully');
      return user;
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      lastError = error;
      
      // If we hit an operation buffering timeout, clear the connection and try again
      if (error.message.includes('buffering timed out') || error.message === 'Operation timed out') {
        console.log('Buffering timeout detected, reconnecting to database...');
        await dbConnect(); // Force a reconnection
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Failed to find user after multiple attempts');
}

// Define login handler
async function loginHandler(request: Request) {
  try {
    // Check for CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      return NextResponse.json(
        { error: 'Your session appears to be invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Get cookies from the request and convert to the right format
    const cookieHeader = request.headers.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      return NextResponse.json(
        { error: 'Your session has expired or is invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }
    
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
    
    // Validate and sanitize email
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate password
    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password format' },
        { status: 400 }
      );
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    
    console.log('Login attempt for email:', sanitizedEmail);

    // DIRECT DB APPROACH: Use MongoDB driver directly to avoid Mongoose timeouts
    let user = null;
    let client = null;
    
    try {
      console.log('Attempting direct MongoDB connection...');
      client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 10000
      });
      
      await client.connect();
      console.log('Direct MongoDB connection successful');
      
      // Determine which database to use (extract from connection string or use default)
      let dbName = 'admin'; // Default fallback
      try {
        const uri = new URL(MONGODB_URI.replace('mongodb://', 'http://').replace('mongodb+srv://', 'http://'));
        const pathParts = uri.pathname.split('/');
        if (pathParts.length > 1 && pathParts[1]) {
          dbName = pathParts[1];
        }
      } catch (e) {
        console.log('Could not parse database name from URI, using default "admin"');
      }
      
      console.log(`Using database: ${dbName}`);
      const db = client.db(dbName);
      
      // Try to find user directly with MongoDB driver
      console.log('Looking up user with MongoDB driver...');
      user = await db.collection('users').findOne({ email: sanitizedEmail });
      console.log('User lookup completed:', user ? 'Found' : 'Not found');
    } catch (dbError: any) {
      console.error('Direct MongoDB access error:', dbError.message);
      return NextResponse.json(
        { error: 'Database operation failed. Please try again later.' },
        { status: 503 }
      );
    } finally {
      if (client) {
        await client.close();
        console.log('MongoDB client closed');
      }
    }

    if (!user) {
      console.log('User not found');
      return NextResponse.json(
        { error: 'The email or password you entered is incorrect. Please check your credentials and try again.' },
        { status: 401 }
      );
    }

    // Check password with bcrypt directly
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('Invalid password');
      return NextResponse.json(
        { error: 'The email or password you entered is incorrect. Please check your credentials and try again.' },
        { status: 401 }
      );
    }

    // Get user ID as string
    const userId = user._id.toString();
    console.log('User ID for token:', userId);
    
    // Sign token with string userId
    const token = sign(
      { 
        userId,
        email: user.email,
        name: user.name,
        type: 'user'
      }, 
      JWT_SECRET,
      { 
        expiresIn: '30d',
        algorithm: 'HS256'
      }
    );
    console.log('Generated token:', token.substring(0, 20) + '...');

    // Create response with user data
    const response = NextResponse.json({
      authToken: token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        created_at: user.created_at || Date.now()
      }
    });

    // Set cookie with token
    response.cookies.set({
      name: 'authToken',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    console.log('Login successful for user:', userId);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the login handler
export const POST = withRateLimit(loginHandler, 'AUTH_LOGIN'); 