import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SenderType } from '@/lib/types';
import mongoose, { Types } from 'mongoose';
import { ChatRoom, IMessage, IMessageImage } from '@/app/models/chat.model';

// Validate image data
function validateImageData(image: any): { isValid: boolean; error?: string } {
  if (!image) return { isValid: true };

  // Check required fields
  if (!image.url || !image.type || typeof image.size !== 'number') {
    return { 
      isValid: false, 
      error: 'Image must have url, type, and size' 
    };
  }

  // Validate URL format
  if (!image.url.startsWith('https://')) {
    return { 
      isValid: false, 
      error: 'Image URL must be HTTPS' 
    };
  }

  // Validate image type
  if (!image.type.startsWith('image/')) {
    return { 
      isValid: false, 
      error: 'Invalid image type' 
    };
  }

  // Validate size (5MB limit)
  if (image.size <= 0 || image.size > 5 * 1024 * 1024) {
    return { 
      isValid: false, 
      error: 'Image size must be between 0 and 5MB' 
    };
  }

  return { isValid: true };
}

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

export async function POST(request: Request) {
  try {
    const { content, image, chatRoomId } = await request.json();
    
    console.log('Received message request:', {
      chatRoomId,
      hasContent: !!content,
      contentLength: content?.length,
      image: image ? {
        url: image.url,
        type: image.type,
        size: image.size
      } : null
    });

    // Validate content and chatRoomId
    if (!chatRoomId) {
      console.error('Chat room ID is required');
      return NextResponse.json(
        { error: 'Chat room ID is required' },
        { status: 400 }
      );
    }

    if (!content && !image) {
      console.error('Message must have either content or image');
      return NextResponse.json(
        { error: 'Message must have either content or image' },
        { status: 400 }
      );
    }

    // Validate image data if present
    if (image) {
      console.log('Validating image data:', image);
      const imageValidation = validateImageData(image);
      if (!imageValidation.isValid) {
        console.error('Image validation failed:', imageValidation.error);
        return NextResponse.json(
          { error: imageValidation.error },
          { status: 400 }
        );
      }
    }

    // Connect to database
    await connectToDatabase();

    // Verify user and get chat room
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      console.error('Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', {
      userId: authResult.userId,
      chatRoomId
    });

    // Find chat room
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      console.error('Chat room not found:', chatRoomId);
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      );
    }

    console.log('Found chat room:', {
      id: chatRoom._id.toString(),
      messageCount: chatRoom.messages?.length || 0
    });

    // Create message data
    const messageData: Partial<IMessage> = {
      _id: new Types.ObjectId(),
      content: content || '',
      senderId: authResult.userId,
      senderType: SenderType.USER,
      chatRoomId: chatRoom._id.toString(),
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add image data if present
    if (image) {
      messageData.image = {
        url: image.url,
        type: image.type,
        size: image.size
      };
      console.log('Adding image to message:', messageData.image);
    }

    console.log('Prepared message data:', {
      messageId: messageData._id?.toString(),
      content: messageData.content,
      hasImage: !!messageData.image,
      imageUrl: messageData.image?.url
    });

    // Use the addMessage method from the model
    const newMessage = chatRoom.addMessage(messageData);
    chatRoom.lastActivity = new Date();

    // Save the chat room with the new message
    const savedChatRoom = await chatRoom.save();
    console.log('Chat room saved with new message:', {
      roomId: savedChatRoom._id.toString(),
      messageCount: savedChatRoom.messages.length,
      lastMessage: savedChatRoom.messages[savedChatRoom.messages.length - 1]
    });

    // Get the saved message
    const savedMessage = savedChatRoom.messages[savedChatRoom.messages.length - 1];

    console.log('Message saved successfully:', {
      messageId: savedMessage._id.toString(),
      hasContent: !!savedMessage.content,
      hasImage: !!savedMessage.image,
      imageUrl: savedMessage.image?.url
    });

    // Return the saved message with proper image data
    return NextResponse.json({
      _id: savedMessage._id.toString(),
      content: savedMessage.content,
      senderId: savedMessage.senderId,
      senderType: savedMessage.senderType,
      chatRoomId: savedMessage.chatRoomId,
      read: savedMessage.read,
      createdAt: savedMessage.createdAt,
      updatedAt: savedMessage.updatedAt,
      image: savedMessage.image ? {
        url: savedMessage.image.url,
        type: savedMessage.image.type,
        size: savedMessage.image.size
      } : undefined
    });
  } catch (error) {
    console.error('Error in message send:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 