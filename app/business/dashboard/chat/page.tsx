'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  AlertCircle, 
  MessageSquare, 
  X, 
  ImageIcon, 
  Bot, 
  Search, 
  MoreVertical, 
  Phone, 
  Calendar, 
  Info, 
  Clock, 
  CheckCheck, 
  Loader2,
  ArrowLeft,
  Bell,
  Camera,
  Check,
  Filter,
  Plus,
  RefreshCcw,
  Volume2
} from "lucide-react";
import { businessAuth, BusinessUser } from '@/lib/businessAuth';
import { ChatStatus, SenderType } from '@/lib/types';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSocket, SocketProvider } from '@/lib/socket';
import type { ChatMessage, ChatList } from '@/lib/businessAuth';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useToast } from "@/components/ui/use-toast";
import { ImagePreviewDialog } from "@/components/ui/image-preview-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, isToday, isYesterday } from 'date-fns';
import './message-animations.css'; // Import the CSS animations
import { fetchCsrfToken } from '@/lib/client/csrf';

interface ChatRoom {
  _id: string;
  userId: string;
  businessId: string;
  status: ChatStatus;
  createdAt: string;
  updatedAt: string;
}

interface SendMessageResponse {
  success: boolean;
  message?: string;
}

interface ImageData {
  url: string;
  type: string;
  size: number;
}

interface Business {
  _id: string;
  isAIEnabled?: boolean;
}

// Add these styles at the top of the file
const refreshButtonAnimation = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.refresh-spin {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
.badge-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

.unread-badge {
  animation: pulse 1.5s ease-in-out infinite;
}
`;

export default function BusinessChat() {
  return (
    <SocketProvider type="business">
      <BusinessChatContent />
    </SocketProvider>
  );
}

function BusinessChatContent(): JSX.Element {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingStatusTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  const chatListRef = useRef<ChatList>({});
  const messageObserverRef = useRef<IntersectionObserver | null>(null);
  const visibleMessagesRef = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const scrollToEnd = () => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        };
        
        scrollToEnd();
        
        setTimeout(scrollToEnd, 10);
      }
    }
  }, []);

  const handleImageLoad = useCallback(() => {
    requestAnimationFrame(scrollToBottom);
  }, [scrollToBottom]);

  const [chatList, setChatList] = useState<ChatList>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState<{[key: string]: boolean}>({});
  const { socket, isConnected, joinRoom, leaveRoom, sendMessage, setTypingStatus, onMessage } = useSocket();

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const lastMessageTimeRef = useRef<{[key: string]: number}>({});

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  // Add a new state for refresh loading
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    chatListRef.current = chatList;
  }, [chatList]);

  const getMessageKey = (msg: ChatMessage) => {
    if (msg._id.startsWith('temp_')) {
      return msg._id;
    }
    if (msg.image?.url) {
      return `${msg.image.url}-${msg.senderId}-${msg.createdAt}`;
    }
    return `${msg.content}-${msg.senderId}-${msg.createdAt}`;
  };

  const mergeAndSortMessages = (existingMessages: ChatMessage[], newMessages: ChatMessage[]) => {
    const messageMap = new Map<string, ChatMessage>();
    
    existingMessages.forEach(msg => {
      const key = getMessageKey(msg);
      if (!msg._id.startsWith('temp_') || !messageMap.has(key)) {
        messageMap.set(key, msg);
      }
    });

    newMessages.forEach(msg => {
      const key = getMessageKey(msg);
      if (!msg._id.startsWith('temp_')) {
        const tempKey = Array.from(messageMap.keys()).find(k => 
          k.startsWith('temp_') && 
          messageMap.get(k)?.content === msg.content &&
          messageMap.get(k)?.senderId === msg.senderId
        );
        if (tempKey) {
          messageMap.delete(tempKey);
        }
        messageMap.set(key, msg);
      } else if (!messageMap.has(key)) {
        messageMap.set(key, msg);
      }
    });

    return Array.from(messageMap.values()).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  const handleMessage = (message: ChatMessage) => {
    console.log('Received message:', message);
    setLoading(false);
    
    lastMessageTimeRef.current[message.chatRoomId] = Date.now();
    
    setChatList(prev => {
      const chatRoom = prev[message.chatRoomId];
      if (!chatRoom) {
        console.log('Chat room not found:', message.chatRoomId);
        return prev;
      }

      const updatedMessages = mergeAndSortMessages(chatRoom.messages, [message]);

      // If this is an AI message, mark all previous user messages as read
      if (message.senderType === SenderType.BUSINESS && message.isAI) {
        // Mark all user messages as read in this chat
        setTimeout(() => {
          markChatMessagesAsRead(message.chatRoomId);
          
          // Also mark the AI message as having read the user's messages
          // This helps with debugging and tracking which AI responses
          // were generated for which user messages
          const userMessages = chatRoom.messages.filter(
            msg => msg.senderType === SenderType.USER && !msg.read
          );
          
          if (userMessages.length > 0) {
            console.log(`AI response received - marking ${userMessages.length} user messages as read`);
          }
        }, 500);
      }

      // Increment unread count for user messages when chat is not selected
      let unreadCount = chatRoom.unreadCount || 0;
      if (message.senderType === SenderType.USER && 
          !message.read && 
          selectedChat !== message.chatRoomId) {
        unreadCount += 1;
      }

      const newChatList = {
        ...prev,
        [message.chatRoomId]: {
          ...chatRoom,
          messages: updatedMessages,
          unreadCount
        }
      };

      if (message.chatRoomId === selectedChat) {
        requestAnimationFrame(scrollToBottom);
        
        // If this is the selected chat and a user message, mark it as read
        if (message.senderType === SenderType.USER && !message.read) {
          setTimeout(() => {
            markChatMessagesAsRead(message.chatRoomId);
          }, 500);
        }
      }

      return newChatList;
    });
    
    // If message is from a user, refresh the chat list to ensure all chats are up to date
    if (message.senderType === SenderType.USER) {
      // Refresh the entire chat list after a brief delay to ensure all state updates are processed
      setTimeout(async () => {
        try {
          console.log('Refreshing chat list after receiving user message');
          const updatedChatList = await businessAuth.getChats();
          
          // Merge with existing chat list to preserve local state of selected chat
          setChatList(prevChatList => {
            const mergedChatList = { ...updatedChatList };
            
            // Preserve messages for the selected chat
            if (selectedChat && prevChatList[selectedChat]) {
              mergedChatList[selectedChat] = {
                ...mergedChatList[selectedChat],
                messages: prevChatList[selectedChat].messages,
              };
            }
            
            return mergedChatList;
          });
        } catch (error) {
          console.error('Error refreshing chat list after message:', error);
        }
      }, 1000);
    }
  };

  useEffect(() => {
    // Initial load with delay to ensure authentication is initialized
    const timer = setTimeout(() => {
      loadChats();
    }, 500); // Short delay to ensure authentication is processed
    
    return () => clearTimeout(timer);
  }, []);

  // Add polling for chat list updates
  useEffect(() => {
    let isActive = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const pollChatList = async () => {
      if (!isActive) return;
      
      try {
        console.log('Polling chat list for updates...');
        // Fetch the latest chat list
        const updatedChatList = await businessAuth.getChats();
        
        if (!updatedChatList || !isActive) return;
        
        // Merge with existing chat list to preserve local state where needed
        setChatList(prevChatList => {
          const mergedChatList = { ...updatedChatList };
          
          // For each chat in the updated list, preserve selected chat's local messages state
          // but update the unread counts and last message
          Object.keys(mergedChatList).forEach(chatId => {
            if (prevChatList[chatId] && chatId === selectedChat) {
              // Keep existing messages for the selected chat to avoid UI flicker
              // but update the unread count
              mergedChatList[chatId] = {
                ...mergedChatList[chatId],
                messages: prevChatList[chatId].messages,
              };
            }
          });
          
          return mergedChatList;
        });
        
      } catch (error) {
        console.error('Error polling chat list:', error);
      }
    };

    // Set up interval for polling (every 10 seconds)
    pollInterval = setInterval(pollChatList, 10000);

    // Poll when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollChatList();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedChat, businessAuth]);

  useEffect(() => {
    if (socket && isConnected) {
      console.log('Setting up message handlers');
      socket.off('receive_message');
      socket.on('receive_message', handleMessage);
    }

    return () => {
      if (socket) {
        console.log('Cleaning up message handlers');
        socket.off('receive_message');
      }
    };
  }, [socket, isConnected, selectedChat, scrollToBottom]);

  const fetchLatestMessages = async (chatRoomId: string) => {
    try {
      const allChats = await businessAuth.getChats();
      console.log('Fetched chats with images:', allChats?.[chatRoomId]?.messages.filter(m => m.image));
      
      if (allChats && allChats[chatRoomId]) {
        setChatList(prev => {
          const existingChat = prev[chatRoomId];
          if (!existingChat) return prev;

          const mergedMessages = mergeAndSortMessages(
            existingChat.messages,
            allChats[chatRoomId].messages
          );

          console.log('Merged messages with images:', mergedMessages.filter(m => m.image));

          if (mergedMessages.length > existingChat.messages.length) {
            console.log('New messages found from polling');
            return {
              ...prev,
              [chatRoomId]: {
                ...allChats[chatRoomId],
                messages: mergedMessages
              }
            };
          }
          return prev;
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching latest messages:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedChat) return;

    let isActive = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const pollMessages = async () => {
      if (!isActive) return;
      await fetchLatestMessages(selectedChat);
    };

    pollMessages();

    pollInterval = setInterval(pollMessages, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedChat]);

  useEffect(() => {
    if (!socket) {
      console.log('No socket connection');
      return;
    }

    const handleConnect = () => {
      console.log('Socket connected (Business)');
      setError(null); // Clear any connection errors
      Object.keys(chatListRef.current).forEach(roomId => {
        console.log('Business joining room:', roomId);
        joinRoom(roomId);
      });
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected (Business)');
    };

    const handleError = (error: Error) => {
      console.error('Socket error (Business):', error);
      toast({
        title: "Connection Issue",
        description: "Having trouble connecting to the chat service. Will retry automatically.",
        variant: "destructive",
      });
      setError('Connection error. Messages will be saved locally and sent when connection is restored.');
    };

    const handleReconnect = () => {
      console.log('Socket reconnected (Business)');
      setError(null);
      toast({
        title: "Reconnected",
        description: "Chat connection restored.",
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, joinRoom, toast]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    Object.keys(chatList).forEach(roomId => {
      joinRoom(roomId);
    });

    return () => {
      Object.keys(chatList).forEach(roomId => {
        leaveRoom(roomId);
      });
    };
  }, [socket, isConnected, chatList, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data: { userId: string, chatRoomId: string }) => {
      setIsTyping(prev => ({
        ...prev,
        [data.userId]: true
      }));

      // Clear any existing timeout for this user
      if (typingStatusTimeoutRef.current[data.userId]) {
        clearTimeout(typingStatusTimeoutRef.current[data.userId]);
      }

      // Set a timeout to clear the typing status after 3 seconds
      typingStatusTimeoutRef.current[data.userId] = setTimeout(() => {
        setIsTyping(prev => ({
          ...prev,
          [data.userId]: false
        }));
      }, 3000);
    };

    const handleStopTyping = (data: { userId: string, chatRoomId: string }) => {
      // Clear any existing timeout
      if (typingStatusTimeoutRef.current[data.userId]) {
        clearTimeout(typingStatusTimeoutRef.current[data.userId]);
      }

      setIsTyping(prev => ({
        ...prev,
        [data.userId]: false
      }));
    };

    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      
      // Clear all typing timeouts
      Object.values(typingStatusTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [socket]);

  const loadChats = async (retryCount = 0) => {
    try {
      setError(null);
      setLoading(true);
      
      // First check if the global auth initialized flag is set
      const authInitialized = typeof window !== 'undefined' && window.businessAuthInitialized;
      
      // Check if there's a token with more extensive logging
      const token = businessAuth.getToken();
      console.log('Chat page - Auth status:', {
        initialized: authInitialized,
        tokenAvailable: !!token,
        tokenLength: token ? token.length : 0,
        retryAttempt: retryCount
      });
      
      // If no token is found, handle retry logic
      if (!token) {
        if (retryCount < 3) {
          console.log(`No token found, retrying (attempt ${retryCount + 1}) in 1 second...`);
          // Wait for a moment before retrying
          setTimeout(() => loadChats(retryCount + 1), 1000);
          return;
        }
        
        // After max retries, try to recover by redirecting to signin
        console.log('Max retries reached, redirecting to signin page');
        window.location.href = '/business/signin?redirect=' + encodeURIComponent(window.location.pathname);
        throw new Error('No authentication token found after multiple attempts');
      }

      // Get business user with retry if needed
      let business = null;
      try {
        business = await businessAuth.getCurrentUser();
        console.log('Business user retrieved successfully:', !!business);
      } catch (userError) {
        console.error('Error getting current business user:', userError);
        
        if (retryCount < 3) {
          console.log(`Failed to get business user, retrying (attempt ${retryCount + 1}) in 1 second...`);
          setTimeout(() => loadChats(retryCount + 1), 1000);
          return;
        }
        throw userError;
      }
      
      if (!business) {
        console.error('Business user data is empty or invalid');
        throw new Error('Not authenticated as a business');
      }

      console.log('Successfully authenticated, fetching chats...');
      const data = await businessAuth.getChats();
      console.log('Loaded chats:', Object.keys(data).length);
      setChatList(data);

      if (selectedChat) {
        fetchLatestMessages(selectedChat);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chats');
      
      // If it's an authentication error, redirect to sign in
      if (error instanceof Error && 
          (error.message.includes('No authentication token found') || 
           error.message.includes('Not authenticated'))) {
        console.log('Authentication error detected, redirecting to sign in page');
        window.location.href = '/business/signin?redirect=' + encodeURIComponent(window.location.pathname);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        setError(`File ${file.name} must be a valid image file (JPEG, PNG, or WebP)`);
        return false;
      }

      if (file.size > maxSize) {
        setError(`File ${file.name} must be less than 5MB`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Create data URLs for previews
    const newPreviews = await Promise.all(
      validFiles.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      }))
    );
    
    setSelectedImages(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const clearSelectedImages = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (files: File[]): Promise<{ url: string; type: string; size: number; }[]> => {
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        try {
          const token = businessAuth.getToken();
          if (!token) {
            throw new Error('Not authenticated');
          }

          const formData = new FormData();
          formData.append('image', file);
          formData.append('type', 'chat'); // Add type parameter to indicate this is a chat image

          // Use chat-specific upload endpoint
          const response = await fetch('/api/chat/upload-image', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!response.ok) {
            if (response.status === 404) {
              console.warn('API endpoint for chat image upload does not exist yet.');
              // Return a temporary local URL for preview
              return {
                url: URL.createObjectURL(file),
                type: file.type,
                size: file.size
              };
            }
            throw new Error(`Failed to upload image: ${response.status}`);
          }

          const data = await response.json();
          return {
            url: data.url,
            type: file.type,
            size: file.size
          };
        } catch (error) {
          console.error('Error uploading image:', error);
          // Provide a fallback for the UI with a local object URL
          return {
            url: URL.createObjectURL(file),
            type: file.type,
            size: file.size
          };
        }
      })
    );

    return uploadedImages;
  };

  // Add a function to mark all messages in a chat as read
  const markChatMessagesAsRead = async (chatRoomId: string) => {
    try {
      // Get the auth token first
      const token = businessAuth.getToken();
      if (!token) {
        console.error('Not authenticated - cannot mark messages as read');
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please log in again to update message status",
        });
        return;
      }

      // Get the set of visible messages from the IntersectionObserver
      const visibleMessages = Array.from(visibleMessagesRef.current);
      console.log('Visible messages IDs:', visibleMessages);
      
      // Count unread user messages in this chat
      const chatRoom = chatList[chatRoomId];
      if (!chatRoom) {
        console.error('Chat room not found:', chatRoomId);
        return;
      }
      
      const unreadUserMessages = chatRoom.messages.filter(
        msg => msg.senderType === SenderType.USER && !msg.read
      );
      
      console.log(`Found ${unreadUserMessages.length} unread user messages in chat ${chatRoomId}`);
      
      // Only mark visible unread messages as read
      const visibleUnreadMessageIds = unreadUserMessages
        .filter(msg => visibleMessages.includes(msg._id))
        .map(msg => msg._id);
      
      console.log(`Of those, ${visibleUnreadMessageIds.length} are currently visible`);
      
      if (visibleUnreadMessageIds.length === 0) {
        console.log('No visible unread messages to mark as read');
        return;
      }

      // Update local state to mark only visible messages as read
      setChatList(prev => {
        const chatRoom = prev[chatRoomId];
        if (!chatRoom) return prev;

        const updatedMessages = chatRoom.messages.map(msg => {
          if (msg.senderType === SenderType.USER && 
              !msg.read && 
              visibleUnreadMessageIds.includes(msg._id)) {
            return { ...msg, read: true };
          }
          return msg;
        });

        // Calculate new unread count after marking visible messages as read
        const newUnreadCount = updatedMessages.filter(
          msg => msg.senderType === SenderType.USER && !msg.read
        ).length;

        return {
          ...prev,
          [chatRoomId]: {
            ...chatRoom,
            messages: updatedMessages,
            unreadCount: newUnreadCount
          }
        };
      });

      // Call the API to update message read status in the database
      console.log('Calling API to mark messages as read:', visibleUnreadMessageIds);
      const response = await fetch(`/api/chat/mark-as-read/${chatRoomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageIds: visibleUnreadMessageIds
        })
      });

      if (!response.ok) {
        console.error('Error marking messages as read:', response.status);
        throw new Error('Failed to mark messages as read');
      }

      const result = await response.json();
      console.log('API response for marking messages as read:', result);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark messages as read",
      });
    }
  };

  // Move state management into MessageInputArea to prevent parent re-renders
  const MessageInputArea = memo(() => {
    // Local state - isolated from parent
    const [localMessage, setLocalMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const localInputRef = useRef<HTMLInputElement>(null);
    
    // Focus the input when component mounts or chat changes
    useEffect(() => {
      if (localInputRef.current) {
        localInputRef.current.focus();
      }
    }, [selectedChat]);
    
    // Local message change handler that doesn't affect parent
    const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalMessage(e.target.value);
      
      // Handle typing status
      if (selectedChat && isConnected) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        } else {
          setTypingStatus(selectedChat, true);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          if (selectedChat && isConnected) {
            setTypingStatus(selectedChat, false);
            typingTimeoutRef.current = null;
          }
        }, 2000);
      }
    };
    
    // Local send handler with immediate UI update
    const handleLocalSend = async () => {
      if (!localMessage.trim() && selectedImages.length === 0) return;
      if (isSending) return; // Prevent double-sends
      
      // Get message content and clear input immediately for better UX
      const messageToSend = localMessage.trim();
      setLocalMessage('');
      setIsSending(true);
      
      // Maintain focus immediately
      if (localInputRef.current) {
        localInputRef.current.focus();
      }
      
      try {
        // Pass the message to parent's handler
        await handleSendMessage(messageToSend);
      } finally {
        // Always mark sending as complete
        setIsSending(false);
      }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleLocalSend();
      }
    };
    
    return (
      <div className="p-2 sm:p-4 border-t bg-white">
        {imagePreviews.length > 0 && (
          <div className="mb-3 sm:mb-4 relative">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                  <img
                    src={preview}
                    alt={`Selected ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {imagePreviews.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearSelectedImages}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-2 text-xs"
              >
                Clear all images
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0"
          >
            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            multiple
          />
          <Input
            ref={localInputRef}
            value={localMessage}
            onChange={handleLocalChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 h-9 sm:h-10 bg-gray-50 border-gray-200 focus-visible:ring-violet-500"
            disabled={isSending}
          />
          
          <Button 
            onClick={handleLocalSend}
            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white shrink-0 transition-all shadow-sm h-9 sm:h-10 px-3 sm:px-4"
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </div>
      </div>
    );
  });
  MessageInputArea.displayName = 'MessageInputArea';

  // Update handleSendMessage to accept message content as a parameter
  const handleSendMessage = useCallback(async (messageContent = '') => {
    if (!selectedChat) return;
    
    // If no message content is provided, use the parent state (for backward compatibility)
    const contentToSend = messageContent || newMessage.trim();
    if (!contentToSend && selectedImages.length === 0) return;

    try {
      const tempId = `temp_${Date.now()}`;
      const business = await businessAuth.getCurrentUser();
      
      if (!business?._id) {
        throw new Error('Business not found');
      }

      // Clear the input field immediately (though this should be handled by child component now)
      setNewMessage('');
      
      const imagesToUpload = [...selectedImages];
      clearSelectedImages();

      // Mark all unread messages in this chat as read
      await markChatMessagesAsRead(selectedChat);

      // Optimistically add text message to UI immediately
      if (contentToSend) {
        // Create optimistic message with read:false to match backend behavior
        // Business messages start as unread until the user reads them
        const optimisticTextMessage: ChatMessage = {
          _id: tempId,
          chatRoomId: selectedChat,
          content: contentToSend,
          senderId: business._id.toString(),
          senderType: SenderType.BUSINESS,
          isAI: false,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Add message to UI immediately using a more direct approach
        setChatList(prev => {
          const chatRoom = prev[selectedChat];
          if (!chatRoom) return prev;

          // Create a new chat room object with the message appended
          const updatedChatRoom = {
            ...chatRoom,
            messages: [...chatRoom.messages, optimisticTextMessage]
          };

          // Create a new chat list with the updated chat room
          const newChatList = {
            ...prev,
            [selectedChat]: updatedChatRoom
          };

          return newChatList;
        });

        // Use setTimeout with 0 delay to ensure DOM update before scrolling
        setTimeout(() => {
          scrollToBottom();
        }, 0);

        // Actually send the message
        try {
          await sendMessage({
            chatRoomId: selectedChat,
            content: contentToSend,
            senderId: business._id.toString(),
            senderType: SenderType.BUSINESS,
            isAI: false
          });
        } catch (sendError) {
          console.error('Error sending text message:', sendError);
          toast({
            title: "Message Delivery Issue",
            description: "Your message was sent but may not be delivered. Please check your connection.",
            variant: "destructive"
          });
        }
      }

      // Handle image uploads separately
      if (imagesToUpload.length > 0) {
        // Add optimistic image placeholders with read:false to match backend behavior
        const optimisticImageMessages = imagesToUpload.map((file, index) => {
          const imageId = `temp_img_${Date.now()}_${index}`;
          const imageUrl = URL.createObjectURL(file);
          
          return {
            _id: imageId,
            chatRoomId: selectedChat,
            content: '',
            senderId: business._id.toString(),
            senderType: SenderType.BUSINESS,
            isAI: false,
            read: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            image: {
              url: imageUrl,
              type: file.type,
              size: file.size
            }
          } as ChatMessage;
        });

        // Add image messages to UI immediately
        setChatList(prev => {
          const chatRoom = prev[selectedChat];
          if (!chatRoom) return prev;

          // Create a new messages array with the optimistic image messages
          const updatedMessages = [...chatRoom.messages, ...optimisticImageMessages];

          return {
            ...prev,
            [selectedChat]: {
              ...chatRoom,
              messages: updatedMessages
            }
          };
        });

        // Use setTimeout with 0 delay to ensure DOM update before scrolling
        setTimeout(() => {
          scrollToBottom();
        }, 0);

        // Actually upload and send the images
        try {
          const uploadedImages = await uploadImages(imagesToUpload);
          
          // Send each image message
          for (const imageData of uploadedImages) {
            try {
              await sendMessage({
                chatRoomId: selectedChat,
                content: '',
                senderId: business._id.toString(),
                senderType: SenderType.BUSINESS,
                isAI: false,
                image: imageData
              });
            } catch (sendError) {
              console.error('Error sending image message:', sendError);
              // We'll keep the optimistic UI update even if sending fails
              toast({
                title: "Message Delivery Issue",
                description: "Your message was sent but may not be delivered. Please check your connection.",
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error('Error uploading images:', error);
          toast({
            title: "Image Upload Failed",
            description: "Failed to upload one or more images. Please try again.",
            variant: "destructive"
          });
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      
      if (!isConnected && selectedChat) {
        joinRoom(selectedChat);
      }
    }
  }, [selectedChat, newMessage, selectedImages, clearSelectedImages, markChatMessagesAsRead, uploadImages, sendMessage, isConnected, joinRoom, scrollToBottom]);

  // Keep this function for compatibility, but we'll move primary usage to the child component
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewMessage(e.target.value);
    
    // Debounce typing status updates
    if (selectedChat && isConnected) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      } else {
        setTypingStatus(selectedChat, true);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedChat && isConnected) {
          setTypingStatus(selectedChat, false);
          typingTimeoutRef.current = null;
        }
      }, 2000);
    }
  }, [selectedChat, isConnected, setTypingStatus]);

  // Also mark messages as read when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      // Remove the automatic markChatMessagesAsRead call
      // Instead, let the IntersectionObserver handle marking messages as read
      // This ensures messages are only marked as read when they are actually visible
      
      // Scroll to bottom to make recent messages visible
      scrollToBottom();
    }
  }, [selectedChat, scrollToBottom]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  useEffect(() => {
    if (selectedChat) {
      // Initial scroll without animation
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }

      // Check if there are any images in the messages
      const hasImages = chatList[selectedChat]?.messages.some(msg => msg.image);
      
      if (!hasImages) {
        // If no images, scroll immediately
        scrollToBottom();
      }
      // If there are images, the handleImageLoad function will handle scrolling
    }
  }, [selectedChat, chatList]);

  const formatMessage = (msg: ChatMessage) => ({
    _id: msg._id,
    content: msg.content,
    senderId: msg.senderId,
    senderType: msg.senderType,
    chatRoomId: msg.chatRoomId,
    read: msg.read,
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt,
    isAI: msg.isAI,
    image: msg.image
  });

  useEffect(() => {
    const loadAIPreference = async () => {
      try {
        // Fetch CSRF token
        const csrfToken = await fetchCsrfToken();
        if (!csrfToken) {
          console.error('Failed to fetch CSRF token');
          return;
        }
        
        const response = await fetch('/api/business/settings/ai', {
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });
        if (response.ok) {
          const data = await response.json();
          setIsAIEnabled(data.isAIEnabled ?? true);
        }
      } catch (error) {
        console.error('Error loading AI preference:', error);
      }
    };
    loadAIPreference();
  }, []);

  const handleAIToggle = async (enabled: boolean) => {
    try {
      // Fetch CSRF token
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const response = await fetch('/api/business/settings/ai', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ isAIEnabled: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update AI settings');
      }

      setIsAIEnabled(enabled);
      toast({
        title: enabled ? "AI responses enabled" : "AI responses disabled",
        description: enabled 
          ? "Your responses will now include AI-generated suggestions" 
          : "AI-generated suggestions have been turned off",
      });
    } catch (error) {
      console.error('Error updating AI preference:', error);
      toast({
        variant: "destructive",
        title: "Error updating AI settings",
        description: "Please try again later",
      });
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const [imageLoadError, setImageLoadError] = useState(false);
    const isBusinessMessage = message.senderType === SenderType.BUSINESS;
    const isAIMessage = isBusinessMessage && message.isAI === true;
    const hasImageOnly = message.image && !message.content;

    return (
      <div
        key={message._id}
        data-message-id={message._id}
        data-sender-type={message.senderType}
        className={`flex ${
          isBusinessMessage
            ? 'justify-end'
            : 'justify-start'
        } mb-3 sm:mb-4 w-full group`}
      >
        {!isBusinessMessage && (
          <Avatar className={`h-7 w-7 sm:h-8 sm:w-8 mr-1.5 sm:mr-2 mt-1 flex-shrink-0 ${isMobile ? 'h-6 w-6' : ''}`}>
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs sm:text-sm">
              {chatList[selectedChat!]?.user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        {hasImageOnly ? (
          // Image-only message without bubble
          <div className={`relative max-w-[85%] sm:max-w-[75%]`}>
            {imageLoadError ? (
              // Display placeholder for failed images
              <div 
                className="rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 border border-dashed border-gray-300"
                style={{ width: '200px', height: '150px' }}
              >
                <div className="flex flex-col items-center text-gray-500 p-4">
                  <ImageIcon className="h-8 w-8 mb-2 text-gray-400" />
                  <p className="text-xs text-center">Image could not be loaded</p>
                </div>
              </div>
            ) : (
              // Display actual image
              <div className="rounded-lg overflow-hidden">
                <img
                  src={message.image!.url}
                  alt="Message attachment"
                  className="max-w-full rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '250px' }}
                  onClick={() => setIsImagePreviewOpen(true)}
                  onLoad={handleImageLoad}
                  onError={() => {
                    console.error('Error loading image:', message.image?.url);
                    setImageLoadError(true);
                    handleImageLoad();
                  }}
                />
              </div>
            )}
            
            {isImagePreviewOpen && !imageLoadError && (
              <ImagePreviewDialog
                isOpen={isImagePreviewOpen}
                onClose={() => setIsImagePreviewOpen(false)}
                imageUrl={message.image!.url}
              />
            )}
            
            <div className={`text-xs mt-1 flex items-center gap-1 ${
              isBusinessMessage
              ? isAIMessage 
                ? 'text-indigo-600'
                : 'text-violet-600'
              : 'text-gray-400'
            }`}>
              {new Date(message.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
              })}
              {isBusinessMessage && message.read && (
                <CheckCheck className="h-3 w-3 ml-1" />
              )}
              {isBusinessMessage && !message.read && (
                <Check className="h-3 w-3 ml-1" />
              )}
            </div>
          </div>
        ) : (
          // Regular message with bubble
          <div
            className={`relative rounded-2xl px-3 py-2 ${
              isBusinessMessage
                ? isAIMessage
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'bg-violet-100 text-violet-900'
                : 'bg-gray-200 text-gray-900'
            } max-w-[85%] sm:max-w-[75%] text-sm sm:text-base break-words`}
          >
            {isAIMessage && (
              <Badge className="absolute -top-2 -right-2 bg-indigo-200 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full">
                AI
              </Badge>
            )}
            
          {message.image && (
            <div className={message.content ? "mb-2" : ""}>
                {imageLoadError ? (
                  // Display placeholder for failed images
                  <div 
                    className="rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 border border-dashed border-gray-300"
                    style={{ width: '150px', height: '100px' }}
                  >
                    <div className="flex flex-col items-center text-gray-500 p-3">
                      <ImageIcon className="h-6 w-6 mb-1 text-gray-400" />
                      <p className="text-xs text-center">Image could not be loaded</p>
                    </div>
                  </div>
                ) : (
              <img
                src={message.image.url}
                alt="Message attachment"
                className="max-w-full rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                style={{ maxHeight: '200px' }}
                onClick={() => setIsImagePreviewOpen(true)}
                onLoad={handleImageLoad}
                    onError={() => {
                  console.error('Error loading image:', message.image?.url);
                      setImageLoadError(true);
                      handleImageLoad();
                }}
              />
                )}
                
                {isImagePreviewOpen && !imageLoadError && (
              <ImagePreviewDialog
                isOpen={isImagePreviewOpen}
                onClose={() => setIsImagePreviewOpen(false)}
                imageUrl={message.image.url}
              />
                )}
            </div>
          )}
            
          {message.content && (
              <div className="min-w-[50px] w-full break-words">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
              {message.content}
            </p>
                <div className={`text-xs mt-1 flex items-center gap-1 ${
                  isBusinessMessage
                  ? isAIMessage 
                    ? 'text-indigo-600'
                    : 'text-violet-600'
              : 'text-gray-400'
          }`}>
            {new Date(message.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit'
            })}
                  {isBusinessMessage && message.read && (
                    <CheckCheck className="h-3 w-3 ml-1" />
                  )}
                  {isBusinessMessage && !message.read && (
                    <Check className="h-3 w-3 ml-1" />
                  )}
          </div>
        </div>
              )}
            </div>
          )}
        
        {isBusinessMessage && (
          <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
            {isAIMessage ? (
              <AvatarFallback className="bg-indigo-100 text-indigo-600">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            ) : (
              <AvatarFallback className="bg-violet-100 text-violet-600">
                B
              </AvatarFallback>
            )}
          </Avatar>
        )}
      </div>
    );
  };

  const ChatDateSeparator = ({ date }: { date: string }) => {
    const formattedDate = (() => {
      const messageDate = new Date(date);
      if (isToday(messageDate)) {
        return 'Today';
      } else if (isYesterday(messageDate)) {
        return 'Yesterday';
      } else {
        return format(messageDate, 'EEEE, MMMM d');
      }
    })();

  return (
      <div className="flex items-center justify-center my-4">
        <div className="bg-gray-200 h-[1px] flex-grow"></div>
        <div className="mx-2 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
          {formattedDate}
        </div>
        <div className="bg-gray-200 h-[1px] flex-grow"></div>
      </div>
    );
  };

  // Group messages by date for displaying date separators
  const getGroupedMessages = (messages: ChatMessage[]) => {
    const result: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';
    
    messages.forEach(message => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        result.push({
          date: message.createdAt,
          messages: [message]
        });
      } else {
        result[result.length - 1].messages.push(message);
      }
    });
    
    return result;
  };

  // Add responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Set up IntersectionObserver to detect when messages are visible
  useEffect(() => {
    if (!selectedChat || !chatList[selectedChat]) return;
    
    // Find unread user messages in the selected chat
    const unreadUserMessages = chatList[selectedChat].messages.filter(
      msg => msg.senderType === SenderType.USER && !msg.read
    );
    
    if (unreadUserMessages.length === 0) return;
    
    console.log(`Setting up IntersectionObserver for ${unreadUserMessages.length} unread user messages`);
    
    // Create a new IntersectionObserver
    messageObserverRef.current = new IntersectionObserver(
      (entries) => {
        let needToMarkAsRead = false;
        let visibleUnreadMessageIds: string[] = [];
        
        entries.forEach(entry => {
          const messageId = entry.target.getAttribute('data-message-id');
          const senderType = entry.target.getAttribute('data-sender-type');
          
          if (!messageId || senderType !== SenderType.USER) return;
          
          // Check if this is a user message that needs to be marked as read
          const isUnreadUserMessage = unreadUserMessages.some(msg => msg._id === messageId);
          
          if (isUnreadUserMessage) {
            if (entry.isIntersecting) {
              // Message is visible in viewport
              visibleMessagesRef.current.add(messageId);
              visibleUnreadMessageIds.push(messageId);
              needToMarkAsRead = true;
            } else {
              // Message is no longer visible
              visibleMessagesRef.current.delete(messageId);
            }
          }
        });
        
        // Only call markChatMessagesAsRead if we have visible unread messages
        if (needToMarkAsRead && selectedChat) {
          console.log(`Marking as read ${visibleUnreadMessageIds.length} visible messages`);
          markChatMessagesAsRead(selectedChat);
        }
      },
      { threshold: 0.5 } // Message is considered visible when 50% is in view
    );
    
    // Attach the observer to message elements with a small delay to ensure they're in the DOM
    setTimeout(() => {
      const messageElements = document.querySelectorAll('[data-message-id][data-sender-type]');
      console.log(`Found ${messageElements.length} message elements to observe`);
      
      messageElements.forEach(el => {
        messageObserverRef.current?.observe(el);
      });
    }, 200);
    
    // Cleanup
    return () => {
      if (messageObserverRef.current) {
        messageObserverRef.current.disconnect();
      }
    };
  }, [selectedChat, chatList, markChatMessagesAsRead]);

  const handleChatSelect = (roomId: string) => {
    setSelectedChat(roomId);
    if (isMobile) {
      // Add some animation delay for mobile view
      requestAnimationFrame(() => {
        const chatDetailsEl = document.querySelector('.md\\:col-span-2');
        if (chatDetailsEl) {
          chatDetailsEl.classList.add('chat-details-enter');
        }
      });
    }
    
    // Immediately update UI to clear unread count
    if (chatList[roomId]?.unreadCount > 0) {
      // Update UI first to show zero unread count
      setChatList(prev => {
        const chatRoom = prev[roomId];
        if (!chatRoom) return prev;
        
        return {
          ...prev,
          [roomId]: {
            ...chatRoom,
            unreadCount: 0  // Set to zero immediately for responsive UI
          }
        };
      });
      
      // Then mark messages as read in the background
      markChatMessagesAsRead(roomId);
    }
  };

  // Add the styles to a style tag in the head
  useEffect(() => {
    // Only add the style once
    if (!document.getElementById('chat-animations')) {
      const style = document.createElement('style');
      style.id = 'chat-animations';
      style.textContent = refreshButtonAnimation;
      document.head.appendChild(style);
    }
    
    return () => {
      const styleElement = document.getElementById('chat-animations');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 animate-in fade-in duration-300">
      <style jsx global>{`
        @media (max-width: 767px) {
          .chat-mobile-view {
            display: grid;
            transition: all 0.3s ease;
          }
          
          .mobile-back-button {
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          }
          
          .mobile-message-area {
            height: calc(100vh - 180px) !important;
            max-height: calc(100vh - 180px) !important;
          }
          
          .chat-list-enter {
            animation: slideInLeft 0.3s forwards;
          }
          
          .chat-details-enter {
            animation: slideInRight 0.3s forwards;
          }
          
          .chat-message-preview {
            max-width: 180px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
          }
          
          @keyframes slideInLeft {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          
          @keyframes slideInRight {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        }
        
        .unread-badge {
          animation: pulse-badge 2s infinite;
        }
        
        @keyframes pulse-badge {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div className="max-w-6xl mx-auto">
        {/* Header with stats */}
        <div className="mb-4 sm:mb-8">
          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl -z-10"></div>
            <div className="px-4 sm:px-8 py-6 sm:py-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2 mb-2">
                    <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-violet-600" />
                    Customer Messages
                  </h1>
                  <p className="text-sm sm:text-base text-gray-500 max-w-2xl">
                    Manage conversations with your customers and respond to inquiries
                  </p>
          </div>
          <div className="flex items-center space-x-6">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
            <div className="flex items-center space-x-2">
              <Switch
                id="ai-mode"
                checked={isAIEnabled}
                onCheckedChange={handleAIToggle}
              />
              <Label htmlFor="ai-mode" className="flex items-center space-x-2 cursor-pointer">
                            <Bot className="h-4 w-4 text-violet-500" />
                <span className="text-sm text-gray-700">AI Responses</span>
              </Label>
            </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enable AI to automatically respond to customer inquiries</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <Loader2 className="h-10 w-10 text-violet-600 animate-spin mb-4" />
            <p className="text-gray-500">Loading conversations...</p>
          </div>
        ) : Object.keys(chatList).length === 0 && !error ? (
          <Card className="bg-gray-50 border-dashed border-gray-200">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-violet-600" />
              </div>
              <div className="text-gray-700 font-medium text-lg mb-2">No messages yet</div>
              <p className="text-gray-500 max-w-md">
                When customers message you, their conversations will appear here. You can respond to inquiries and manage all your customer communications in one place.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 h-[calc(100vh-160px)] md:h-auto ${isMobile && selectedChat ? 'chat-mobile-view' : ''}`}>
            {/* Chat list */}
            <Card className={`md:col-span-1 border-0 shadow-md overflow-hidden h-full ${isMobile && selectedChat ? 'hidden md:block' : ''}`}>
              <CardContent className="p-0">
                <div className="p-4 border-b bg-white sticky top-0 z-10 flex justify-between items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search conversations..." 
                      className="pl-9 bg-gray-50 border-gray-200"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={async () => {
                      try {
                        console.log('Manually refreshing chat list');
                        setIsRefreshing(true);
                        const updatedChatList = await businessAuth.getChats();
                        setChatList(prevChatList => {
                          const mergedChatList = { ...updatedChatList };
                          
                          // Preserve messages for the selected chat
                          if (selectedChat && prevChatList[selectedChat]) {
                            mergedChatList[selectedChat] = {
                              ...mergedChatList[selectedChat],
                              messages: prevChatList[selectedChat].messages,
                            };
                          }
                          
                          return mergedChatList;
                        });
                        toast({
                          title: "Chat list refreshed",
                          description: "Your chat list has been updated with the latest messages",
                          duration: 3000,
                        });
                      } catch (error) {
                        console.error('Error refreshing chat list:', error);
                        toast({
                          variant: "destructive",
                          title: "Refresh failed",
                          description: "Could not refresh chat list. Please try again.",
                        });
                      } finally {
                        setIsRefreshing(false);
                      }
                    }}
                    title="Refresh chat list"
                    className="ml-2 flex items-center justify-center"
                    disabled={isRefreshing}
                  >
                    <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'refresh-spin' : ''}`} />
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100vh-240px)] md:h-[600px] overflow-auto scrollbar-thin smooth-scroll chat-list-overflow">
                  {Object.entries(chatList).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    Object.entries(chatList)
                      .sort(([, a], [, b]) => {
                        // First sort by unread count
                        if ((b.unreadCount || 0) !== (a.unreadCount || 0)) {
                          return (b.unreadCount || 0) - (a.unreadCount || 0);
                        }
                        // Then sort by last message time
                        const aLastMsg = a.messages[a.messages.length - 1];
                        const bLastMsg = b.messages[b.messages.length - 1];
                        return aLastMsg && bLastMsg 
                          ? new Date(bLastMsg.createdAt).getTime() - new Date(aLastMsg.createdAt).getTime()
                          : 0;
                      })
                      .map(([roomId, chat]) => {
                        const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
                        const unreadCount = chat.unreadCount || 0;
                        const hasUnread = unreadCount > 0;
                        
                        return (
                          <div 
                            key={roomId}
                            className={`
                              p-3 sm:p-4 cursor-pointer border-b last:border-0 transition-all duration-200 chat-list-item
                              ${selectedChat === roomId
                                ? 'bg-violet-50 border-l-4 border-l-violet-500'
                                : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                              }
                              ${hasUnread ? 'bg-blue-50/50' : ''}
                              ${isMobile ? 'chat-list-enter' : ''}
                            `}
                            onClick={() => handleChatSelect(roomId)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <Avatar className={`h-12 w-12 border-2 border-white shadow-sm`}>
                                  <AvatarFallback className={`
                                    ${hasUnread ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                                    ${selectedChat === roomId ? 'bg-violet-100 text-violet-600' : ''}
                                  `}>
                                  {chat.user.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {hasUnread && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1.5 border-2 border-white font-bold unread-badge">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`font-medium truncate ${hasUnread ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {chat.user.name}
                                  </p>
                                  {lastMessage && (
                                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                      {formatMessageDate(lastMessage.createdAt)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <p className={`text-sm ${hasUnread ? 'text-blue-700 font-medium' : 'text-gray-500'} chat-message-preview`} style={{ maxWidth: '180px' }}>
                                    {lastMessage?.image 
                                      ? 'Sent an image' 
                                      : lastMessage?.content 
                                        ? lastMessage.content.length > 30 
                                          ? `${lastMessage.content.substring(0, 30)}...` 
                                          : lastMessage.content
                                        : 'No messages yet'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat area */}
            <Card className={`md:col-span-2 border-0 shadow-md overflow-hidden ${isMobile && !selectedChat ? 'hidden md:block' : ''}`}>
              <CardContent className="p-0">
                {selectedChat ? (
                  <div className="flex flex-col h-[calc(100vh-240px)] md:h-[600px]">
                    {/* Chat header */}
                    <div className="p-3 sm:p-4 border-b bg-white sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`${isMobile ? 'mobile-back-button' : ''} mr-1 sm:mr-2 flex items-center justify-center`}
                            onClick={() => setSelectedChat(null)}
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                              <AvatarFallback className="bg-violet-100 text-violet-600">
                                {chatList[selectedChat].user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {chatList[selectedChat].unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1.5 border-2 border-white font-bold unread-badge">
                                {chatList[selectedChat].unreadCount > 99 ? '99+' : chatList[selectedChat].unreadCount}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">
                              {chatList[selectedChat].user.name}
                            </h3>
                              {isTyping[selectedChat] && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs animate-pulse flex items-center gap-1">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                  typing...
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {chatList[selectedChat].user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse mr-2`}></div>
                          <span className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Messages area */}
                    <ScrollArea 
                      ref={scrollAreaRef}
                      className={`flex-1 px-2 sm:px-4 py-4 sm:py-6 bg-gray-50 overflow-y-auto ${isMobile ? 'mobile-message-area' : ''}`}
                      style={{ height: 'calc(100% - 80px)', maxHeight: 'calc(100% - 80px)' }}
                    >
                      <div className="space-y-1 min-h-full w-full pb-4">
                        {getGroupedMessages(chatList[selectedChat].messages).map((group, groupIndex) => (
                          <div key={`group-${groupIndex}`}>
                            <ChatDateSeparator date={group.date} />
                            {group.messages.map((message: ChatMessage) => (
                          <MessageBubble key={message._id} message={message} />
                            ))}
                          </div>
                        ))}
                        <div ref={messagesEndRef} style={{ height: '1px' }} />
                      </div>
                    </ScrollArea>

                    {/* Message input area */}
                    <MessageInputArea />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[600px] bg-gray-50 text-gray-500">
                    <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-violet-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">Select a conversation</p>
                    <p className="text-sm text-gray-500 max-w-md text-center">
                      Choose a chat from the list to start messaging with your customers
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 

