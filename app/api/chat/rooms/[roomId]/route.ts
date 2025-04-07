import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ChatRoom } from '@/app/models/chat.model';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/config';
import { SenderType } from '@/app/models/chat.model';

interface TokenPayload {
  userId: string;
  businessId?: string;
  email: string;
  name?: string;
  type: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // Get token from cookies
    const token = req.cookies.get('authToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    const verified = jwt.verify(token, JWT_SECRET) as TokenPayload;
    console.log('Verified token:', verified);

    // Connect to database
    await connectToDatabase();

    // Validate roomId
    if (!mongoose.Types.ObjectId.isValid(params.roomId)) {
      console.error('Invalid room ID format:', params.roomId);
      return NextResponse.json({ error: 'Invalid room ID format' }, { status: 400 });
    }

    console.log('Fetching chat room:', params.roomId, 'for user:', verified.userId);

    // Get chat room with business details
    const chatRoom = await ChatRoom.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(params.roomId),
          userId: { $in: [verified.userId, new mongoose.Types.ObjectId(verified.userId)] }
        }
      },
      {
        $lookup: {
          from: 'businesses',
          localField: 'businessId',
          foreignField: '_id',
          as: 'business'
        }
      },
      {
        $addFields: {
          business: {
            $cond: {
              if: { $eq: [{ $size: '$business' }, 0] },
              then: {
                business_name: 'Unknown Business',
                images: []
              },
              else: { $arrayElemAt: ['$business', 0] }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          businessId: 1,
          messages: 1,
          appointments: 1,
          'business.business_name': 1,
          'business.images': 1
        }
      }
    ]);

    console.log('Chat room query result:', chatRoom);

    if (!chatRoom.length) {
      console.error('Chat room not found:', params.roomId);
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }

    // Mark unread messages as read
    await ChatRoom.updateOne(
      {
        _id: new mongoose.Types.ObjectId(params.roomId),
        'messages.senderType': 'business',
        'messages.read': false
      },
      {
        $set: {
          'messages.$[elem].read': true
        }
      },
      {
        arrayFilters: [{ 'elem.senderType': 'business', 'elem.read': false }],
        multi: true
      }
    );

    return NextResponse.json(chatRoom[0]);
  } catch (error) {
    console.error('Error fetching chat room:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch chat room' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // Get token from cookies or Authorization header
    const cookieToken = req.cookies.get('authToken')?.value;
    const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const token = headerToken || cookieToken;
    
    console.log('POST to chat room:', params.roomId, {
      hasCookieToken: !!cookieToken,
      hasHeaderToken: !!headerToken,
      usingToken: !!token
    });

    if (!token) {
      console.error('No authentication token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let verified: TokenPayload;
    try {
      verified = jwt.verify(token, JWT_SECRET) as TokenPayload;
      console.log('Verified token for message:', {
        userId: verified.userId,
        type: verified.type
      });
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    // Get request body
    const body = await req.json();
    console.log('Message body:', {
      content: body.content?.substring(0, 50) + (body.content?.length > 50 ? '...' : ''),
      senderType: body.senderType,
      isAI: body.isAI
    });

    // Validate roomId
    if (!mongoose.Types.ObjectId.isValid(params.roomId)) {
      console.error('Invalid room ID format:', params.roomId);
      return NextResponse.json({ error: 'Invalid room ID format' }, { status: 400 });
    }

    // Check for duplicate AI appointment messages
    if (body.isAI && body.content && body.content.includes('appointment')) {
      // Find the chat room with recent messages
      const chatRoom = await ChatRoom.findById(params.roomId);
      if (chatRoom && chatRoom.messages && chatRoom.messages.length > 0) {
        // Get the 10 most recent messages
        const recentMessages = chatRoom.messages.slice(-10);
        
        // Check if there's a duplicate AI appointment message in the last 10 messages
        const recentTimeThreshold = new Date();
        recentTimeThreshold.setMinutes(recentTimeThreshold.getMinutes() - 3); // Within last 3 minutes
        
        const similarContentThreshold = 0.9; // 90% similarity threshold
        
        const potentialDuplicate = recentMessages.find((msg: any) => {
          // Only check AI messages about appointments
          if (!msg.isAI || !msg.content.includes('appointment')) {
            return false;
          }
          
          // Check if message was sent recently
          const messageDate = new Date(msg.createdAt);
          if (messageDate < recentTimeThreshold) {
            return false;
          }
          
          // Check content similarity for appointment confirmation messages
          const isSameAppointment = 
            (msg.content.includes('New appointment request:') && body.content.includes('New appointment request:')) ||
            (msg.content.includes('Appointment updated:') && body.content.includes('Appointment updated:'));
            
          return isSameAppointment;
        });
        
        if (potentialDuplicate) {
          console.log('Prevented duplicate AI appointment message:', {
            existingMessage: potentialDuplicate._id,
            timeDifference: `${Math.round((Date.now() - new Date(potentialDuplicate.createdAt).getTime()) / 1000)} seconds ago`
          });
          
          // Return the existing message instead of creating a duplicate
          return NextResponse.json({
            existingMessage: potentialDuplicate,
            isDuplicate: true,
            status: 'Prevented duplicate appointment message'
          });
        }
      }
    }

    // Determine sender type - if not specified, use USER for user token and BUSINESS for business token
    const senderType: SenderType = body.senderType || (verified.type === 'business' ? 'BUSINESS' : 'USER');
    
    console.log('Adding message to room:', params.roomId, {
      sender: senderType,
      isAI: !!body.isAI,
      contentLength: body.content?.length
    });

    // First, let's find the chat room and check its structure
    const existingChatRoom = await ChatRoom.findById(params.roomId);
    console.log('Found chat room:', {
      exists: !!existingChatRoom,
      roomId: params.roomId,
      userId: existingChatRoom?.userId,
      businessId: existingChatRoom?.businessId,
      messageCount: existingChatRoom?.messages?.length || 0
    });

    // Determine sender ID
    const senderId = verified.businessId || verified.userId;

    if (!senderId) {
      return NextResponse.json(
        { error: 'Invalid sender identification' },
        { status: 400 }
      );
    }

    // Create message object without any image data
    const messageData = {
      _id: new mongoose.Types.ObjectId(),
      content: body.content?.trim(),
      senderId: new mongoose.Types.ObjectId(senderId),
      senderType: senderType,
      chatRoomId: params.roomId,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating message with data:', messageData);

    // Update chat room with new message using direct update
    const updatedChatRoom = await ChatRoom.findByIdAndUpdate(
      params.roomId,
      {
        $push: { messages: messageData },
        $set: { lastActivity: new Date() }
      },
      { 
        new: true,
        runValidators: false // Disable validation to avoid image field issues
      }
    );

    if (!updatedChatRoom) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      );
    }

    // Get the newly added message
    const newMessage = updatedChatRoom.messages[updatedChatRoom.messages.length - 1];
    console.log('Message added successfully:', newMessage);

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { error: 'Invalid message format', details: error.message },
        { status: 400 }
      );
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 