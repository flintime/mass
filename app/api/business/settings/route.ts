import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import Business from '@/models/business.model';
import dbConnect from '@/lib/db';
import { validateToken } from '@/lib/csrf';
import { headers } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError')) {
      console.log(`Retrying operation, ${retries} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Enhance error handling with specific messages
function getErrorMessage(error: any): { message: string; status: number } {
  if (error.name === 'ValidationError') {
    return {
      message: 'Invalid data provided. Please check your input.',
      status: 400
    };
  }
  if (error.name === 'MongoNetworkError') {
    return {
      message: 'Database connection error. Please try again.',
      status: 503
    };
  }
  if (error.name === 'MongoTimeoutError') {
    return {
      message: 'Database operation timed out. Please try again.',
      status: 504
    };
  }
  if (error.message.includes('duplicate key')) {
    return {
      message: 'This data already exists.',
      status: 409
    };
  }
  return {
    message: error.message || 'Internal server error',
    status: 500
  };
}

// GET endpoint to fetch current settings/preferences
export async function GET(request: Request) {
  try {
    console.log('Starting GET request handling');
    await dbConnect();
    console.log('Database connected');

    const authHeader = request.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No token provided in auth header');
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted, verifying...');
    
    const decoded = verify(token, JWT_SECRET) as { businessId: string };
    console.log('Token verified, businessId:', decoded.businessId);

    const business = await retryOperation(async () => {
      const result = await Business.findById(decoded.businessId);
      if (!result) {
        throw new Error('Business not found');
      }
      return result;
    });

    console.log('Business found, returning preferences');
    return NextResponse.json({
      preferences: {
        emailNotifications: business.preferences?.emailNotifications ?? true,
        appointmentReminders: business.preferences?.appointmentReminders ?? true,
        marketingEmails: business.preferences?.marketingEmails ?? false,
        chatNotifications: business.preferences?.chatNotifications ?? true,
        soundEnabled: business.preferences?.soundEnabled ?? true
      }
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    console.error('Error stack:', error.stack);
    
    const { message, status } = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// PUT endpoint to update settings (password or preferences)
export async function PUT(request: Request) {
  try {
    console.log('Starting PUT request handling');
    
    // CSRF Validation
    const headersList = headers();
    const csrfToken = headersList.get('x-csrf-token');
    if (!csrfToken) {
      console.error('Missing CSRF token');
      return NextResponse.json(
        { error: 'Your session appears to be invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Get cookies from the request and validate CSRF token
    const cookieHeader = headersList.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      console.error('Invalid CSRF token');
      return NextResponse.json(
        { error: 'Your session has expired or is invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    console.log('Database connected');

    const authHeader = request.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No token provided in auth header');
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted, verifying...');
    
    const decoded = verify(token, JWT_SECRET) as { businessId: string };
    console.log('Token verified, businessId:', decoded.businessId);

    const business = await retryOperation(async () => {
      const result = await Business.findById(decoded.businessId);
      if (!result) {
        throw new Error('Business not found');
      }
      return result;
    });

    const body = await request.json();
    console.log('Request body parsed:', JSON.stringify(body, null, 2));
    
    // Handle password update with retry logic
    if (body.currentPassword && body.newPassword) {
      console.log('Processing password update');
      const isMatch = await business.comparePassword(body.currentPassword);
      console.log('Password comparison result:', isMatch);
      
      if (!isMatch) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      business.password = body.newPassword;
      await retryOperation(async () => {
        await business.save();
      });
      console.log('Password updated successfully');

      return NextResponse.json({
        message: 'Password updated successfully'
      });
    }
    
    // Handle preferences update with retry logic
    if (body.preferences) {
      console.log('Processing preferences update:', body.preferences);
      business.preferences = {
        emailNotifications: body.preferences.emailNotifications ?? business.preferences?.emailNotifications ?? true,
        appointmentReminders: body.preferences.appointmentReminders ?? business.preferences?.appointmentReminders ?? true,
        marketingEmails: body.preferences.marketingEmails ?? business.preferences?.marketingEmails ?? false,
        chatNotifications: body.preferences.chatNotifications ?? business.preferences?.chatNotifications ?? true,
        soundEnabled: body.preferences.soundEnabled ?? business.preferences?.soundEnabled ?? true
      };

      await retryOperation(async () => {
        await business.save();
      });
      console.log('Preferences updated successfully');

      return NextResponse.json({
        message: 'Preferences updated successfully',
        preferences: business.preferences
      });
    }

    console.log('Invalid request body - no password or preferences update found');
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Update settings error:', error);
    console.error('Error stack:', error.stack);
    
    const { message, status } = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// DELETE endpoint to delete the business account
export async function DELETE(request: Request) {
  try {
    console.log('Starting DELETE request handling');
    
    // CSRF Validation
    const headersList = headers();
    const csrfToken = headersList.get('x-csrf-token');
    if (!csrfToken) {
      console.error('Missing CSRF token');
      return NextResponse.json(
        { error: 'Your session appears to be invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Get cookies from the request and validate CSRF token
    const cookieHeader = headersList.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      console.error('Invalid CSRF token');
      return NextResponse.json(
        { error: 'Your session has expired or is invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    console.log('Database connected');

    const authHeader = request.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No token provided in auth header');
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted, verifying...');
    
    const decoded = verify(token, JWT_SECRET) as { businessId: string };
    console.log('Token verified, businessId:', decoded.businessId);

    await retryOperation(async () => {
      const result = await Business.findByIdAndDelete(decoded.businessId);
      if (!result) {
        throw new Error('Business not found');
      }
      return result;
    });

    console.log('Business deleted successfully');
    return NextResponse.json({
      message: 'Business account deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete business error:', error);
    console.error('Error stack:', error.stack);
    
    const { message, status } = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 