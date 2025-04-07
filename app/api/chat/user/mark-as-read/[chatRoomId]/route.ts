import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify the user token and get user ID
async function getUserFromToken(req: NextRequest): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      console.log('No auth token found in cookies');
      return null;
    }

    const decoded = verify(token, JWT_SECRET) as { userId?: string };
    
    if (!decoded.userId) {
      console.log('No user ID found in token');
      return null;
    }

    return decoded.userId;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// PUT route to mark messages as read for user
export async function PUT(
  request: NextRequest,
  { params }: { params: { chatRoomId: string } }
) {
  try {
    const chatRoomId = params.chatRoomId;
    console.log('User mark as read request for chatRoomId:', chatRoomId);

    // Authenticate the request
    const userId = await getUserFromToken(request);
    console.log('Authenticated user ID:', userId);
    
    if (!userId) {
      console.log('Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate chatRoomId
    if (!chatRoomId) {
      console.log('Missing chatRoomId parameter');
      return NextResponse.json({ error: 'Missing chat room ID' }, { status: 400 });
    }
    
    // Validate ObjectId format
    try {
      if (chatRoomId.match(/^[0-9a-fA-F]{24}$/)) {
        new mongoose.Types.ObjectId(chatRoomId);
      } else {
        throw new Error('Invalid ObjectId format');
      }
    } catch (error) {
      console.log('Invalid ObjectId format:', chatRoomId);
      return NextResponse.json({ error: 'Invalid chat room ID format' }, { status: 400 });
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Verify the chat room exists and belongs to this user
    const chatRoom = await db.collection('chatrooms').findOne({
      _id: new mongoose.Types.ObjectId(chatRoomId),
      userId: userId
    });
    
    if (!chatRoom) {
      return NextResponse.json({ 
        error: 'Chat room not found or access denied'
      }, { status: 404 });
    }
    
    // Count unread messages before marking as read for logging
    const unreadCountBefore = chatRoom.messages ? 
      chatRoom.messages.filter((msg: any) => msg.senderType === 'BUSINESS' && !msg.read).length : 0;
    
    console.log(`Unread count before update: ${unreadCountBefore}`);
    
    // Mark all business messages as read
    const updateResult = await db.collection('chatrooms').updateOne(
      { _id: new mongoose.Types.ObjectId(chatRoomId) },
      {
        $set: {
          'messages.$[elem].read': true
        }
      },
      {
        arrayFilters: [{ 'elem.senderType': 'BUSINESS', 'elem.read': false }]
      }
    );
    
    console.log('Update result:', {
      acknowledged: updateResult.acknowledged,
      modifiedCount: updateResult.modifiedCount,
      matchedCount: updateResult.matchedCount
    });
    
    // Success response with number of messages updated
    return NextResponse.json({
      success: true,
      messagesUpdated: updateResult.modifiedCount || 0,
      unreadCount: 0,
      unreadCountBefore
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in user mark-as-read API route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to mark messages as read',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add GET handler for browser testing
export async function GET(
  request: NextRequest,
  { params }: { params: { chatRoomId: string } }
) {
  try {
    const chatRoomId = params.chatRoomId;
    console.log('Debug GET route called with chatRoomId:', chatRoomId);
    
    // Send a simple success response
    return NextResponse.json({
      success: true,
      method: 'GET',
      message: 'Debug endpoint working',
      chatRoomId
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in debug route:', error);
    return NextResponse.json(
      { 
        error: 'Debug route error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 