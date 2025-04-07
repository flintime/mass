import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '../../../lib/db';
import { ChatRoom } from '../../../models/chat.model';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/config';

interface TokenPayload {
  userId: string;
  email: string;
  name?: string;
  type: string;
}

export async function GET(req: NextRequest) {
  try {
    // Get the token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug token and JWT_SECRET
    console.log('Token from cookie:', token.substring(0, 20) + '...');
    console.log('JWT_SECRET length:', JWT_SECRET.length);
    console.log('JWT_SECRET first 4 chars:', JWT_SECRET.substring(0, 4));

    try {
      // First try to decode without verification to see the payload
      const decoded = jwt.decode(token);
      console.log('Decoded token (without verification):', decoded);

      // Now try to verify with proper typing
      const verified = jwt.verify(token, JWT_SECRET) as TokenPayload;
      console.log('Verified token:', verified);

      // Check for userId
      if (!verified.userId) {
        console.log('Token validation failed: missing userId');
        return NextResponse.json({ error: 'Invalid token - missing userId' }, { status: 401 });
      }

      // If type is missing, assume it's a user token for backward compatibility
      const tokenType = verified.type || 'user';
      if (tokenType !== 'user') {
        console.log('Token validation failed: invalid type', { type: tokenType });
        return NextResponse.json({ error: 'Invalid token - wrong type' }, { status: 401 });
      }

      // Connect to database
      await dbConnect();

      console.log('Fetching chat rooms for user:', verified.userId);

      // Debug userId conditions
      console.log('Searching for userId conditions:', {
        string: verified.userId,
        objectId: new mongoose.Types.ObjectId(verified.userId).toString()
      });

      const userIdConditions = [
        verified.userId,
        new mongoose.Types.ObjectId(verified.userId)
      ];
      
      const chatRoomCount = await ChatRoom.countDocuments({
        userId: { $in: userIdConditions }
      });
      console.log('Found chat room count:', chatRoomCount);

      // Get a sample of raw chat rooms to verify userId format
      const sampleRooms = await ChatRoom.find({ 
        userId: { $in: userIdConditions } 
      })
      .limit(3)
      .select('userId businessId')
      .lean();
      
      console.log('Sample chat rooms userId format:', sampleRooms.map(room => {
        // Use proper type checks and safe access
        const roomId = room && room._id 
          ? typeof (room._id as any).toString === 'function' 
            ? (room._id as any).toString() 
            : String(room._id)
          : 'unknown';
          
        return {
          roomId,
          userId: room.userId,
          userIdType: typeof room.userId,
          isObjectId: mongoose.Types.ObjectId.isValid(room.userId)
        };
      }));

      // Simplified pipeline to get all chat rooms
      const pipeline: mongoose.PipelineStage[] = [
        {
          $match: { 
            userId: { $in: userIdConditions }
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
            businessId: 1,
            userId: 1,
            messages: 1,
            'business.business_name': 1,
            'business.images': 1,
            unreadCount: {
              $size: {
                $filter: {
                  input: '$messages',
                  as: 'message',
                  cond: {
                    $and: [
                      { $eq: ['$$message.senderType', 'BUSINESS'] },
                      { $eq: ['$$message.read', false] }
                    ]
                  }
                }
              }
            },
            lastMessage: { $arrayElemAt: ['$messages', -1] }
          }
        },
        {
          $sort: { 'lastMessage.createdAt': -1 }
        }
      ];

      console.log('Running aggregation pipeline...');
      const chatRooms = await ChatRoom.aggregate(pipeline);

      console.log('Aggregation results:');
      console.log('Number of chat rooms found:', chatRooms.length);
      
      // Log each chat room for debugging
      chatRooms.forEach((room, index) => {
        console.log(`Chat room ${index + 1}:`, {
          id: room._id,
          businessId: room.businessId,
          businessName: room.business?.business_name,
          hasMessages: room.messages?.length > 0,
          lastMessage: room.lastMessage ? {
            content: room.lastMessage.content,
            senderType: room.lastMessage.senderType,
            createdAt: room.lastMessage.createdAt
          } : null,
          unreadCount: room.unreadCount
        });
      });

      // If no rooms found through aggregation, try a direct find
      if (chatRooms.length === 0) {
        console.log('No chat rooms found through aggregation, trying direct find...');
        const rawRooms = await ChatRoom.find({ userId: verified.userId })
          .select('businessId userId messages')
          .lean();
        
        console.log('Direct find results:', {
          count: rawRooms.length,
          sample: rawRooms[0] ? {
            id: rawRooms[0]._id,
            businessId: rawRooms[0].businessId,
            messageCount: rawRooms[0].messages?.length
          } : null
        });
      }

      return NextResponse.json(chatRooms);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      if (tokenError instanceof jwt.JsonWebTokenError) {
        console.error('JWT Error details:', {
          message: tokenError.message,
          name: tokenError.name,
          stack: tokenError.stack
        });
      }
      throw tokenError;
    }
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('JWT Error details:', error.message);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Check if error is due to network/connection issues
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error - Database connection failed');
      return NextResponse.json(
        { error: 'Unable to connect to chat server. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat rooms' },
      { status: 500 }
    );
  }
} 