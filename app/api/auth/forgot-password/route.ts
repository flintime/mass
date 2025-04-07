import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import crypto from 'crypto';
import dbConnect from '@/app/lib/db';
import User from '@/app/models/user';
import { sendPasswordResetEmail } from '@/lib/resend';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    // Connect to the database
    await dbConnect();

    // Get email from request body
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email is required' 
      }, { status: 400 });
    }

    // Look up the user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Generate reset token whether user exists or not (security best practice)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // If user exists, update their document with the token info
    if (user) {
      // Hash the token for storage (don't store the raw token)
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
        
      // Update user with reset token and expiration
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await user.save();
      
      console.log(`Reset token generated for user: ${user._id}`);
      
      // Create the reset URL
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
      
      // Send the email
      await sendPasswordResetEmail(email, resetUrl);
    }
    
    // Always return success even if user doesn't exist (security best practice)
    return NextResponse.json({ 
      success: true, 
      message: 'If an account with that email exists, we sent password reset instructions.' 
    });
    
  } catch (error: any) {
    console.error('Password reset request error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to process password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 