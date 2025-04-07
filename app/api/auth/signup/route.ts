import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import User from '@/backend/src/models/user.model';
import dbConnect from '@/app/lib/db';
import { withRateLimit } from '@/app/lib/rate-limit';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
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
  // Password should be a string, at least 8 characters, and not too long to prevent DOS attacks
  return typeof password === 'string' && 
         password.length >= 8 && 
         password.length <= 128;
}

function validateName(name: string): boolean {
  // Name should be a string and have reasonable length
  return typeof name === 'string' && 
         name.length >= 2 &&
         name.length <= 100;
}

function validateMobile(mobile: string): boolean {
  // Basic mobile number validation - accepts various formats
  // This is a simple validation, consider using a more robust solution for production
  return typeof mobile === 'string' && 
         mobile.length >= 10 &&
         mobile.length <= 15 &&
         /^[+]?[\d\s()-]{10,20}$/.test(mobile);
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

// Helper function to find existing user with retry mechanism
async function findExistingUserWithRetry(email: string, maxRetries = 3): Promise<any> {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries} to find existing user with email: ${email}`);
      
      // Add a small delay between retries
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
      
      // Explicitly set a timeout for this operation
      const userPromise = User.findOne({ email });
      
      // Apply a timeout to the operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Find operation timed out')), 5000)
      );
      
      // Race the operation against the timeout
      const user = await Promise.race([userPromise, timeoutPromise]);
      console.log('Existing user lookup completed successfully');
      return user;
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} to find user failed:`, error.message);
      lastError = error;
      
      // If we hit an operation buffering timeout, clear the connection and try again
      if (error.message.includes('buffering timed out') || error.message.includes('Operation timed out')) {
        console.log('Buffering timeout detected, reconnecting to database...');
        await dbConnect(); // Force a reconnection
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Failed to check for existing user after multiple attempts');
}

// Helper function to save new user with retry mechanism
async function saveUserWithRetry(user: any, maxRetries = 3): Promise<any> {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries} to save new user`);
      
      // Add a small delay between retries
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
      
      // Explicitly set a timeout for this operation
      const savePromise = user.save();
      
      // Apply a timeout to the operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timed out')), 8000)
      );
      
      // Race the operation against the timeout
      const savedUser = await Promise.race([savePromise, timeoutPromise]);
      console.log('User saved successfully');
      return savedUser;
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} to save user failed:`, error.message);
      lastError = error;
      
      // If we hit an operation buffering timeout, clear the connection and try again
      if (error.message.includes('buffering timed out') || error.message.includes('Operation timed out')) {
        console.log('Buffering timeout detected during save, reconnecting to database...');
        await dbConnect(); // Force a reconnection
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Failed to save new user after multiple attempts');
}

// Define signup handler
async function signupHandler(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { name, email, password, mobile, agreeToTerms, acknowledgeAI } = body;
    
    // Validate required fields
    const validationErrors = [];
    
    if (!name || !validateName(name)) {
      validationErrors.push('Invalid name format. Name must be between 2-100 characters.');
    }
    
    if (!email || !validateEmail(email)) {
      validationErrors.push('Invalid email format.');
    }
    
    if (!password || !validatePassword(password)) {
      validationErrors.push('Invalid password format. Password must be at least 8 characters.');
    }
    
    if (mobile && !validateMobile(mobile)) {
      validationErrors.push('Invalid mobile number format.');
    }
    
    if (!agreeToTerms) {
      validationErrors.push('You must agree to the Terms and Conditions.');
    }
    
    if (!acknowledgeAI) {
      validationErrors.push('You must acknowledge the AI services.');
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { errors: validationErrors },
        { status: 400 }
      );
    }
    
    // Sanitize inputs
    const sanitizedName = sanitizeInput(name.trim());
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    const sanitizedMobile = mobile ? sanitizeInput(mobile.trim()) : '';
    
    console.log('Received signup request for:', { sanitizedName, sanitizedEmail });

    // DIRECT DB APPROACH: Use MongoDB driver directly
    let client = null;
    let userId = null;
    
    try {
      console.log('Attempting direct MongoDB connection for signup...');
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
      
      // First check if user already exists
      console.log('Checking if user already exists...');
      const existingUser = await db.collection('users').findOne({ email: sanitizedEmail });
      
      if (existingUser) {
        console.log('User already exists with email:', sanitizedEmail);
        return NextResponse.json(
          { error: 'An account with this email already exists. Please use a different email or try signing in instead.' },
          { status: 400 }
        );
      }
      
      // Hash password manually since we're not using the Mongoose model
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Track consent
      const now = new Date();
      const consentRecords = {
        termsAndConditions: {
          accepted: !!agreeToTerms,
          timestamp: now
        },
        aiAcknowledgment: {
          accepted: !!acknowledgeAI,
          timestamp: now
        }
      };
      
      // Create user document
      const newUser = {
        _id: new ObjectId(),
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
        mobile: sanitizedMobile,
        consentRecords,
        created_at: new Date()
      };
      
      // Insert user directly
      console.log('Inserting new user...');
      const result = await db.collection('users').insertOne(newUser);
      console.log('User inserted successfully:', result.acknowledged);
      
      userId = newUser._id.toString();
      
    } catch (dbError: any) {
      console.error('Direct MongoDB operation error:', dbError.message);
      return NextResponse.json(
        { error: 'An unexpected error occurred during signup. Please try again.' },
        { status: 500 }
      );
    } finally {
      if (client) {
        await client.close();
        console.log('MongoDB client closed');
      }
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to create user account. Please try again.' },
        { status: 500 }
      );
    }
    
    console.log('New user created successfully with consent records');

    // Generate JWT token
    const token = sign(
      { 
        userId,
        email: sanitizedEmail,
        name: sanitizedName,
        type: 'user'
      }, 
      JWT_SECRET,
      { 
        expiresIn: '30d',
        algorithm: 'HS256'
      }
    );
    console.log('Token generated for new user');

    // Create response with user data and token
    const response = NextResponse.json({
      authToken: token,
      user: {
        id: userId,
        name: sanitizedName,
        email: sanitizedEmail,
        mobile: sanitizedMobile || '',
        created_at: new Date().toISOString()
      }
    }, { status: 201 });  // 201 Created status
    
    // Set HttpOnly cookie with the token
    response.cookies.set({
      name: 'authToken',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',  // Only send over HTTPS in production
      sameSite: 'lax',  // Changed from 'strict' to 'lax' for better cross-site functionality
      path: '/',
      maxAge: 60 * 60 * 24 * 30,  // 30 days in seconds
    });
    
    return response;
    
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during signup. Please try again.' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the signup handler
export const POST = withRateLimit(signupHandler, 'AUTH_SIGNUP'); 