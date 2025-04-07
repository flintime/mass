import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import ChatRoom from '@/backend/src/models/chat.model';
import User from '@/backend/src/models/user.model';
import { SenderType } from '@/lib/types';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('businessAuthToken')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const verified = verify(token, JWT_SECRET) as { businessId: string };
    
    if (!verified.businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('Fetching chats for business:', verified.businessId);

    // Convert to ObjectId
    const businessObjectId = new mongoose.Types.ObjectId(verified.businessId);

    // Use aggregation pipeline to get chat rooms with additional info
    const pipeline = [
      {
        $match: { businessId: businessObjectId }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $addFields: {
          unreadCount: {
            $size: {
              $filter: {
                input: '$messages',
                as: 'message',
                cond: {
                  $and: [
                    { $eq: ['$$message.senderType', 'USER'] },
                    { $eq: ['$$message.read', false] }
                  ]
                }
              }
            }
          },
          // Ensure user info is available
          userInfo: { $arrayElemAt: ['$userInfo', 0] }
        }
      },
      {
        $sort: { 'lastActivity': -1 }
      }
    ] as mongoose.PipelineStage[];
    
    const chatRooms = await ChatRoom.aggregate(pipeline);
    console.log(`Found ${chatRooms.length} chat rooms`);

    // Get messages and user info for each chat room
    const chatList: { [key: string]: any } = {};

    for (const room of chatRooms) {
      try {
        console.log(`Processing chat room: ${room._id}`);
        
        // Get user info from the aggregation result
        const user = room.userInfo || await User.findById(room.userId);
        
        if (!user) {
          console.error('User not found for chat room:', room._id, 'userId:', room.userId);
          continue;
        }

        // Make sure unreadCount is defined and calculate it explicitly if not
        let unreadCount = room.unreadCount;
        if (typeof unreadCount !== 'number') {
          // Fallback calculation if aggregation didn't calculate it
          unreadCount = (room.messages || []).filter((msg: any) => 
            msg.senderType === 'USER' && msg.read === false
          ).length;
          console.log(`Fallback unreadCount calculation for room ${room._id}: ${unreadCount}`);
        }

        // Add to chat list
        chatList[room._id.toString()] = {
          messages: (room.messages || []).map((msg: any) => ({
            _id: msg._id.toString(),
            content: msg.content,
            senderId: msg.senderId.toString(),
            senderType: msg.senderType,
            chatRoomId: msg.chatRoomId?.toString() || room._id.toString(),
            read: !!msg.read,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
            image: msg.image,
            isAI: !!msg.isAI
          })),
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email
          },
          unreadCount: unreadCount
        };
      } catch (error) {
        console.error('Error processing chat room:', room._id, error);
        continue;
      }
    }

    console.log('Successfully processed all chat rooms');
    return NextResponse.json(chatList);
  } catch (error) {
    console.error('Error fetching business chats:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chats' },
      { status: 500 }
    );
  }
} 
