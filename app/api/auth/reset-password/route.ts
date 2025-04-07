import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/app/lib/db';
import User from '@/app/models/user';

export async function POST(request: NextRequest) {
  try {
    // Connect to the database
    await dbConnect();
    
    // Get token and new password from request body
    const { token, newPassword } = await request.json();
    
    if (!token || !newPassword) {
      return NextResponse.json({ 
        success: false, 
        message: 'Token and new password are required' 
      }, { status: 400 });
    }
    
    // Hash the token to match what's stored in the database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
      
    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Password reset token is invalid or has expired' 
      }, { status: 400 });
    }
    
    // Update password and clear reset token fields
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Save the updated user
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now log in with your new password.' 
    });
    
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 