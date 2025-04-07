import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import ChatRoom from './models/chat.model';
import { SenderType } from './types';
import jwt from 'jsonwebtoken';
// Import local vector store initialization
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize vector store
(async () => {
  try {
    console.log('Initializing local vector store...');
    // Dynamic import for the vector store module
    const localVectorStorePath = path.join(process.cwd(), '..', 'app', 'lib', 'local-vector-store');
    const { initVectorStore } = await import(localVectorStorePath);
    await initVectorStore();
    console.log('Local vector store initialized successfully');
  } catch (error) {
    console.error('Error initializing local vector store:', error);
  }
})();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Socket.IO setup with auth middleware
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'https://flintime.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8, // 100 MB
  allowEIO3: true
});

// Socket authentication middleware with enhanced logging
io.use(async (socket, next) => {
  try {
    console.log('Socket authentication attempt:', {
      id: socket.id,
      handshake: {
        auth: socket.handshake.auth,
        query: socket.handshake.query
      }
    });

    const token = socket.handshake.auth.token;
    const type = socket.handshake.auth.type;
    if (!token) {
      console.log('Authentication failed: No token provided');
      return next(new Error('Authentication token missing'));
    }

    // Verify token and get the appropriate ID based on the token type
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId?: string; businessId?: string; type?: string };
    console.log('Token verified:', { type, decoded });
    
    if (type === 'business') {
      const businessId = decoded.businessId;
      if (!businessId) {
        console.log('Authentication failed: Invalid business token');
        return next(new Error('Invalid business token'));
      }
      socket.data.businessId = businessId;
      socket.data.userId = businessId; // Keep for backward compatibility
      socket.data.type = 'business';
    } else {
      const userId = decoded.userId;
      if (!userId) {
        console.log('Authentication failed: Invalid user token');
        return next(new Error('Invalid user token'));
      }
      socket.data.userId = userId;
      socket.data.type = 'user';
    }

    console.log('Socket authenticated successfully:', {
      socketId: socket.id,
      userId: socket.data.userId,
      type: socket.data.type
    });

    next();
  } catch (error) {
    console.error('Socket authentication error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    if (error instanceof Error) {
      next(new Error(`Authentication failed: ${error.message}`));
    } else {
      next(new Error('Authentication failed'));
    }
  }
});

// Middleware
app.use(cors({
  origin: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', 
    'https://flintime.com',
    /\.digitaloceanspaces\.com$/
  ],
  credentials: true
}));
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'User ID:', socket.data.userId, 'Type:', socket.data.type);

  // Join a chat room
  socket.on('join_room', (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Leave a chat room
  socket.on('leave_room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  // Handle new messages
  socket.on('send_message', async (data: {
    chatRoomId: string;
    content: string;
    senderId: string;
    senderType: SenderType;
    isAI?: boolean;
    image?: {
      url: string;
      type: string;
      size: number;
    };
  }) => {
    try {
      const { chatRoomId, content, senderId, senderType, isAI, image } = data;
      console.log('Received message with full details:', { 
        chatRoomId, 
        content: content.substring(0, 50) + '...', 
        senderId, 
        senderType, 
        isAI,
        hasImage: !!image,
        socketType: socket.data.type
      });
      console.log('Socket user data:', { 
        userId: socket.data.userId, 
        businessId: socket.data.businessId,
        type: socket.data.type 
      });
      
      // Verify sender type matches socket type
      const expectedSenderType = socket.data.type === 'business' ? SenderType.BUSINESS : SenderType.USER;
      if (senderType !== expectedSenderType && !isAI) {
        console.error('Invalid sender type:', {
          socketType: socket.data.type,
          senderType,
          isAI
        });
        throw new Error('Invalid sender type for socket user');
      }

      // For AI messages, allow user socket to send with business sender ID
      if (isAI && socket.data.type === 'user') {
        // Skip sender ID validation for AI messages
        console.log('AI message validation passed:', {
          socketType: socket.data.type,
          senderType,
          isAI
        });
      } else {
        // Verify sender matches socket user based on type
        const socketId = socket.data.type === 'business' ? socket.data.businessId : socket.data.userId;
        console.log('Comparing IDs:', {
          socketId: socketId?.toString(),
          senderId: senderId?.toString(),
          type: socket.data.type
        });
        
        if (!socketId || senderId?.toString() !== socketId?.toString()) {
          console.error('Unauthorized message attempt:', {
            socketId: socketId?.toString(),
            senderId: senderId?.toString(),
            socketType: socket.data.type,
            messageType: senderType
          });
          throw new Error('Unauthorized: Sender ID does not match socket user');
        }
      }

      // Save message to database
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) {
        console.error('Chat room not found:', chatRoomId);
        throw new Error('Chat room not found');
      }
      console.log('Found chat room:', {
        id: chatRoom._id.toString(),
        businessId: chatRoom.businessId.toString(),
        userId: chatRoom.userId.toString(),
        messageCount: chatRoom.messages.length
      });

      // Create message with correct sender type for AI messages and include image
      const message = {
        _id: new mongoose.Types.ObjectId(),
        content,
        senderId,
        senderType: isAI ? SenderType.BUSINESS : expectedSenderType,
        chatRoomId: chatRoom._id.toString(),
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAI: isAI || false,
        image: image || undefined,
        businessDetails: isAI ? await fetchBusinessDetails(senderId) : undefined
      };

      console.log('Created message object:', {
        messageId: message._id.toString(),
        senderType: message.senderType,
        isAI: message.isAI,
        senderId: message.senderId,
        hasImage: !!message.image,
        hasBusinessDetails: !!message.businessDetails
      });

      // Add message to chat room
      chatRoom.messages.push(message);
      try {
        await chatRoom.save();
        console.log('Message saved to database with details:', {
          messageId: message._id.toString(),
          chatRoomId: chatRoom._id.toString(),
          messageCount: chatRoom.messages.length,
          lastMessage: {
            senderType: chatRoom.messages[chatRoom.messages.length - 1].senderType,
            isAI: chatRoom.messages[chatRoom.messages.length - 1].isAI
          }
        });

        // Broadcast message to room
        const broadcastMessage = {
          ...message,
          _id: message._id.toString(),
          chatRoomId: message.chatRoomId.toString(),
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
          isAI: message.isAI
        };

        console.log('Broadcasting message with details:', {
          messageId: broadcastMessage._id,
          senderType: broadcastMessage.senderType,
          isAI: broadcastMessage.isAI
        });

        io.to(chatRoomId).emit('receive_message', broadcastMessage);
        console.log('Message broadcast to room:', chatRoomId);

        // Send confirmation back to sender
        socket.emit('message_sent', {
          messageId: message._id.toString(),
          chatRoomId: chatRoomId
        });
      } catch (saveError) {
        console.error('Error saving message to database:', saveError);
        
        // Try an alternative approach using updateOne
        try {
          console.log('Attempting alternative save method with updateOne');
          const updateResult = await ChatRoom.updateOne(
            { _id: chatRoom._id },
            { 
              $push: { messages: message },
              $set: { lastActivity: new Date() }
            }
          );
          
          console.log('Alternative save method result:', updateResult);
          
          if (updateResult.modifiedCount > 0) {
            // Broadcast message to room
            const broadcastMessage = {
              ...message,
              _id: message._id.toString(),
              chatRoomId: message.chatRoomId.toString(),
              createdAt: message.createdAt.toISOString(),
              updatedAt: message.updatedAt.toISOString(),
              isAI: message.isAI
            };

            io.to(chatRoomId).emit('receive_message', broadcastMessage);
            
            // Send confirmation back to sender
            socket.emit('message_sent', {
              messageId: message._id.toString(),
              chatRoomId: chatRoomId
            });
          } else {
            throw new Error('Failed to save message using alternative method');
          }
        } catch (alternativeSaveError) {
          console.error('Alternative save method also failed:', alternativeSaveError);
          socket.emit('message_error', { 
            error: 'Failed to save message to database. Please try again.' 
          });
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('message_error', { error: error instanceof Error ? error.message : 'Failed to send message' });
    }
  });

  // Handle typing status
  socket.on('typing', (data: { chatRoomId: string; userId: string }) => {
    if (data.userId === socket.data.userId.toString()) {
      socket.to(data.chatRoomId).emit('user_typing', data);
    }
  });

  // Handle stop typing status
  socket.on('stop_typing', (data: { chatRoomId: string; userId: string }) => {
    if (data.userId === socket.data.userId.toString()) {
      socket.to(data.chatRoomId).emit('user_stop_typing', data);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
import authRoutes from './routes/auth.routes';
import businessAuthRoutes from './routes/business-auth.routes';
import businessSettingsRoutes from './routes/business-settings.routes';
import businessReviewsRoutes from './routes/business-reviews.routes';
import businessChatRoutes from './routes/business-chat.routes';
import reviewsRoutes from './routes/reviews.routes';

// Health check endpoint for DO App Platform
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'backend'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/business', businessAuthRoutes);
app.use('/api/business', businessChatRoutes);
app.use('/api/business/settings', businessSettingsRoutes);
app.use('/api/business/reviews', businessReviewsRoutes);
app.use('/api/reviews', reviewsRoutes);

// Database connection
if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit if we can't connect to the database
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add the fetchBusinessDetails function
const fetchBusinessDetails = async (businessId: string) => {
  try {
    const business = await mongoose.model('Business').findById(businessId);
    if (!business) return undefined;
    
    return {
      name: business.business_name,
      description: business.description,
      category: business.category,
      services: business.services,
      location: {
        address: business.address,
        city: business.city,
        state: business.state,
        zip_code: business.zip_code
      },
      phone: business.phone,
      email: business.email,
      website: business.Website,
      hours: business.business_hours,
      features: business.business_features
    };
  } catch (error) {
    console.error('Error fetching business details:', error);
    return undefined;
  }
}; 