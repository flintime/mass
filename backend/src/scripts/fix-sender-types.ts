import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChatRoom from '../models/chat.model';
import { SenderType } from '../types';

// Load environment variables
dotenv.config();

async function fixSenderTypes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find all chat rooms
    const chatRooms = await ChatRoom.find({});
    console.log(`Found ${chatRooms.length} chat rooms`);

    let totalFixed = 0;

    // Process each chat room
    for (const chatRoom of chatRooms) {
      let hasChanges = false;

      // Fix messages in the room
      chatRoom.messages = chatRoom.messages.map(message => {
        const currentType = message.senderType.toString().toUpperCase();
        if (currentType === 'USER' && message.senderType !== SenderType.USER) {
          hasChanges = true;
          return {
            ...message,
            senderType: SenderType.USER
          };
        }
        if (currentType === 'BUSINESS' && message.senderType !== SenderType.BUSINESS) {
          hasChanges = true;
          return {
            ...message,
            senderType: SenderType.BUSINESS
          };
        }
        return message;
      });

      // Save if changes were made
      if (hasChanges) {
        await chatRoom.save();
        totalFixed += chatRoom.messages.length;
        console.log(`Fixed messages in chat room ${chatRoom._id}`);
      }
    }

    console.log(`Fixed ${totalFixed} messages with incorrect senderType values`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing sender types:', error);
    process.exit(1);
  }
}

// Run the script
fixSenderTypes(); 