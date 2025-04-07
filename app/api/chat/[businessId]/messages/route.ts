import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ChatStatus, SenderType } from '@/lib/types';
import mongoose from 'mongoose';

// Helper function to look up a business by unique_id
async function lookupBusinessByUniqueId(uniqueId: string, db: any): Promise<string | null> {
  try {
    console.log(`Looking up business with unique_id: ${uniqueId}`);
    
    // Try to find the business by unique_id
    const business = await db.collection('businesses').findOne({ unique_id: uniqueId });
    
    if (!business) {
      console.log(`No business found with unique_id: ${uniqueId}`);
      return null;
    }
    
    console.log(`Found business with unique_id: ${uniqueId}`, {
      _id: business._id.toString(),
      name: business.business_name || 'Unnamed'
    });
    
    return business._id.toString();
  } catch (error) {
    console.error(`Error looking up business by unique_id: ${uniqueId}`, error);
    return null;
  }
}

// Define the message schema to match the backend
const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.Mixed, required: true },
  senderType: { type: String, enum: Object.values(SenderType), required: true },
  chatRoomId: { type: mongoose.Schema.Types.Mixed, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isAI: { type: Boolean, default: false },
  image: {
    url: String,
    type: String,
    size: Number
  }
}, {
  _id: true,
  timestamps: true
});

// Define the chat room schema to match the backend
const chatRoomSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.Mixed, required: true },
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  user: {
    name: { type: String },
    email: { type: String }
  },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'chatrooms',
  strict: false,
  timestamps: true
});

// Create the model
const ChatRoom = mongoose.models.ChatRoom || mongoose.model('ChatRoom', chatRoomSchema);

async function verifyToken(req: Request) {
  try {
    // First try Authorization header
    const authHeader = req.headers.get('authorization');
    let token = '';

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Found token in Authorization header');
    } else {
      // Try to get token from cookies
      const cookies = req.headers.get('cookie')?.split(';') || [];
      const authCookie = cookies.find(c => c.trim().startsWith('authToken='));
      if (authCookie) {
        token = authCookie.split('=')[1];
        console.log('Found token in cookies');
      }
    }

    if (!token) {
      console.log('No token found in headers or cookies');
      return { success: false, userId: '', error: 'No authentication token found' };
    }

    // Forward the token to the backend for verification
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to verify token' }));
      console.error('Token verification failed:', error);
      return { success: false, userId: '', error: error.error || 'Failed to verify token' };
    }

    const userData = await response.json();
    return { success: true, userId: userData.id };
  } catch (error) {
    console.error('Token verification error:', error);
    return { success: false, userId: '', error: 'Token verification failed' };
  }
}

export async function GET(
  req: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    console.log('Received chat messages request for business:', params.businessId);
    
    const authResult = await verifyToken(req);
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    let { businessId } = params;
    
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Final validation: Must be a valid MongoDB ObjectId to use in chat system
    let validObjectId = false;
    
    // If the businessId doesn't look like an ObjectId, try to look it up by unique_id
    if (!(/^[0-9a-fA-F]{24}$/.test(businessId))) {
      const lookupResult = await lookupBusinessByUniqueId(businessId, db);
      if (lookupResult) {
        console.log(`Found ObjectId for unique_id "${businessId}": ${lookupResult}`);
        // Use the actual MongoDB ObjectId instead of the unique_id
        businessId = lookupResult;
        validObjectId = true;
      } else {
        console.log(`Could not find ObjectId for unique_id "${businessId}"`);
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
    } else {
      validObjectId = true;
    }
    
    // Final check - do not allow non-ObjectId values in chat system
    if (!validObjectId) {
      console.error(`Invalid business ID format for chat: ${businessId}`);
      return NextResponse.json(
        { error: 'Invalid business ID format' },
        { status: 400 }
      );
    }

    // Convert IDs to ObjectIds
    const userObjectId = new mongoose.Types.ObjectId(authResult.userId);
    
    // At this point, businessId should always be a valid ObjectId
    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    
    console.log('Searching for chat room with:', {
      userId: {
        original: authResult.userId,
        asObjectId: userObjectId.toString()
      },
      businessId: {
        original: businessId,
        asObjectId: businessObjectId.toString()
      }
    });
    
    // Try to find existing chat room - now using ObjectIds directly
    const existingRoom = await db.collection('chatrooms').findOne({
      $and: [
        {
          $or: [
            { userId: userObjectId },
            { userId: authResult.userId },
            { userId: userObjectId.toString() }
          ]
        },
        {
          $or: [
            { businessId: businessObjectId },
            { businessId: businessId },
            { businessId: businessObjectId.toString() }
          ]
        }
      ]
    });

    if (existingRoom) {
      console.log('Found matching chat room:', {
        id: existingRoom._id.toString(),
        userId: typeof existingRoom.userId === 'object' ? existingRoom.userId.toString() : existingRoom.userId,
        businessId: typeof existingRoom.businessId === 'object' ? existingRoom.businessId.toString() : existingRoom.businessId
      });
      
      // Get and format messages
      const messages = existingRoom.messages || [];
      console.log(`Processing ${messages.length} messages from existing room`);

      interface ChatMessage {
        _id: mongoose.Types.ObjectId;
        content: string;
        senderId: mongoose.Types.ObjectId;
        senderType: string;
        chatRoomId: mongoose.Types.ObjectId;
        read: boolean;
        createdAt: Date;
        updatedAt: Date;
        isAI: boolean;
        image?: {
          url: string;
          type: string;
          size: number;
        };
      }

      const formattedMessages = messages.map((msg: ChatMessage) => ({
        _id: msg._id.toString(),
        content: msg.content,
        senderId: msg.senderId.toString(),
        senderType: msg.senderType,
        chatRoomId: existingRoom._id.toString(),
        read: Boolean(msg.read),
        createdAt: msg.createdAt.toISOString(),
        updatedAt: msg.updatedAt.toISOString(),
        isAI: Boolean(msg.isAI),
        image: msg.image ? {
          url: msg.image.url,
          type: msg.image.type,
          size: msg.image.size
        } : undefined
      }));

      // Sort messages by date
      formattedMessages.sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      return new NextResponse(JSON.stringify(formattedMessages), {
        headers: {
          'Content-Type': 'application/json',
          'X-Chat-Room-Id': existingRoom._id.toString()
        }
      });
    } 

    console.log('No existing chat room found, creating new one');
    const newChatRoom = await db.collection('chatrooms').insertOne({
      userId: userObjectId,
      businessId: businessObjectId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const chatRoomId = newChatRoom.insertedId.toString();
    console.log('Created new chat room:', {
      id: chatRoomId,
      userId: userObjectId.toString(),
      businessId: businessObjectId.toString()
    });

    return new NextResponse(JSON.stringify({ messages: [], chatRoomId }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Chat-Room-Id': chatRoomId
      }
    });

  } catch (error) {
    console.error('Error in chat messages API:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch messages' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 