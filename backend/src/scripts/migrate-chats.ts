import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChatRoom from '../models/chat.model';

// Load environment variables
dotenv.config();

async function migrateChats() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.collections();
    console.log('\nCollections in database:');
    for (const collection of collections) {
      console.log(collection.collectionName);
    }

    // Check if old chats collection exists
    const oldChats = await mongoose.connection.db.collection('chats').find({}).toArray();
    console.log('\nFound old chats:', oldChats.length);

    if (oldChats.length > 0) {
      // Migrate each chat to new format
      for (const chat of oldChats) {
        const chatRoom = new ChatRoom({
          businessId: new mongoose.Types.ObjectId(chat.businessId),
          userId: new mongoose.Types.ObjectId(chat.userId),
          messages: chat.messages.map((msg: any) => ({
            content: msg.content,
            senderId: new mongoose.Types.ObjectId(msg.senderId),
            senderType: msg.senderType,
            chatRoomId: new mongoose.Types.ObjectId(msg.chatRoomId),
            read: msg.read || false,
            createdAt: msg.createdAt || new Date(),
            updatedAt: msg.updatedAt || new Date()
          }))
        });

        await chatRoom.save();
        console.log('Migrated chat room:', chatRoom._id);
      }

      console.log('\nMigration completed successfully');
    } else {
      console.log('\nNo old chats found to migrate');
    }

    // Check the new chatrooms collection
    const newChatRooms = await ChatRoom.find({}).lean();
    console.log('\nNew chat rooms:', JSON.stringify(newChatRooms, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

migrateChats(); 