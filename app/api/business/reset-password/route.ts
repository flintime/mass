import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import { validateToken, generateToken, createCsrfCookie } from '@/lib/csrf';
import bcrypt from 'bcryptjs';

// Define a minimal BusinessSchema to avoid circular imports
let Business: mongoose.Model<any>;
try {
  // Try to use the existing model first
  Business = mongoose.model('Business');
} catch (e) {
  // If the model doesn't exist, create it with minimal fields needed
  const businessSchema = new mongoose.Schema({
    email: String,
    password: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
  }, { strict: false });
  
  Business = mongoose.model('Business', businessSchema);
}

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight request
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
}

export async function POST(request: NextRequest) {
  try {
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Check for CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    
    // Add CORS headers to all responses
    const addCorsHeaders = (response: NextResponse) => {
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    };
    
    // Set a new CSRF token regardless of validation outcome
    const refreshCsrfToken = () => {
      const { token, expires } = generateToken();
      return { token, expires, cookie: createCsrfCookie(token, expires) };
    };
    
    // CSRF token validation - but still allow password reset in exceptional cases
    let isValidCsrf = false;
    if (csrfToken) {
      // Try to validate the existing token
      isValidCsrf = validateToken(csrfToken, cookieHeader);
      console.log('CSRF token validation result:', isValidCsrf);
    } else {
      console.log('No CSRF token provided in request');
    }
    
    // If not valid CSRF but looks like a password reset token in URL, we might continue with caution
    const url = request.nextUrl.toString();
    const isResetPasswordUrl = url.includes('/reset-password') && url.includes('token=');
    
    if (!isValidCsrf && !isResetPasswordUrl) {
      console.log('Invalid CSRF and not a reset password URL, rejecting request');
      const response = NextResponse.json({ 
        success: false, 
        message: 'Your session appears to be invalid. Please refresh the page and try again.' 
      }, { status: 403 });
      
      // Add fresh CSRF token
      const { cookie } = refreshCsrfToken();
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    }
    
    // Connect to the database
    console.log('Connecting to database for password reset...');
    try {
      await dbConnect();
      console.log('Database connected successfully');
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      const response = NextResponse.json({ 
        success: false, 
        message: 'Database connection error. Please try again later.',
        error: dbError.message
      }, { status: 500 });
      
      // Add fresh CSRF token
      const { cookie } = refreshCsrfToken();
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    }
    
    // Parse request body
    let token, newPassword;
    try {
      const body = await request.json();
      token = body.token;
      newPassword = body.newPassword;
      console.log('Received reset password request, token length:', token?.length);
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError);
      const response = NextResponse.json({ 
        success: false, 
        message: 'Invalid request format',
        error: parseError.message
      }, { status: 400 });
      
      // Add fresh CSRF token
      const { cookie } = refreshCsrfToken();
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    }
    
    if (!token || !newPassword) {
      console.log('Missing token or new password in request');
      const response = NextResponse.json({ 
        success: false, 
        message: 'Token and new password are required' 
      }, { status: 400 });
      
      // Add fresh CSRF token
      const { cookie } = refreshCsrfToken();
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    }
    
    // Validate password length
    if (newPassword.length < 8) {
      console.log('Password too short');
      const response = NextResponse.json({ 
        success: false, 
        message: 'Password must be at least 8 characters long' 
      }, { status: 400 });
      
      // Add fresh CSRF token
      const { cookie } = refreshCsrfToken();
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    }
    
    // Hash the token to match what's stored in the database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    console.log('Looking up business with reset token...');
    
    // Find business with matching token that hasn't expired
    let business;
    try {
      business = await Business.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });
      
      console.log('Business found:', !!business);
    } catch (lookupError: any) {
      console.error('Error looking up business with reset token:', lookupError);
      const response = NextResponse.json({ 
        success: false, 
        message: 'Error looking up business',
        error: lookupError.message 
      }, { status: 500 });
      
      // Add fresh CSRF token
      const { cookie } = refreshCsrfToken();
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    }
    
    if (!business) {
      console.log('Invalid or expired reset token');
      const response = NextResponse.json({ 
        success: false, 
        message: 'Password reset token is invalid or has expired' 
      }, { status: 400 });
      
      // Add fresh CSRF token
      const { cookie } = refreshCsrfToken();
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    }
    
    try {
      // Hash the password manually to ensure it's working
      // This is to avoid potential issues with the pre-save middleware
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update business with hashed password and clear reset token fields
      business.password = hashedPassword;
      business.resetPasswordToken = undefined;
      business.resetPasswordExpires = undefined;
      
      // Save the updated business
      await business.save();
      console.log('Password reset successful');
      
      // Generate a fresh CSRF token for the response
      const { cookie } = refreshCsrfToken();
      
      const response = NextResponse.json({ 
        success: true, 
        message: 'Password has been reset successfully. You can now log in with your new password.' 
      });
      
      // Set the new CSRF token
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    } catch (saveError: any) {
      console.error('Error saving updated business:', saveError);
      const response = NextResponse.json({ 
        success: false, 
        message: 'Error updating password',
        error: saveError.message 
      }, { status: 500 });
      
      // Add fresh CSRF token
      const { cookie } = refreshCsrfToken();
      response.headers.set('Set-Cookie', cookie);
      
      return addCorsHeaders(response);
    }
  } catch (error: any) {
    console.error('Business password reset error:', error);
    
    // Generate a fresh CSRF token for the response
    const { token, expires } = generateToken();
    const csrfCookie = createCsrfCookie(token, expires);
    
    const response = NextResponse.json({ 
      success: false, 
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      csrfRefreshed: true
    }, { status: 500 });
    
    // Set new CSRF token
    response.headers.set('Set-Cookie', csrfCookie);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
} 