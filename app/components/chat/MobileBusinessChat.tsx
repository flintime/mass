'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Send, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MobileBusinessChatProps {
  businessId?: string;
  onClose?: () => void;
}

export default function MobileBusinessChat({ businessId, onClose }: MobileBusinessChatProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Check if screen size is mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // If not mobile, redirect to desktop chat
  useEffect(() => {
    if (!isMobile && selectedRoomId) {
      router.push(`/chat?roomId=${selectedRoomId}`);
    }
  }, [isMobile, selectedRoomId, router]);
  
  // Fetch chat rooms
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/chat/rooms');
        if (!response.ok) throw new Error('Failed to fetch chat rooms');
        const data = await response.json();
        setChatRooms(data.rooms || []);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchChatRooms();
    }
  }, [user]);
  
  // Fetch messages for selected room
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedRoomId) return;
      
      try {
        const response = await fetch(`/api/chat/rooms/${selectedRoomId}`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Scroll to bottom
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    fetchMessages();
  }, [selectedRoomId]);
  
  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedRoomId) return;
    
    try {
      const response = await fetch(`/api/chat/rooms/${selectedRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      // Optimistically update messages
      setMessages(prev => [
        ...prev, 
        {
          _id: Date.now().toString(),
          content: newMessage,
          senderType: 'USER',
          senderId: user?.id,
          createdAt: new Date().toISOString(),
          read: false
        }
      ]);
      
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Handle selecting a chat room
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowChatList(false);
  };
  
  // Handle back button
  const handleBack = () => {
    if (!showChatList) {
      setShowChatList(true);
      setSelectedRoomId(null);
    } else if (onClose) {
      onClose();
    } else {
      router.push('/');
    }
  };
  
  // Format message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 mr-2" 
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {showChatList ? (
          <h1 className="font-semibold text-lg">Messages</h1>
        ) : (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-3">
              <AvatarImage src="" alt="Business" />
              <AvatarFallback>
                {chatRooms.find(room => room._id === selectedRoomId)?.business?.business_name?.charAt(0) || 'B'}
              </AvatarFallback>
            </Avatar>
            <h1 className="font-semibold text-lg truncate">
              {chatRooms.find(room => room._id === selectedRoomId)?.business?.business_name || 'Business'}
            </h1>
          </div>
        )}
      </header>
      
      {/* Chat List */}
      <div className={cn(
        "flex-1 flex flex-col transition-transform duration-300 overflow-hidden",
        showChatList ? "translate-x-0" : "-translate-x-full absolute inset-0 opacity-0 pointer-events-none"
      )}>
        {/* Search Bar */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
            <Input
              placeholder="Search conversations"
              className="pl-9 h-10 bg-gray-50 border-none rounded-full"
            />
          </div>
        </div>
        
        {/* Rooms List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading conversations...</div>
          ) : chatRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 h-full">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No conversations yet</p>
              <p className="text-gray-500 text-sm mt-1">Your messages will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {chatRooms.map(room => (
                <div 
                  key={room._id} 
                  className="p-4 flex items-center hover:bg-gray-50 active:bg-gray-100"
                  onClick={() => handleSelectRoom(room._id)}
                >
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage 
                      src={room.business?.images?.[0]?.url || ''} 
                      alt={room.business?.business_name || 'Business'} 
                    />
                    <AvatarFallback>
                      {room.business?.business_name?.charAt(0) || 'B'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <h3 className="font-medium truncate">{room.business?.business_name || 'Business'}</h3>
                      {room.lastMessage?.createdAt && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatMessageTime(room.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {room.lastMessage && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {room.lastMessage.senderType === 'USER' ? 'You: ' : ''}
                        {room.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Chat View */}
      <div className={cn(
        "flex-1 flex flex-col transition-transform duration-300 overflow-hidden",
        !showChatList ? "translate-x-0" : "translate-x-full absolute inset-0 opacity-0 pointer-events-none"
      )}>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No messages yet</p>
              <p className="text-gray-500 text-sm mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map(message => (
              <div 
                key={message._id}
                className={cn(
                  "flex",
                  message.senderType === 'USER' ? "justify-end" : "justify-start"
                )}
              >
                <div 
                  className={cn(
                    "max-w-[80%] p-3 rounded-lg",
                    message.senderType === 'USER' 
                      ? "bg-blue-500 text-white rounded-br-none" 
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  )}
                >
                  <p>{message.content}</p>
                  <div className={cn(
                    "text-xs mt-1",
                    message.senderType === 'USER' ? "text-blue-100" : "text-gray-500"
                  )}>
                    {formatMessageTime(message.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Message Input */}
        <form 
          onSubmit={handleSendMessage}
          className="border-t p-3 flex items-center bg-white"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 mr-2"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newMessage.trim()}
            className={cn(
              "h-10 w-10",
              !newMessage.trim() && "opacity-50"
            )}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
} 