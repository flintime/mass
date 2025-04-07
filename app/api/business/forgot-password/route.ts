import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose'; 
import { sendPasswordResetEmail } from '@/lib/resend';
import { validateToken } from '@/lib/csrf';

// Get the Business model directly from mongoose to avoid circular imports
let Business: mongoose.Model<any>;
try {
  // Try to use the existing model first
  Business = mongoose.model('Business');
} catch (e) {
  // If the model doesn't exist yet, define it with minimal fields needed for this route
  const businessSchema = new mongoose.Schema({
    email: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
  }, { strict: false });
  
  Business = mongoose.model('Business', businessSchema);
}

export async function POST(request: NextRequest) {
  try {
    // Check for CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      console.log('CSRF token missing from forgot-password request');
      return NextResponse.json({ 
        success: false, 
        message: 'Your session appears to be invalid. Please refresh the page and try again.' 
      }, { status: 403 });
    }

    // Get cookies from the request and validate CSRF token
    const cookieHeader = request.headers.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      console.log('Invalid CSRF token in forgot-password request');
      return NextResponse.json({ 
        success: false, 
        message: 'Your session has expired or is invalid. Please refresh the page and try again.' 
      }, { status: 403 });
    }

    // Get email from request body
    let email;
    try {
      const body = await request.json();
      email = body.email;
      console.log('Request body parsed, email:', email ? `${email.substring(0, 3)}...` : 'undefined');
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid request format',
        error: parseError.message 
      }, { status: 400 });
    }
    
    if (!email) {
      console.log('Email is required but was not provided');
      return NextResponse.json({ 
        success: false, 
        message: 'Email is required' 
      }, { status: 400 });
    }

    // Connect to the database
    console.log('Connecting to database...');
    try {
      // Use retry mechanism (added to dbConnect function)
      await dbConnect();
      console.log('Database connected successfully');
    } catch (dbError: any) {
      console.error('Database connection error after all retries:', dbError);
      // Provide more detailed error information for debugging
      const errorDetail = dbError.message || 'Unknown database error';
      const errorCode = dbError.code || 'NO_CODE';
      console.error(`DB Error detail: ${errorDetail}, Code: ${errorCode}`);
      
      // For timeouts, provide a more specific message
      if (errorDetail.includes('timed out')) {
        const errorResponse = NextResponse.json({ 
          success: false, 
          message: 'Database connection timed out. Please try again later.',
          error: 'Database connection timeout'
        }, { status: 503 }); // 503 Service Unavailable is more appropriate for temporary outages
        
        // Add CORS headers
        errorResponse.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
        errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        
        return errorResponse;
      }
      
      return NextResponse.json({ 
        success: false, 
        message: 'Unable to connect to database. Please try again later.',
        error: errorDetail
      }, { status: 500 });
    }

    // Look up the business by email with a timeout
    console.log('Looking up business by email...');
    let business;
    let findPromise;
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timed out after 15 seconds')), 15000);
      });
      
      // Create the find query promise 
      findPromise = Business.findOne({ email: email.toLowerCase() }).exec();
      
      // Race the promises - whichever resolves/rejects first wins
      business = await Promise.race([findPromise, timeoutPromise]);
      
      console.log('Business lookup result:', business ? 'Found' : 'Not found');
    } catch (lookupError: any) {
      console.error('Error looking up business:', lookupError);
      
      // Check if the error is a timeout
      if (lookupError.message.includes('timed out')) {
        const errorResponse = NextResponse.json({ 
          success: false, 
          message: 'Database query timed out. Please try again later.',
          error: 'Database query timeout'
        }, { status: 503 });
        
        // Add CORS headers
        errorResponse.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
        errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        
        return errorResponse;
      }
      
      return NextResponse.json({ 
        success: false, 
        message: 'Error looking up business',
        error: lookupError.message 
      }, { status: 500 });
    }
    
    // Generate reset token whether business exists or not (security best practice)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // If business exists, update their document with the token info
    if (business) {
      try {
        // Hash the token for storage (don't store the raw token)
        const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');
          
        // Update business with reset token and expiration
        business.resetPasswordToken = hashedToken;
        business.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour to match email template
        
        // Create a timeout promise for the save operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database save operation timed out after 15 seconds')), 15000);
        });
        
        // Execute the save operation with a timeout
        await Promise.race([business.save(), timeoutPromise]);
        
        console.log(`Reset token generated for business: ${business._id}`);
      } catch (tokenError: any) {
        console.error('Error saving reset token:', tokenError);
        
        // Check if the error is a timeout
        if (tokenError.message.includes('timed out')) {
          const errorResponse = NextResponse.json({ 
            success: false, 
            message: 'Database operation timed out. Please try again later.',
            error: 'Database operation timeout'
          }, { status: 503 });
          
          // Add CORS headers
          errorResponse.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
          errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
          errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
          errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
          
          return errorResponse;
        }
        
        return NextResponse.json({ 
          success: false, 
          message: 'Error generating reset token',
          error: tokenError.message 
        }, { status: 500 });
      }
      
      // Create the reset URL
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/business/reset-password?token=${resetToken}`;
      console.log('Reset URL generated:', resetUrl);
      
      // Send the email
      try {
        console.log('Sending password reset email...');
        const emailResult = await sendPasswordResetEmail(email, resetUrl, 'business');
        console.log('Email send result:', emailResult);
        
        if (!emailResult.success) {
          console.error('Failed to send email:', emailResult.error);
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to send reset email',
            error: emailResult.error 
          }, { status: 500 });
        }
      } catch (emailError: any) {
        console.error('Exception sending reset email:', emailError);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to send reset email',
          error: emailError.message 
        }, { status: 500 });
      }
    }
    
    // Always return success even if business doesn't exist (security best practice)
    console.log('Returning success response');
    const response = NextResponse.json({ 
      success: true, 
      message: 'If an account with that email exists, we sent password reset instructions.' 
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
    
  } catch (error: any) {
    console.error('Business password reset request error:', error);
    
    const errorResponse = NextResponse.json({ 
      success: false, 
      message: 'Failed to process password reset request',
      error: error.message || 'Unknown error'
    }, { status: 500 });
    
    // Add CORS headers
    errorResponse.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return errorResponse;
  }
}