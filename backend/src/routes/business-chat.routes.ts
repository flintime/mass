import express, { Request, Response } from 'express';
import { authenticateBusiness, AuthRequest as BaseAuthRequest } from '../middleware/auth.middleware';
import ChatRoom, { IMessage } from '../models/chat.model';
import User from '../models/user.model';
import { SenderType } from '../types';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

type AuthRequest = BaseAuthRequest & {
  io?: Server;
};

const router = express.Router();

interface FormattedChats {
  [key: string]: {
    messages: Array<{
      _id: string;
      content: string;
      senderId: string;
      senderType: SenderType;
      chatRoomId: string;
      read: boolean;
      createdAt: string;
      updatedAt: string;
      senderName?: string;
      senderEmail?: string;
      image?: {
        url: string;
        type: string;
        size: number;
      };
    }>;
    user: {
      name: string;
      email: string;
    };
    unreadCount: number;
  };
}

// GET /api/business/chats - Get all chats for a business
router.get('/chats', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.business?.id;
    console.log('Raw business object:', req.business);
    console.log('Fetching chats for business:', businessId);

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    // Find chat rooms where businessId matches (try both string and ObjectId)
    const query = {
      $or: [
        { businessId: businessId },
        { businessId: new mongoose.Types.ObjectId(businessId) }
      ]
    };
    
    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    // First get all chat rooms
    const chatRooms = await ChatRoom.find(query)
      .populate({
        path: 'userId',
        model: 'User',
        select: 'name email'
      })
      .lean()
      .sort({ updatedAt: -1 });

    console.log('Found chat rooms:', chatRooms.length);

    // Format the response
    const formattedChats: FormattedChats = {};
    
    // Process each chat room
    for (const room of chatRooms) {
      const user = room.userId as any;
      console.log('\nProcessing room:', room._id);
      console.log('User data:', user);

      // Get messages from messages array
      const messages = Array.isArray(room.messages) ? room.messages : [];
      console.log(`Found ${messages.length} messages for room ${room._id}`);
      
      // Format each message
      const formattedMessages = messages.map((msg: IMessage) => {
        const isBusiness = msg.senderId?.toString() === businessId?.toString();
        const isUser = msg.senderType === SenderType.USER;
        
        console.log('Message sender analysis:', {
          messageId: msg._id?.toString(),
          content: msg.content,
          senderId: msg.senderId?.toString(),
          businessId: businessId?.toString(),
          userId: user?._id?.toString(),
          isBusiness,
          isUser,
          originalSenderType: msg.senderType,
          determinedSenderType: msg.senderType
        });

        return {
          _id: msg._id?.toString() || new mongoose.Types.ObjectId().toString(),
          content: msg.content || '',
          senderId: msg.senderId?.toString() || '',
          senderType: msg.senderType,
          chatRoomId: msg.chatRoomId?.toString() || room._id.toString(),
          read: Boolean(msg.read),
          createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: msg.updatedAt ? new Date(msg.updatedAt).toISOString() : new Date().toISOString(),
          senderName: isUser ? (user.name || 'Unknown User') : undefined,
          senderEmail: isUser ? (user.email || 'unknown@email.com') : undefined,
          image: msg.image ? {
            url: msg.image.url,
            type: msg.image.type,
            size: msg.image.size
          } : undefined
        };
      });

      // Log message statistics
      const userMessages = formattedMessages.filter((m) => m.senderType === SenderType.USER);
      const businessMessages = formattedMessages.filter((m) => m.senderType === SenderType.BUSINESS);
      console.log('\nMessage statistics:', {
        roomId: room._id.toString(),
        totalMessages: formattedMessages.length,
        userMessages: userMessages.length,
        businessMessages: businessMessages.length,
        messageTypes: formattedMessages.map((m) => ({
          content: m.content,
          senderType: m.senderType,
          senderId: m.senderId,
          isUser: m.senderType === SenderType.USER,
          isBusiness: m.senderType === SenderType.BUSINESS
        }))
      });

      // Calculate unread count - all unread messages from users
      const unreadCount = formattedMessages.filter(
        msg => msg.senderType === SenderType.USER && !msg.read
      ).length;

      formattedChats[room._id.toString()] = {
        messages: formattedMessages,
        user: {
          name: user?.name || 'Unknown User',
          email: user?.email || 'unknown@email.com'
        },
        unreadCount: unreadCount // Add unread count to the response
      };
    }

    console.log(`\nFinal summary: Found ${Object.keys(formattedChats).length} chat rooms`);
    res.json(formattedChats);
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chats' });
  }
});

// GET /api/business/chat/:chatRoomId/debug - Debug route to check raw chat room data
router.get('/chat/:chatRoomId/debug', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const { chatRoomId } = req.params;
    const businessId = req.business?.id;
    console.log('Debug: Fetching raw chat room data:', chatRoomId);

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    // Get raw chat room data without any population
    const rawChatRoom = await ChatRoom.findById(chatRoomId).lean();
    console.log('Raw chat room from DB:', JSON.stringify(rawChatRoom, null, 2));

    // Get the associated user
    const userId = rawChatRoom?.userId;
    const user = userId ? await User.findById(userId).lean() : null;
    console.log('Associated user:', JSON.stringify(user, null, 2));

    // Check message structure
    const messages = rawChatRoom?.messages || [];
    console.log('Message analysis:', messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      senderId: msg.senderId,
      senderType: msg.senderType,
      userId: userId?.toString(),
      isUserSender: msg.senderId?.toString() === userId?.toString(),
      isBusinessSender: msg.senderId?.toString() === businessId?.toString()
    })));

    res.json({
      chatRoom: rawChatRoom,
      user,
      messageAnalysis: messages.map(msg => ({
        _id: msg._id,
        content: msg.content,
        senderId: msg.senderId,
        senderType: msg.senderType,
        userId: userId?.toString(),
        isUserSender: msg.senderId?.toString() === userId?.toString(),
        isBusinessSender: msg.senderId?.toString() === businessId?.toString()
      }))
    });
  } catch (error: any) {
    console.error('Error in debug route:', error);
    res.status(500).json({ error: error.message || 'Debug route failed' });
  }
});

// POST /api/business/chat/send - Send a chat message
router.post('/chat/send', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const { chatRoomId, content } = req.body;
    const businessId = req.business?.id;
    console.log('Sending message - Chat Room ID:', chatRoomId);
    console.log('Business ID:', businessId);
    console.log('Message content:', content);

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    // Try both string and ObjectId queries
    const query = {
      $or: [
        { 
          _id: chatRoomId,
          businessId: businessId
        },
        {
          _id: new mongoose.Types.ObjectId(chatRoomId),
          businessId: new mongoose.Types.ObjectId(businessId)
        }
      ]
    };
    console.log('Finding chat room with query:', JSON.stringify(query, null, 2));

    // Find the chat room and populate user data
    const chatRoom = await ChatRoom.findOne(query).populate('userId');
    
    console.log('Found chat room:', chatRoom ? {
      id: chatRoom._id,
      businessId: chatRoom.businessId,
      userId: chatRoom.userId,
      messageCount: chatRoom.messages?.length
    } : 'No');

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Create new message with proper typing
    const newMessage: Omit<IMessage, '_id'> & { _id: mongoose.Types.ObjectId } = {
      _id: new mongoose.Types.ObjectId(),
      content,
      senderId: businessId.toString(),
      senderType: SenderType.BUSINESS,
      chatRoomId: chatRoom._id.toString(),
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: req.body.image
    };

    // Add message to chat room
    chatRoom.messages.push(newMessage);
    chatRoom.lastActivity = new Date();
    await chatRoom.save();

    // Emit the message via socket
    req.io?.emit('receive_message', {
      messageId: newMessage._id.toString(),
      content: newMessage.content,
      senderId: newMessage.senderId,
      senderType: newMessage.senderType,
      chatRoomId: newMessage.chatRoomId,
      image: newMessage.image
    });

    res.status(201).json({
      ...newMessage,
      _id: newMessage._id.toString(),
      createdAt: newMessage.createdAt.toISOString(),
      updatedAt: newMessage.updatedAt.toISOString()
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// GET /api/business/chat/:chatRoomId - Get a specific chat room
router.get('/chat/:chatRoomId', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const { chatRoomId } = req.params;
    const businessId = req.business?.id;
    console.log('Fetching chat room:', chatRoomId);
    console.log('Business ID:', businessId);

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    // First find the chat room by ID only
    const chatRoom = await ChatRoom.findById(chatRoomId)
      .populate({
        path: 'userId',
        model: 'User',
        select: 'name email'
      });

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Verify this business has access to this chat room
    if (chatRoom.businessId.toString() !== businessId.toString()) {
      return res.status(403).json({ error: 'Not authorized to access this chat room' });
    }

    console.log('Found chat room:', {
      id: chatRoom._id,
      businessId: chatRoom.businessId,
      userId: chatRoom.userId,
      messageCount: chatRoom.messages?.length
    });

    // Get user info
    const user = chatRoom.userId as any;
    console.log('User info:', user);
    console.log('Raw messages:', chatRoom.messages.map(msg => ({
      content: msg.content,
      senderId: msg.senderId?.toString(),
      senderType: msg.senderType,
      isUserMessage: msg.senderId?.toString() === user?._id?.toString(),
      isBusinessMessage: msg.senderId?.toString() === businessId?.toString()
    })));

    // Format messages with proper sender types
    const formattedMessages = chatRoom.messages.map(msg => {
      // Trust the original sender type instead of trying to determine it
      console.log('Message sender analysis:', {
        messageId: msg._id,
        content: msg.content,
        senderId: msg.senderId.toString(),
        senderType: msg.senderType,
        businessId: businessId.toString(),
        userId: user?._id?.toString()
      });

      return {
        _id: msg._id.toString(),
        content: msg.content,
        senderId: msg.senderId.toString(),
        senderType: msg.senderType, // Use the original sender type
        chatRoomId: msg.chatRoomId.toString(),
        read: msg.read,
        createdAt: msg.createdAt.toISOString(),
        updatedAt: msg.updatedAt.toISOString(),
        senderName: msg.senderType === SenderType.USER ? (user.name || 'Unknown User') : undefined,
        senderEmail: msg.senderType === SenderType.USER ? (user.email || 'unknown@email.com') : undefined
      };
    });

    // Sort messages by date
    formattedMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Log message statistics
    const userMessages = formattedMessages.filter(m => m.senderType === SenderType.USER);
    const businessMessages = formattedMessages.filter(m => m.senderType === SenderType.BUSINESS);
    console.log('Message statistics:', {
      totalMessages: formattedMessages.length,
      userMessages: userMessages.length,
      businessMessages: businessMessages.length,
      messageTypes: formattedMessages.map(m => ({
        content: m.content,
        senderType: m.senderType,
        senderId: m.senderId,
        isUser: m.senderType === SenderType.USER,
        isBusiness: m.senderType === SenderType.BUSINESS
      }))
    });

    const formattedChatRoom = {
      _id: chatRoom._id.toString(),
      businessId: chatRoom.businessId.toString(),
      userId: chatRoom.userId.toString(),
      user: {
        name: user?.name || 'Unknown User',
        email: user?.email || 'unknown@email.com'
      },
      messages: formattedMessages,
      createdAt: chatRoom.createdAt.toISOString(),
      updatedAt: chatRoom.updatedAt.toISOString()
    };

    res.json(formattedChatRoom);
  } catch (error: any) {
    console.error('Error fetching chat room:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chat room' });
  }
});

// PUT /api/business/chat/:chatRoomId/read - Mark messages as read
router.put('/chat/:chatRoomId/read', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const { chatRoomId } = req.params;
    const businessId = req.business?.id;
    console.log('Marking messages as read in chat room:', chatRoomId);
    console.log('Request body:', req.body);

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    // Convert string IDs to MongoDB ObjectIds
    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const chatRoomObjectId = new mongoose.Types.ObjectId(chatRoomId);

    const chatRoom = await ChatRoom.findOne({ 
      _id: chatRoomObjectId,
      businessId: businessObjectId
    });

    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Get specific message IDs to mark as read (if provided)
    const messageIds = req.body.messageIds || [];
    console.log('Received message IDs to mark as read:', messageIds);
    
    // Count unread messages before update
    const unreadCountBefore = chatRoom.messages.filter(
      msg => msg.senderType === SenderType.USER && !msg.read
    ).length;

    // Get current timestamp
    const readTimestamp = new Date();

    // Mark only specified user messages as read (or all if no IDs provided)
    let messagesUpdatedCount = 0;
    
    if (messageIds.length > 0) {
      // Mark only specific messages as read
      chatRoom.messages = chatRoom.messages.map(msg => {
        if (msg.senderType === SenderType.USER && 
            !msg.read && 
            messageIds.includes(msg._id.toString())) {
          messagesUpdatedCount++;
          
          // Add businessId to readBy array if not already present
          if (!msg.readBy) {
            msg.readBy = [businessId.toString()];
          } else if (!msg.readBy.includes(businessId.toString())) {
            msg.readBy.push(businessId.toString());
          }
          
          // Set readTimestamp if not already set
          if (!msg.readTimestamp) {
            msg.readTimestamp = readTimestamp;
          }
          
          // Mark as read
          msg.read = true;
        }
        return msg;
      });
    } else {
      // Mark all user messages as read (legacy behavior)
      chatRoom.messages = chatRoom.messages.map(msg => {
        if (msg.senderType === SenderType.USER && !msg.read) {
          messagesUpdatedCount++;
          
          // Add businessId to readBy array if not already present
          if (!msg.readBy) {
            msg.readBy = [businessId.toString()];
          } else if (!msg.readBy.includes(businessId.toString())) {
            msg.readBy.push(businessId.toString());
          }
          
          // Set readTimestamp if not already set
          if (!msg.readTimestamp) {
            msg.readTimestamp = readTimestamp;
          }
          
          // Mark as read
          msg.read = true;
        }
        return msg;
      });
    }

    await chatRoom.save();
    console.log(`${messagesUpdatedCount} messages marked as read`);
    
    // Calculate new unread count
    const newUnreadCount = chatRoom.messages.filter(
      msg => msg.senderType === SenderType.USER && !msg.read
    ).length;
    
    res.json({ 
      message: 'Messages marked as read',
      messagesUpdated: messagesUpdatedCount,
      unreadCount: newUnreadCount
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark messages as read' });
  }
});

// POST /api/business/chat/create - Create a new chat room
router.post('/chat/create', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    const businessId = req.business?.id;
    console.log('Creating chat room for business:', businessId, 'with user:', userId);

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

// GET /api/business/chat/:chatRoomId/messages - Get raw messages from a chat room
router.get('/chat/:chatRoomId/messages', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const { chatRoomId } = req.params;
    const businessId = req.business?.id;
    console.log('Fetching raw messages for chat room:', chatRoomId);

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    // Try both string and ObjectId queries
    const query = {
      $or: [
        { 
          _id: chatRoomId,
          businessId: businessId
        },
        {
          _id: new mongoose.Types.ObjectId(chatRoomId),
          businessId: new mongoose.Types.ObjectId(businessId)
        }
      ]
    };
    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    const chatRoom = await ChatRoom.findOne(query).lean();
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    console.log('Raw chat room data:', JSON.stringify(chatRoom, null, 2));
    console.log('Messages array:', Array.isArray(chatRoom.messages));
    console.log('Number of messages:', chatRoom.messages?.length || 0);
    console.log('Sample message:', chatRoom.messages?.[0]);

    res.json({
      chatRoomId: chatRoom._id,
      messages: chatRoom.messages || []
    });
  } catch (error: any) {
    console.error('Error fetching raw messages:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
});

export default router; 