import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { JWT_SECRET } from '@/lib/config';
import { withRateLimit } from '@/app/lib/rate-limit';

export async function GET(request: Request) {
  try {
    // First check auth token in Authorization header
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

    console.log('/api/auth/me - Raw user data from database:', {
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

    // Normalize location field to ensure consistent response format
    const normalizedLocation = user.location === null || user.location === undefined ? '' : user.location;

    const responseData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile || '',
      location: normalizedLocation,
      created_at: user.created_at || Date.now()
    };

    console.log('/api/auth/me - Response data being sent:', JSON.stringify(responseData));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

async function deleteAccountHandler(request: Request) {
  try {
    console.log('Account deletion request received');

    // Get token from Authorization header or cookies
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

    // Get the user ID from the token
    const userId = decoded.userId;

    // Connect to MongoDB
    const { db, client } = await connectToDatabase();
    
    // Start a session for transaction
    const session = client.startSession();
    
    try {
      // Start transaction
      session.startTransaction();
      
      // Find user first to verify existence
      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(userId) 
      }, { session });
      
      if (!user) {
        await session.abortTransaction();
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Delete all associated data in one transaction
      const deletedChatRooms = await db.collection('chatRooms').deleteMany({
        participants: userId
      }, { session });
      
      const deletedMessages = await db.collection('messages').deleteMany({
        $or: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }, { session });
      
      const deletedNotifications = await db.collection('notifications').deleteMany({
        userId: new ObjectId(userId)
      }, { session });
      
      const deletedBookings = await db.collection('bookings').deleteMany({
        userId: new ObjectId(userId)
      }, { session });
      
      // Finally delete the user
      const userDeletion = await db.collection('users').deleteOne({
        _id: new ObjectId(userId)
      }, { session });
      
      // Commit the transaction
      await session.commitTransaction();
      
      // Log deletion statistics
      console.log('Account deleted successfully:', {
        userId,
        chatRoomsDeleted: deletedChatRooms.deletedCount,
        messagesDeleted: deletedMessages.deletedCount,
        notificationsDeleted: deletedNotifications.deletedCount,
        bookingsDeleted: deletedBookings.deletedCount,
        userDeleted: userDeletion.deletedCount
      });
      
      // Return success with deletion counts
      return NextResponse.json({
        message: 'Account deleted successfully',
        statistics: {
          chatRoomsDeleted: deletedChatRooms.deletedCount,
          messagesDeleted: deletedMessages.deletedCount,
          notificationsDeleted: deletedNotifications.deletedCount,
          bookingsDeleted: deletedBookings.deletedCount
        }
      });
      
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      console.error('Transaction error during account deletion:', error);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again later.' },
        { status: 500 }
      );
    } finally {
      // End session
      await session.endSession();
    }
    
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the account deletion handler
export const DELETE = withRateLimit(deleteAccountHandler, 'AUTH_ACCOUNT_DELETE'); 