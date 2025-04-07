import React, { useState } from 'react';
import { auth } from '../firebase';
import { SenderType } from '../types';

const ChatWindow: React.FC = () => {
  const [currentChatRoom, setCurrentChatRoom] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const handleSendMessage = async () => {
    if (!currentChatRoom || !newMessage.trim()) return;

    try {
      const user = await auth.getCurrentUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      if (typeof user.id === 'undefined') {
        throw new Error('User ID not found');
      }

      const messageData = {
        chatRoomId: currentChatRoom,
        content: newMessage.trim(),
        senderId: user.id.toString(),
        senderType: SenderType.USER
      };

      // Add message to local state first
      const tempMessage = {
        _id: Date.now().toString(),
        ...messageData,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, tempMessage]);

      // Then send through socket
      sendMessage(messageData);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      
      // Retry joining the room if there's a connection issue
      if (!isConnected && currentChatRoom) {
        joinRoom(currentChatRoom);
      }
    }
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default ChatWindow; 