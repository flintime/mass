import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '../../../models/user';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to get user ID from token
const getUserFromToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string | number };
    return decoded.userId;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Get user ID from auth token
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getUserFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('Getting preferences for user:', userId);

    // Get user preferences
    const user = await User.findById(userId);
    console.log('Retrieved user:', user);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return both notification and AI preferences
    return NextResponse.json({
      preferences: {
        aiEnabled: user.aiEnabled ?? true,
        emailNotifications: user.notificationPreferences?.emailNotifications ?? true,
        smsNotifications: user.notificationPreferences?.smsNotifications ?? true,
        marketingEmails: user.notificationPreferences?.marketingEmails ?? false
      }
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get user preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    // Get user ID from auth token
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getUserFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get preferences from request body
    const body = await req.json();
    console.log('Received request body:', body);

    // Extract aiEnabled from the preferences object
    const aiEnabled = body?.preferences?.aiEnabled;

    console.log('Updating preferences for user:', {
      userId,
      aiEnabled
    });

    // Validate the aiEnabled value
    if (typeof aiEnabled !== 'boolean') {
      console.error('Invalid preferences data - aiEnabled must be a boolean:', aiEnabled);
      return NextResponse.json(
        { error: 'Invalid preferences data - preferences.aiEnabled must be a boolean' },
        { status: 400 }
      );
    }

    try {
      // First check if user exists
      const user = await User.findById(userId.toString());
      if (!user) {
        console.error('User not found:', userId);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Update the preference using the static method
      const updatedUser = await User.findByIdAndUpdate(
        userId.toString(),
        { $set: { aiEnabled } },
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        console.error('Failed to update user:', userId);
        return NextResponse.json(
          { error: 'Failed to update user preferences' },
          { status: 500 }
        );
      }

      console.log('Update successful:', {
        userId,
        oldValue: user.aiEnabled,
        newValue: updatedUser.aiEnabled,
        success: true
      });

      return NextResponse.json({
        preferences: {
          aiEnabled: updatedUser.aiEnabled,
          emailNotifications: updatedUser.notificationPreferences?.emailNotifications ?? true,
          smsNotifications: updatedUser.notificationPreferences?.smsNotifications ?? true,
          marketingEmails: updatedUser.notificationPreferences?.marketingEmails ?? false
        }
      });
    } catch (updateError: any) {
      console.error('Error during preference update:', {
        error: updateError,
        message: updateError.message,
        code: updateError.code,
        userId
      });

      // Handle specific MongoDB errors
      if (updateError.name === 'ValidationError') {
        return NextResponse.json(
          { error: 'Invalid preference data format' },
          { status: 400 }
        );
      }

      if (updateError.name === 'CastError') {
        return NextResponse.json(
          { error: 'Invalid user ID format' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error updating user preferences:', {
      error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
} 