import express, { Response } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth.middleware';
import ChatRoom from '../models/chat.model';
import { SenderType } from '../types';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/user/chats - Get all chats for a user
router.get('/chats', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    console.log('Fetching chats for user:', userId);

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    // Find chat rooms where userId matches
    const chatRooms = await ChatRoom.find({
      userId: new mongoose.Types.ObjectId(userId)
    }).lean().sort({ updatedAt: -1 });

    console.log('Found chat rooms:', chatRooms.length);

    // Format the response
    const formattedChats = chatRooms.reduce((acc: any, room) => {
      const messages = Array.isArray(room.messages) ? room.messages : [];
      console.log(`Processing room ${room._id}, found ${messages.length} messages`);
      
      // Format each message
      const formattedMessages = messages.map(msg => {
        const isUserMessage = msg.senderId?.toString() === userId?.toString();
        console.log('Processing message:', {
          content: msg.content,
          senderId: msg.senderId?.toString(),
          isUserMessage,
          senderType: msg.senderType
        });

        return {
          _id: msg._id?.toString() || new mongoose.Types.ObjectId().toString(),
          content: msg.content || '',
          senderId: msg.senderId?.toString() || '',
          senderType: isUserMessage ? SenderType.USER : msg.senderType,
          chatRoomId: msg.chatRoomId?.toString() || room._id.toString(),
          read: Boolean(msg.read),
          createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: msg.updatedAt ? new Date(msg.updatedAt).toISOString() : new Date().toISOString()
        };
      });

      // Sort messages by date
      formattedMessages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Log message statistics
      const userMessages = formattedMessages.filter(m => m.senderType === SenderType.USER);
      const businessMessages = formattedMessages.filter(m => m.senderType === SenderType.BUSINESS);
      console.log('Message statistics for room', room._id.toString(), {
        totalMessages: formattedMessages.length,
        userMessages: userMessages.length,
        businessMessages: businessMessages.length
      });

      acc[room._id.toString()] = {
        messages: formattedMessages,
        business: {
          id: room.businessId?.toString()
        }
      };

      return acc;
    }, {});

    res.json(formattedChats);
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chats' });
  }
});

// POST /api/user/chat/send - Send a chat message
router.post('/chat/send', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { chatRoomId, content } = req.body;
    const userId = req.user?.id;
    console.log('Sending message - Chat Room ID:', chatRoomId);
    console.log('User ID:', userId);
    console.log('Message content:', content);

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    // Find the chat room by ID only first
    const chatRoom = await ChatRoom.findById(chatRoomId);
    
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Verify this user has access to this chat room
    if (chatRoom.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to access this chat room' });
    }

    // Create new message
    const message = {
      _id: new mongoose.Types.ObjectId(),
      content,
      senderId: new mongoose.Types.ObjectId(userId),
      senderType: SenderType.USER,
      chatRoomId: chatRoom._id,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add message to chat room
    chatRoom.messages.push(message);
    chatRoom.updatedAt = new Date();
    await chatRoom.save();

    console.log('Message sent successfully:', {
      messageId: message._id.toString(),
      content: message.content,
      senderId: message.senderId.toString(),
      senderType: message.senderType,
      chatRoomId: message.chatRoomId.toString()
    });

    res.status(201).json({
      ...message,
      _id: message._id.toString(),
      senderId: message.senderId.toString(),
      chatRoomId: message.chatRoomId.toString(),
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString()
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// POST /api/user/chat/create - Create a new chat room
router.post('/chat/create', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.body;
    const userId = req.user?.id;
    console.log('Creating chat room for user:', userId, 'with business:', businessId);

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    // Check if chat room already exists
    const existingChatRoom = await ChatRoom.findOne({
      businessId: new mongoose.Types.ObjectId(businessId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (existingChatRoom) {
      console.log('Chat room already exists:', existingChatRoom._id);
      return res.json(existingChatRoom);
    }

    // Create new chat room
    const chatRoom = new ChatRoom({
      businessId: new mongoose.Types.ObjectId(businessId),
      userId: new mongoose.Types.ObjectId(userId),
      messages: []
    });

    await chatRoom.save();
    console.log('Created new chat room:', chatRoom._id);

    res.status(201).json(chatRoom);
  } catch (error: any) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ error: error.message || 'Failed to create chat room' });
  }
});

export default router; 