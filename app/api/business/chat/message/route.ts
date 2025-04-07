import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ChatRoom } from '@/models/chat';
import { SenderType } from '@/app/models/chat.model';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Business from '@/models/business.model';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to get business ID from token
function getBusinessIdFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { businessId: string };
    return decoded.businessId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // Authenticate business
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = getBusinessIdFromToken(token);
    if (!businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const { chatRoomId, content, image } = await req.json();

    // Validate required fields
    if (!chatRoomId) {
      return NextResponse.json({ error: 'Chat room ID is required' }, { status: 400 });
    }

    if (!content && !image) {
      return NextResponse.json({ error: 'Message must have either content or image' }, { status: 400 });
    }

    // Connect to database
    await dbConnect();

    // Find chat room
    const chatRoom = await ChatRoom.findOne({
      _id: new mongoose.Types.ObjectId(chatRoomId),
      businessId: new mongoose.Types.ObjectId(businessId)
    });

    if (!chatRoom) {
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }

    // Create message
    const message = {
      _id: new mongoose.Types.ObjectId(),
      content: content || '',
      senderId: businessId,
      senderType: SenderType.BUSINESS,
      chatRoomId: chatRoomId,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: image || undefined
    };

    // Try to save using the model's addMessage method first
    try {
      if (typeof chatRoom.addMessage === 'function') {
        chatRoom.addMessage(message);
        chatRoom.lastActivity = new Date();
        await chatRoom.save();
      } else {
        // Fallback to direct array push
        chatRoom.messages.push(message);
        chatRoom.lastActivity = new Date();
        await chatRoom.save();
      }
    } catch (saveError) {
      console.error('Error saving message with save method:', saveError);
      
      // Try alternative method with updateOne
      try {
        const updateResult = await ChatRoom.updateOne(
          { _id: new mongoose.Types.ObjectId(chatRoomId) },
          { 
            $push: { messages: message },
            $set: { lastActivity: new Date() }
          }
        );
        
        if (updateResult.modifiedCount === 0) {
          throw new Error('Failed to save message');
        }
      } catch (updateError) {
        console.error('Error saving message with updateOne:', updateError);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
      }
    }

    // Return the saved message
    return NextResponse.json({
      _id: message._id.toString(),
      content: message.content,
      senderId: message.senderId.toString(),
      senderType: message.senderType,
      chatRoomId: message.chatRoomId,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      image: message.image
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 