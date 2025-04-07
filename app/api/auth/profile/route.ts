import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { JWT_SECRET } from '@/lib/config';
import { withRateLimit } from '@/app/lib/rate-limit';

// Get user profile
async function getProfileHandler(request: Request) {
  try {
    // Get token from various sources
    let token;
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If no token in header, check cookies
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('authToken='));
        if (authCookie) {
          token = authCookie.split('=')[1];
        }
      }
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = verify(token, JWT_SECRET) as { 
      userId?: string;
      email?: string;
      name?: string;
    };
    
    if (!decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Find the user in MongoDB
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(decoded.userId) 
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('GET /api/auth/profile - Raw user data from database:', {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      location: user.location,
      locationValue: user.location === '' ? 'EMPTY_STRING' : 
                   user.location === null ? 'NULL' : 
                   user.location === undefined ? 'UNDEFINED' : 
                   `STRING: ${user.location}`,
      locationTypeOf: typeof user.location,
      mobile: user.mobile,
      mobileTypeOf: typeof user.mobile
    });

    const responseData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      location: user.location,
      created_at: user.created_at || Date.now()
    };

    console.log('GET /api/auth/profile - Response data being sent:', JSON.stringify(responseData));

    // Return the user data without sensitive information
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// Update user profile
async function updateProfileHandler(request: Request) {
  try {
    console.log('Profile update request received');
    
    // Get token from various sources
    let token;
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If no token in header, check cookies
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('authToken='));
        if (authCookie) {
          token = authCookie.split('=')[1];
        }
      }
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = verify(token, JWT_SECRET) as { 
      userId?: string;
      email?: string;
      name?: string;
    };
    
    if (!decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse request body
    const updateData = await request.json();
    console.log('Update data received (raw):', JSON.stringify(updateData));
    
    // Enhanced logging to check data types and values
    console.log('Update data types:', {
      name: updateData.name ? `${typeof updateData.name}: ${updateData.name}` : 'not provided',
      mobile: updateData.mobile ? `${typeof updateData.mobile}: ${updateData.mobile}` : 'not provided',
      location: updateData.location !== undefined ? `${typeof updateData.location}: ${JSON.stringify(updateData.location)}` : 'not provided'
    });
    
    // Validate the data
    if (updateData.name && typeof updateData.name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid name format' },
        { status: 400 }
      );
    }
    
    if (updateData.mobile && typeof updateData.mobile !== 'string') {
      return NextResponse.json(
        { error: 'Invalid mobile format' },
        { status: 400 }
      );
    }
    
    if (updateData.location && typeof updateData.location !== 'string') {
      console.log('Location validation failed:', {
        type: typeof updateData.location,
        value: updateData.location
      });
      return NextResponse.json(
        { error: 'Invalid location format' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Prepare update object - only include fields that were provided
    const updateObject: { 
      name?: string; 
      mobile?: string; 
      location?: string; 
      updated_at?: Date;
    } = {};
    
    if (updateData.name) updateObject.name = updateData.name;
    if (updateData.mobile) updateObject.mobile = updateData.mobile;
    
    // Enhanced handling for location field - ensure it's included even if empty string
    // This is important since we want to allow clearing the location
    if (updateData.location !== undefined) {
      console.log('Processing location value:', JSON.stringify(updateData.location));
      // Allow location to be set to empty string - this is a valid update to clear location
      updateObject.location = typeof updateData.location === 'string' ? updateData.location : '';
    }
    
    // Add updated_at timestamp
    updateObject.updated_at = new Date();
    
    console.log('Final update object to send to MongoDB:', JSON.stringify(updateObject, null, 2));
    
    // Debug: Log current user data before update
    const currentUser = await db.collection('users').findOne({ 
      _id: new ObjectId(decoded.userId) 
    });
    
    console.log('Current user data before update:', {
      name: currentUser?.name,
      location: currentUser?.location,
      mobile: currentUser?.mobile
    });
    
    // Update the user in MongoDB
    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(decoded.userId) },
      { $set: updateObject },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      console.log('Update failed - no result returned from MongoDB');
      return NextResponse.json(
        { error: 'User not found or update failed' },
        { status: 404 }
      );
    }
    
    const updatedUser = result;
    console.log('User updated successfully, returned user:', {
      id: updatedUser._id.toString(),
      location: updatedUser.location,
      updated_at: updatedUser.updated_at
    });
    
    // Return the updated user data
    return NextResponse.json({
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      location: updatedUser.location,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to handlers
export const GET = withRateLimit(getProfileHandler, 'API');
export const PUT = withRateLimit(updateProfileHandler, 'AUTH_PROFILE_UPDATE'); 