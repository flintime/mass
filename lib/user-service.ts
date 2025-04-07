import mongoose from 'mongoose';
import { ChatRoom } from '@/models/chat';

/**
 * Retrieves user details based on a chat room ID
 * @param chatRoomId The ID of the chat room
 * @returns User details or null if not found
 */
export async function getUserDetailsByChat(chatRoomId: string): Promise<{
  _id: string;
  name: string;
  email?: string;
  phone?: string;
} | null> {
  try {
    // Ensure mongoose connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }
    
    // Find the chat room to get the user ID
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom || !chatRoom.userId) {
      console.log(`Chat room not found or missing user ID: ${chatRoomId}`);
      return null;
    }
    
    // Find the user details - use mongoose.models to avoid import issues
    const User = mongoose.models.User;
    if (!User) {
      console.log('User model not available');
      return null;
    }
    
    const user = await User.findById(chatRoom.userId).select('name email phoneNumber');
    if (!user) {
      console.log(`User not found for ID: ${chatRoom.userId}`);
      return null;
    }
    
    return {
      _id: user._id.toString(),
      name: user.name || 'User',
      email: user.email,
      phone: user.phoneNumber
    };
  } catch (error) {
    console.error('Error retrieving user details from chat room:', error);
    return null;
  }
} 