'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { ChatMessage, SenderType } from '@/lib/types';
import { auth } from '@/lib/auth';
import { useSocket, SocketProvider } from '@/lib/socket';
import { toast } from "@/components/ui/use-toast";
import { Toast } from "@/components/ui/toast";
import { ImagePreviewDialog } from "@/components/ui/image-preview-dialog";
import { v4 as uuidv4 } from 'uuid';

interface ChatWindowProps {
  businessId: string;
  onClose: () => void;
}

interface AIMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: string;
  appointmentDetails?: any;
}

function MessageBubble({ message, imagePreview }: { message: ChatMessage; imagePreview?: string | null }) {
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  const imageUrl = message._id.startsWith('temp_') && imagePreview 
    ? imagePreview 
    : message.image?.url || '';

  const isUser = message.senderType === SenderType.USER;
  const isAI = !isUser && message.isAI === true;

  return (
    <div
      className={`flex ${
        isUser ? 'justify-end' : 'justify-start'
      } mb-4 group w-full`}
    >
      <div
        className={`
          relative flex flex-col
          ${message.content ? `
            rounded-2xl px-4 py-2
            ${isUser ? 'bg-violet-600 text-white rounded-br-none' : 'bg-white shadow-md border border-gray-100 rounded-bl-none'}
          ` : ''}
          ${message.image ? 'max-w-[300px]' : 'max-w-[85%] min-w-[60px]'}
          overflow-hidden
        `}
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
      >
        {message.image && imageUrl && (
          <div className={`${!message.content ? '' : 'mb-2'} rounded-lg overflow-hidden`}>
            <img
              src={imageUrl}
              alt="Shared image"
              className="w-full object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
              style={{ 
                maxHeight: '300px',
                backgroundColor: isUser ? 'rgba(124, 58, 237, 0.1)' : 'rgba(0, 0, 0, 0.05)'
              }}
              onClick={() => setIsImagePreviewOpen(true)}
              onError={(e) => {
                console.error('Error loading image:', imageUrl);
                e.currentTarget.style.display = 'none';
              }}
            />
            <ImagePreviewDialog
              isOpen={isImagePreviewOpen}
              onClose={() => setIsImagePreviewOpen(false)}
              imageUrl={imageUrl}
            />
          </div>
        )}
        {message.content && (
          <div className="min-w-[50px] w-full break-words">
            <div className="flex items-start">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap flex-grow" style={{ wordBreak: 'break-word' }}>{message.content}</p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className={`
                text-[11px] opacity-70 transition-opacity flex items-center
                ${isUser ? 'text-violet-100' : 'text-gray-500'}
              `}>
                {new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
                {isUser && message.read && (
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="h-3 w-3 ml-1"
                  >
                    <path d="M18 6 7 17l-5-5"/>
                    <path d="m22 10-7.5 7.5L13 16"/>
                  </svg>
                )}
              </div>
              {isAI && (
                <span className="inline-flex items-center text-[9px] font-medium text-white px-1.5 py-0.5 bg-gradient-to-r from-violet-600 to-violet-500 rounded-full shadow-sm border border-violet-400/30">
                  <svg className="w-2 h-2 mr-0.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatWindow({ businessId, onClose }: ChatWindowProps) {
  // Check if business ID is a valid MongoDB ObjectId
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(businessId);
  
  // Identify if this is likely from search results by checking the URL
  const isFromSearchResults = typeof window !== 'undefined' && 
    (window.location.pathname === '/search' || 
     window.location.pathname.includes('/search') || 
     window.location.search.includes('?q=') ||
     window.location.pathname === '/');
  
  console.log('ChatWindow initialized with businessId:', {
    id: businessId,
    isValid: isValidObjectId,
    context: isFromSearchResults ? 'search_results' : 'business_page',
    url: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
  });
  
  if (!isValidObjectId) {
    console.error(`Invalid businessId format in ChatWindow: ${businessId}. Must be a MongoDB ObjectId.`);
    return (
      <div className="bg-white rounded-lg shadow-lg w-[350px] md:w-[400px] h-[500px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Chat Error</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="mb-2">Unable to open chat</p>
            <p className="text-sm text-gray-600">Invalid business identifier format</p>
            <p className="text-xs text-gray-500 mt-2">ID: {businessId ? businessId.substring(0, 10) + '...' : 'None'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentChatRoom, setCurrentChatRoom] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { socket, isConnected, joinRoom, leaveRoom, sendMessage, setTypingStatus } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const connectionRetryRef = useRef<NodeJS.Timeout>();
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [isBusinessOnline, setIsBusinessOnline] = useState(false);
  const [aiContext, setAIContext] = useState<AIMessage[]>([]);
  const [lastAppointmentDetails, setLastAppointmentDetails] = useState<any>(null);
  const lastMessageTime = useRef<number>(Date.now());
  const AI_RESPONSE_DELAY = 10000; // 10 seconds
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userPreferredAI, setUserPreferredAI] = useState(true);
  const [isAIToggleLoading, setIsAIToggleLoading] = useState(false);
  const connectionAttemptsRef = useRef(0);
  const maxConnectionAttempts = 5;
  const [forceSocketReconnect, setForceSocketReconnect] = useState(0);

  // Add a debounce ref for appointment requests
  const appointmentRequestRef = useRef<{
    lastRequest: string | null;
    timestamp: number;
  }>({ lastRequest: null, timestamp: 0 });

  // Add function to fetch AI settings
  const fetchAISettings = async () => {
    try {
      const response = await fetch(`/api/business/settings/ai?businessId=${businessId}`);
      
      if (!response.ok) {
        console.error('Failed to fetch settings:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('Fetched AI settings:', data);
      setIsAIEnabled(data.isAIEnabled ?? true);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Initial authentication and message loading
  useEffect(() => {
    const checkAuthAndLoadMessages = async () => {
      console.log('Starting auth check and message load...', { businessId });
      try {
        const token = auth.getToken();
        console.log('ChatWindow auth check:', { 
          hasToken: !!token,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
          businessId
        });
        
        if (!token) {
          console.log('No token found - clearing state');
          setIsAuthenticated(false);
          setError('Please sign in to access the chat feature');
          return;
        }

        // Fetch AI settings first
        await fetchAISettings();

        // Verify token is valid
        try {
          console.log('Verifying token...');
          const response = await fetch('/api/chat/verify', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();
          console.log('Token verification response:', data);

          if (!response.ok || !data.success) {
            console.log('Token verification failed:', data.error);
            auth.logout();
            setIsAuthenticated(false);
            setError(data.error || 'Your session has expired. Please sign in again.');
            return;
          }

          console.log('Token verification successful - setting authenticated state');
          setIsAuthenticated(true);
          setError(null);
          
          // Load messages immediately after successful authentication
          console.log('Loading messages after successful auth');
          await loadMessages();
        } catch (verifyError) {
          console.error('Token verification error:', verifyError);
          setIsAuthenticated(false);
          setError('Authentication check failed');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setError('Authentication check failed');
      }
    };

    checkAuthAndLoadMessages();
  }, [businessId]); // Only depend on businessId

  // Effect for handling messages and updates
  useEffect(() => {
    if (socket && currentChatRoom) {
      console.log('Setting up message handlers for room:', currentChatRoom);

      // Listen for new messages
      socket.on('receive_message', (message: ChatMessage) => {
        console.log('Received new message via socket:', message);
        setMessages(prev => {
          // First, remove any temporary messages that match this permanent message
          const filteredMessages = prev.filter(m => {
            // Keep the message if it's not a temp message that matches our permanent one
            return !(m._id.startsWith('temp_') && 
              message.content === m.content && 
              message.senderType === m.senderType &&
              message.isAI === m.isAI &&
              JSON.stringify(message.image) === JSON.stringify(m.image) &&
              Math.abs(new Date(message.createdAt).getTime() - new Date(m.createdAt).getTime()) < 5000);
          });

          // Check if this message already exists (by permanent ID)
          const messageExists = filteredMessages.some(m => m._id === message._id);
          if (messageExists) {
            return filteredMessages;
          }

          // Add the new message and sort
          const newMessages = [...filteredMessages, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          setTimeout(scrollToBottom, 100);
          return newMessages;
        });
      });

      // Listen for message confirmations
      socket.on('message_sent', (data: { messageId: string, chatRoomId: string }) => {
        console.log('Message confirmation received:', data);
        
        if (!data || !data.messageId || !data.chatRoomId) {
          console.error('Invalid message confirmation data received:', data);
          return;
        }

        setMessages(prev => {
          // Remove any existing message with the new permanent ID first
          const withoutPermanent = prev.filter(msg => msg._id !== data.messageId);
          
          // Then update the temporary message
          return withoutPermanent.map(msg => {
            if (msg._id.startsWith('temp_') && msg.chatRoomId === data.chatRoomId) {
              console.log('Updating temp message ID:', msg._id, 'to:', data.messageId);
              return {
                ...msg,
                _id: data.messageId
              };
            }
            return msg;
          });
        });
      });

      // Join the room
      console.log('Joining chat room:', currentChatRoom);
      joinRoom(currentChatRoom);

      return () => {
        // Cleanup socket listeners and leave room
        console.log('Cleaning up socket listeners and leaving room:', currentChatRoom);
        socket.off('receive_message');
        socket.off('message_sent');
        socket.off('user_typing');
        socket.off('user_stop_typing');
        leaveRoom(currentChatRoom);
      };
    }
  }, [socket, currentChatRoom, joinRoom, leaveRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchBusinessName = async () => {
      if (!businessId) {
        console.error('No business ID provided for fetching business name');
        return;
      }

      try {
        console.log('Fetching business details for ID:', businessId);
        const response = await fetch(`/api/business/${businessId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch business details: ${response.status}`);
        }

        const data = await response.json();
        console.log('Business API Response:', data); // Log full response

        // Check if the business name is in the correct path
        const businessName = data.business_name || data.name || (data.business && data.business.business_name);
        
        if (!businessName) {
          console.error('Business name not found in response structure:', data);
          throw new Error('Business name not found in response');
        }

        console.log('Successfully fetched business name:', businessName);
        setBusinessName(businessName);
      } catch (error) {
        console.error('Error fetching business name:', error);
        // Retry after 2 seconds if failed
        setTimeout(() => {
          console.log('Retrying business name fetch...');
          fetchBusinessName();
        }, 2000);
      }
    };

    fetchBusinessName();
  }, [businessId]);

  // Add cleanup effect when component is closed
  useEffect(() => {
    return () => {
      if (currentChatRoom) {
        leaveRoom(currentChatRoom);
      }
    };
  }, []);

  const loadMessages = async () => {
    if (!businessId) {
      console.log('No business ID provided');
      return;
    }

    const token = auth.getToken();
    if (!token) {
      console.log('No auth token found - clearing auth state');
      setIsAuthenticated(false);
      setError('Authentication token not found. Please sign in again.');
      return;
    }

    try {
      console.log('Fetching messages for business:', businessId);
      const response = await fetch(`/api/chat/${businessId}/messages`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        console.error('401 Unauthorized - clearing auth state');
        auth.logout();
        setIsAuthenticated(false);
        setError('Your session has expired. Please sign in again.');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', response.status, errorData);
        throw new Error(`Failed to load messages: ${response.status} ${errorData}`);
      }
      
      const data = await response.json();
      console.log(`Loaded response:`, data);
      
      // Get messages from response
      const messages = Array.isArray(data) ? data : (data.messages || []);
      console.log(`Processing ${messages.length} messages`);
      
      // Sort messages by date
      const sortedMessages = messages.sort((a: ChatMessage, b: ChatMessage) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      setMessages(sortedMessages);
      setError(null);

      // Get the chat room ID from either the messages, response headers, or response body
      const chatRoomId = messages.length > 0 ? 
        messages[0].chatRoomId : 
        data.chatRoomId || 
        response.headers.get('X-Chat-Room-Id');

      if (chatRoomId) {
        console.log('Setting chat room ID:', chatRoomId);
        setCurrentChatRoom(chatRoomId);
        joinRoom(chatRoomId);
        
        // Mark messages as read after loading
        await markMessagesAsRead(chatRoomId);
      } else {
        console.error('No chat room ID found in response');
        setError('Failed to establish chat connection');
      }

      // Scroll to latest messages immediately without animation
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      });
    } catch (error: any) {
      console.error('Error loading messages:', error);
      if (error.message.includes('401')) {
        auth.logout();
        setIsAuthenticated(false);
        setError('Your session has expired. Please sign in again.');
      } else if (error.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(error.message || 'Failed to load messages');
      }
    }
  };

  // Function to mark messages as read
  const markMessagesAsRead = async (chatRoomId: string) => {
    if (!chatRoomId) return;
    
    try {
      console.log('Marking business messages as read for chatroom:', chatRoomId);
      
      // Get auth token
      const token = auth.getToken();
      if (!token) {
        console.log('No auth token found - cannot mark messages as read');
        return;
      }
      
      // Count unread messages before update
      const unreadCountBefore = messages.filter(
        msg => msg.senderType === SenderType.BUSINESS && !msg.read
      ).length;
      
      // First, update local state
      setMessages(prev => prev.map(msg => {
        if (msg.senderType === SenderType.BUSINESS && !msg.read) {
          return { ...msg, read: true };
        }
        return msg;
      }));
      
      // Call API to update read status on the server with retry logic
      const markAsRead = async (retryCount = 0, maxRetries = 2) => {
        try {
          const response = await fetch(`/api/chat/mark-as-read/${chatRoomId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            if (response.status === 404) {
              console.warn('Chat room not found or access denied');
              return { success: false, error: 'Chat room not found' };
            } else if (retryCount < maxRetries) {
              // Wait before retrying (exponential backoff)
              const delay = Math.pow(2, retryCount) * 500;
              await new Promise(resolve => setTimeout(resolve, delay));
              return markAsRead(retryCount + 1, maxRetries);
            } else {
              throw new Error(`API error: ${response.status}`);
            }
          }
          
          const data = await response.json();
          console.log('Successfully marked messages as read on server', data);
          return { 
            success: true, 
            messagesUpdated: data.messagesUpdated,
            unreadCount: 0 // All messages now read
          };
        } catch (error) {
          if (retryCount < maxRetries) {
            // Wait before retrying
            const delay = Math.pow(2, retryCount) * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
            return markAsRead(retryCount + 1, maxRetries);
          }
          throw error;
        }
      };
      
      // Call the API with retry logic
      const result = await markAsRead();
      
      if (!result.success) {
        console.warn('Failed to mark messages as read on server:', result.error);
      } else if (unreadCountBefore > 0) {
        // Notify parent components about unread count change if needed
        console.log(`Marked ${unreadCountBefore} messages as read`);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (!isAuthenticated || !currentChatRoom) {
      return;
    }

    setTypingStatus(currentChatRoom, true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated && currentChatRoom) {
        setTypingStatus(currentChatRoom, false);
      }
    }, 2000);
  };

  const handleAIResponse = async (userMessage: string) => {
    try {
      // Check if we have a chat room ID first
      if (!currentChatRoom) {
        console.error('No chat room available for AI response');
        return;
      }

      // At this point, we've verified currentChatRoom is not null
      const chatRoomId: string = currentChatRoom;

      console.log('Starting AI response process:', {
        businessId,
        chatRoomId,
        messageLength: userMessage.length,
        hasContext: aiContext.length > 0,
        hasAppointmentDetails: !!lastAppointmentDetails,
        appointmentInfo: lastAppointmentDetails ? {
          service: lastAppointmentDetails.service,
          date: lastAppointmentDetails.date,
          time: lastAppointmentDetails.time,
          previouslyCollected: lastAppointmentDetails.previouslyCollected
        } : 'none'
      });
      
      // Fetch latest AI settings before proceeding
      try {
        const aiSettingsResponse = await fetch(`/api/business/settings/ai?businessId=${businessId}`);

        if (!aiSettingsResponse.ok) {
          console.error('Failed to fetch AI settings:', aiSettingsResponse.status);
          return;
        }

        const aiSettings = await aiSettingsResponse.json();
        console.log('Fetched latest AI settings:', aiSettings);
        
        // Update local state and check if AI is enabled
        setIsAIEnabled(aiSettings.isAIEnabled ?? true);
        if (!aiSettings.isAIEnabled) {
          console.log('AI responses are currently disabled for this business');
          return;
        }
      } catch (error) {
        console.error('Error fetching AI settings:', error);
        return;
      }
      
      // Check if we have the required data
      if (!businessId || !currentChatRoom) {
        console.error('Missing required data:', { businessId, currentChatRoom });
        throw new Error('Missing required data for AI response');
      }

      // Fetch business details first
      const businessResponse = await fetch(`/api/business/${businessId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!businessResponse.ok) {
        throw new Error(`Failed to fetch business details: ${businessResponse.status}`);
      }

      const businessData = await businessResponse.json();
      const businessDetails = {
        name: businessData.business_name || businessData.name || (businessData.business && businessData.business.business_name),
        description: businessData.description || businessData.business?.description,
        category: businessData.category || businessData.business?.category,
        services: businessData.services || businessData.business?.services,
        location: {
          address: businessData.address || businessData.business?.address,
          city: businessData.city || businessData.business?.city,
          state: businessData.state || businessData.business?.state,
          zip_code: businessData.zip_code || businessData.business?.zip_code
        },
        phone: businessData.phone || businessData.business?.phone,
        email: businessData.email || businessData.business?.email,
        website: businessData.Website || businessData.business?.Website,
        hours: businessData.business_hours || businessData.business?.business_hours,
        features: businessData.business_features || businessData.business?.business_features
      };

      const token = auth.getToken();
      if (!token) {
        console.error('No auth token available');
        throw new Error('Authentication required');
      }

      // Create a new context object with explicit appointment details
      const enhancedContext = aiContext.map(msg => ({
        ...msg,
        appointmentDetails: lastAppointmentDetails,
        includesAppointmentDetails: true
      }));

      // Add a special context message specifically for appointment tracking if we have appointment details
      if (lastAppointmentDetails && (lastAppointmentDetails.service || lastAppointmentDetails.date || lastAppointmentDetails.time)) {
        enhancedContext.push({
          role: 'system',
          content: `APPOINTMENT TRACKING: The user has previously provided the following appointment details:
${lastAppointmentDetails.service ? `- Service: ${lastAppointmentDetails.service}` : ''}
${lastAppointmentDetails.date ? `- Date: ${lastAppointmentDetails.date}` : ''}
${lastAppointmentDetails.time ? `- Time: ${lastAppointmentDetails.time}` : ''}
${lastAppointmentDetails.customerName ? `- Name: ${lastAppointmentDetails.customerName}` : ''}
${lastAppointmentDetails.customerPhone ? `- Phone: ${lastAppointmentDetails.customerPhone}` : ''}
Fields collected so far: ${lastAppointmentDetails.previouslyCollected?.join(', ') || 'none'}`,
          timestamp: new Date().toISOString(),
          appointmentDetails: lastAppointmentDetails,
          includesAppointmentDetails: true
        });
      }

      console.log('Sending AI response request with business details...');
      const response = await fetch('/api/chat/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId,
          message: userMessage,
          context: enhancedContext, // Use enhanced context instead of aiContext
          businessName,
          chatRoomId,  // Using the validated non-null chatRoomId
          businessDetails, // Include the full business details
          lastAppointmentDetails, // Include the last known appointment details
          appointmentContextEnabled: true // Signal to server to maintain context
        }),
      });

      console.log('AI response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to get AI response: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Support both old and new response formats
      const responseText = data.text || data.response;
      const storedAppointment = data.storedAppointment || data.appointment;
      
      console.log('Received AI response data:', {
        hasResponse: !!responseText,
        responseLength: responseText?.length,
        hasAppointmentDetails: !!data.appointmentDetails,
        hasStoredAppointment: !!storedAppointment
      });

      if (!responseText) {
        throw new Error('No response content received from AI');
      }

      // Log response before processing
      console.log('AI response received:', {
        messageLength: responseText.length,
        appointmentData: !!data.appointmentDetails,
        isAppointmentRequest: data.isAppointmentRequest,
        storedAppointment: !!data.storedAppointment,
        hasAppointmentDetails: !!data.appointmentDetails,
        resetAppointmentContext: !!data.resetAppointmentContext
      });

      // If we have appointment details, update our state
      if (data.appointmentDetails) {
        console.log('Received appointment details:', data.appointmentDetails);
        
        // Carefully merge with previous appointment details to ensure we maintain context
        if (lastAppointmentDetails) {
          // Create a merged details object
          const mergedDetails = {
            ...lastAppointmentDetails,
            ...data.appointmentDetails,
            // Preserve important fields if they exist in lastAppointmentDetails but not in new data
            service: data.appointmentDetails.service || lastAppointmentDetails.service,
            date: data.appointmentDetails.date || lastAppointmentDetails.date,
            time: data.appointmentDetails.time || lastAppointmentDetails.time,
            customerName: data.appointmentDetails.customerName || lastAppointmentDetails.customerName,
            customerPhone: data.appointmentDetails.customerPhone || lastAppointmentDetails.customerPhone,
            // Combine previouslyCollected arrays to ensure we don't lose tracking
            previouslyCollected: [
              ...(lastAppointmentDetails.previouslyCollected || []),
              ...(data.appointmentDetails.previouslyCollected || [])
            ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
          };
          
          // If we have previously collected fields that are now empty in the new data,
          // keep tracking them as collected
          if (lastAppointmentDetails.service && !data.appointmentDetails.service && 
              !mergedDetails.previouslyCollected.includes('service')) {
            mergedDetails.previouslyCollected.push('service');
          }
          
          if (lastAppointmentDetails.date && !data.appointmentDetails.date && 
              !mergedDetails.previouslyCollected.includes('date')) {
            mergedDetails.previouslyCollected.push('date');
          }
          
          if (lastAppointmentDetails.time && !data.appointmentDetails.time && 
              !mergedDetails.previouslyCollected.includes('time')) {
            mergedDetails.previouslyCollected.push('time');
          }
          
          // Determine correct next step based on collected fields
          const requiredFieldOrder = ['service', 'date', 'time', 'name', 'phone'];
          const missingFields = requiredFieldOrder.filter(field => {
            switch (field) {
              case 'service': return !mergedDetails.service;
              case 'date': return !mergedDetails.date;
              case 'time': return !mergedDetails.time;
              case 'name': return !mergedDetails.customerName;
              case 'phone': return !mergedDetails.customerPhone;
              default: return true;
            }
          });
          
          // Only update nextStep if it's for a field that hasn't been collected
          if (missingFields.length > 0) {
            mergedDetails.nextStep = missingFields[0];
          } else {
            mergedDetails.nextStep = 'complete';
          }
          
          console.log('Merged appointment details:', mergedDetails);
          setLastAppointmentDetails(mergedDetails);
        } else {
          // If no previous details, just use the new ones
          setLastAppointmentDetails(data.appointmentDetails);
        }
      }

      // If we have a stored appointment, make sure it's highlighted in the context
      if (storedAppointment) {
        console.log('Appointment was stored in database:', storedAppointment);
        // Update last appointment details to include the stored appointment ID
        setLastAppointmentDetails((prev: any) => ({
          ...(prev || {}),
          ...data.appointmentDetails,
          status: 'submitted',
          _id: storedAppointment._id
        }));
      }

      // Check if we need to reset appointment context for future interactions
      if (data.resetAppointmentContext) {
        console.log('Received reset appointment context flag. Appointment flow is complete, returning to normal chat.');
        
        // Add a system message to explicitly reset the context for the AI
        setAIContext(prev => {
          const resetContextMessage = {
            role: 'system' as const,
            content: 'IMPORTANT: The appointment booking process is now complete and has been submitted to the business. Reset all appointment-related context. Return to normal conversation mode. Do not ask about or reference appointment details in future responses unless the user explicitly brings up a new appointment request.',
            timestamp: new Date().toISOString()
          };
          return [...prev, resetContextMessage];
        });
        
        // Immediately reset appointment details to null
        setLastAppointmentDetails(null);
        console.log('Appointment context has been reset.');
        
        // Force reset any appointment-related state in the frontend
        setTimeout(() => {
          // Double check that appointment details are cleared
          setLastAppointmentDetails(null);
        }, 500);
      }

      // Send AI message using socket instead of direct API call
      console.log('Sending AI message via socket...', {
        chatRoomId: currentChatRoom,
        content: responseText.substring(0, 50) + '...',
        senderType: SenderType.BUSINESS,
        senderId: businessId,
        isAI: true
      });

      // Get current user for authentication
      const user = await auth.getCurrentUser();
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      // Use the validated chatRoomId
      await sendMessage({
        chatRoomId,
        content: responseText,
        senderType: SenderType.BUSINESS,
        senderId: businessId,
        isAI: true
      });

      // Create temporary message for immediate display
      const tempMessage: ChatMessage = {
        _id: `temp_${Date.now()}`,
        chatRoomId, // Use the validated non-null chatRoomId
        content: responseText,
        senderType: SenderType.BUSINESS,
        senderId: businessId,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isAI: true
      };

      // Update messages with temporary message
      setMessages(prev => {
        const newMessages = [...prev, tempMessage].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        console.log('Updated messages state:', {
          previousCount: prev.length,
          newCount: newMessages.length
        });
        return newMessages;
      });
      
      // Update AI context
      setAIContext(prev => {
        const newContext: AIMessage[] = [...prev, 
          { 
            role: 'user' as const, 
            content: userMessage, 
            timestamp: new Date().toISOString() 
          },
          { 
            role: 'assistant' as const, 
            content: responseText, 
            timestamp: new Date().toISOString(),
            appointmentDetails: data.appointmentDetails // Include appointment details in context
          }
        ];

        // If an appointment was just created, insert a special context message to mark this
        if (storedAppointment) {
          newContext.push({
            role: 'system' as const,
            content: `Appointment created with ID: ${storedAppointment._id}`,
            timestamp: new Date().toISOString(),
            appointmentDetails: {
              ...data.appointmentDetails,
              status: 'submitted',
              _id: storedAppointment._id
            }
          });
        }

        console.log('Updated AI context:', {
          previousCount: prev.length,
          newCount: newContext.length,
          includesAppointmentDetails: !!data.appointmentDetails,
          includedStoredAppointment: !!storedAppointment
        });
        return newContext;
      });

      // Scroll to the new message
      setTimeout(scrollToBottom, 100);

      console.log('AI response process completed successfully');
    } catch (error: any) {
      console.error('Error in AI response handling:', {
        error,
        message: error.message,
        stack: error.stack
      });
      toast({
        title: "AI Response Error",
        description: error.message || "Failed to process AI response. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add image handling functions
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive"
      });
      return;
    }

    setSelectedImage(file);
    
    // Create data URL for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleImageClear = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const MAX_RETRIES = 2;
    const INITIAL_DELAY = 1000;
    
    const attemptUpload = async (token: string, attempt: number = 0): Promise<Response> => {
      console.log(`Attempting upload (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, {
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });

      const formData = new FormData();
      formData.append('image', file);

      return fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
    };

    try {
      let currentToken = auth.getToken();
      if (!currentToken) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to upload images.",
          variant: "destructive",
        });
        throw new Error('No authentication token');
      }

      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt <= MAX_RETRIES) {
        try {
          // Attempt upload with current token
          const response = await attemptUpload(currentToken, attempt);

          // If successful, return the result
          if (response.ok) {
            const data = await response.json();
            return data.url;
          }

          // Handle 401 by refreshing token
          if (response.status === 401) {
            console.log('Token expired, attempting refresh...');
            const newToken = await auth.refreshToken();
            
            if (!newToken) {
              console.error('Token refresh failed');
              setIsAuthenticated(false);
              throw new Error('Session expired. Please sign in again.');
            }

            // Update current token and continue to next attempt
            console.log('Token refreshed successfully, updating current token');
            currentToken = newToken;
            
            // Exponential backoff before retry
            const delay = INITIAL_DELAY * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            attempt++;
            continue;
          }

          // For other errors, throw with response text
          const errorText = await response.text();
          throw new Error(`Upload failed (${response.status}): ${errorText}`);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error occurred');
          
          // If it's not a 401 error or we're out of retries, throw
          if (!(error instanceof Error && error.message.includes('401')) || attempt === MAX_RETRIES) {
            throw lastError;
          }
          
          attempt++;
        }
      }

      // If we get here, we've exhausted our retries
      throw lastError || new Error('Upload failed after maximum retries');
    } catch (error) {
      console.error('Image upload error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Session expired')) {
          setIsAuthenticated(false);
        }
        
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Failed",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
      
      throw error;
    }
  };

  // Add function to load user preferences
  const loadUserPreferences = async () => {
    try {
      const token = auth.getToken();
      if (!token) {
        setUserPreferredAI(true); // Default to true if not logged in
        return;
      }

      const response = await fetch('/api/user/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const data = await response.json();
      console.log('Loaded user preferences:', data);
      setUserPreferredAI(data.preferences.aiEnabled);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load AI preferences",
        variant: "destructive"
      });
      setUserPreferredAI(true); // Default to true on error
    }
  };

  // Add function to save user preference
  const saveUserPreference = async (enabled: boolean) => {
    try {
      setIsAIToggleLoading(true);
      const token = auth.getToken();
      if (!token) {
        setUserPreferredAI(enabled);
        return;
      }

      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferences: {
            aiEnabled: enabled
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      const data = await response.json();
      console.log('Saved user preferences:', data);
      setUserPreferredAI(data.preferences.aiEnabled);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save AI preference",
        variant: "destructive"
      });
      setUserPreferredAI(!enabled); // Revert on error
    } finally {
      setIsAIToggleLoading(false);
    }
  };

  // Load preferences when component mounts
  useEffect(() => {
    loadUserPreferences();
    
    // Listen for AI preference changes from other components
    const handleAIPreferenceChange = (event: CustomEvent) => {
      console.log('AI preference changed event received:', event.detail);
      setUserPreferredAI(event.detail.aiEnabled);
    };
    
    // Add event listener for preference changes
    window.addEventListener('ai-preference-changed', handleAIPreferenceChange as EventListener);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('ai-preference-changed', handleAIPreferenceChange as EventListener);
    };
  }, []);

  // Update the toggle function to save the preference and broadcast the change
  const toggleUserAIPreference = () => {
    const newValue = !userPreferredAI;
    saveUserPreference(newValue);
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('ai-preference-changed', { 
      detail: { aiEnabled: newValue } 
    }));
  };

  // Modify handleSendMessage to include image
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;
    
    // Check if we have a chat room ID first
    if (!currentChatRoom) {
      console.error('No chat room available for sending message');
      toast({
        title: "Error",
        description: "Unable to send message - chat session not initialized",
        variant: "destructive"
      });
      return;
    }

    // Use the validated chatRoomId throughout this function
    const chatRoomId: string = currentChatRoom;
    
    const trimmedMessage = newMessage.trim();
    const isAppointmentRequest = /\b(book|appointment|schedule|reservation)\b/i.test(trimmedMessage.toLowerCase());
    
    // Debounce appointment requests to prevent duplicates
    if (isAppointmentRequest) {
      const now = Date.now();
      const timeSinceLastRequest = now - appointmentRequestRef.current.timestamp;
      
      // If the same appointment request is submitted within 10 seconds, ignore it
      if (
        appointmentRequestRef.current.lastRequest === trimmedMessage &&
        timeSinceLastRequest < 10000
      ) {
        console.log('Prevented duplicate appointment request:', {
          message: trimmedMessage,
          timeSinceLastRequest: timeSinceLastRequest + 'ms'
        });
        
        // Let the user know their request is being processed
        toast({
          title: "Processing appointment",
          description: "Your appointment request is already being processed. Please wait.",
          variant: "default",
        });
        
        return;
      }
      
      // Store this appointment request
      appointmentRequestRef.current = {
        lastRequest: trimmedMessage,
        timestamp: now
      };
    }
    
    // Continue with sending the message
    try {
      setNewMessage('');
      setImagePreview(null);

      // Check authentication first
      const token = auth.getToken();
      if (!token) {
        setIsAuthenticated(false);
        setError('Please sign in to send messages');
        return;
      }

      let imageData: { url: string; type: string; size: number } | undefined;

      // Get current user for senderId
      const user = await auth.getCurrentUser();
      if (!user || !user.id) {
        setIsAuthenticated(false);
        setError('Authentication required');
        return;
      }

      if (selectedImage && imagePreview) {
        try {
          // Create temporary message with data URL first
          const tempImageMessage: ChatMessage = {
            _id: `temp_${Date.now()}_image`,
            chatRoomId,
            content: '',
            senderType: SenderType.USER,
            senderId: user.id.toString(),
            read: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            image: {
              url: imagePreview,
              type: selectedImage.type,
              size: selectedImage.size
            }
          };

          // Add temporary message with data URL preview
          setMessages(prev => {
            const newMessages = [...prev, tempImageMessage].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            setTimeout(scrollToBottom, 100);
            return newMessages;
          });

          // Upload image
          const imageUrl = await uploadImage(selectedImage);
          imageData = {
            url: imageUrl,
            type: selectedImage.type,
            size: selectedImage.size
          };
          console.log('Image uploaded successfully:', imageData);

          // Update message with actual URL
          setMessages(prev => prev.map(msg => 
            msg._id === tempImageMessage._id ? {
              ...msg,
              image: imageData
            } : msg
          ));
        } catch (uploadError: any) {
          if (uploadError.message === 'Session expired') {
            return; // Already handled in uploadImage
          }
          throw uploadError;
        }
      }

      // Create text message if there's content
      if (trimmedMessage) {
        const textMessage: ChatMessage = {
          _id: `temp_${Date.now()}_text`,
          chatRoomId,
          content: trimmedMessage,
          senderType: SenderType.USER,
          senderId: user.id.toString(),
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Add text message to UI
        setMessages(prev => {
          const newMessages = [...prev, textMessage].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setTimeout(scrollToBottom, 100);
          return newMessages;
        });
      }

      // Send the message with content and/or image
      const messageData = {
        chatRoomId,
        content: trimmedMessage || '', // Ensure content is never undefined
        senderType: SenderType.USER,
        senderId: user.id.toString(),
        image: imageData
      };

      console.log('Sending message with data:', messageData);
      await sendMessage(messageData);

      // Clear the image after successful send
      handleImageClear();
      
      // Handle AI response only if we have text content AND user prefers AI
      if (trimmedMessage && userPreferredAI) {
        const currentTime = Date.now();
        const timeSinceLastMessage = currentTime - lastMessageTime.current;
        
        // Fetch latest AI settings before deciding to trigger AI response
        try {
          const aiSettingsResponse = await fetch(`/api/business/settings/ai?businessId=${businessId}`);

          if (!aiSettingsResponse.ok) {
            console.error('Failed to fetch AI settings:', aiSettingsResponse.status);
            return;
          }

          const aiSettings = await aiSettingsResponse.json();
          console.log('Fetched latest AI settings before response:', aiSettings);
          
          // Update local state and check conditions for AI response
          setIsAIEnabled(aiSettings.isAIEnabled ?? true);
          
          // Only proceed with AI response if both system and user prefer it
          if (aiSettings.isAIEnabled && userPreferredAI && (!isBusinessOnline || timeSinceLastMessage > AI_RESPONSE_DELAY)) {
            console.log('Triggering AI response:', {
              isAIEnabled: aiSettings.isAIEnabled,
              userPreferredAI,
              isBusinessOnline,
              timeSinceLastMessage,
              AI_RESPONSE_DELAY
            });
            setTimeout(() => {
              handleAIResponse(trimmedMessage).catch(error => {
                console.error('Error in delayed AI response:', error);
              });
            }, 1500);
          } else {
            console.log('Skipping AI response:', {
              isAIEnabled: aiSettings.isAIEnabled,
              userPreferredAI,
              isBusinessOnline,
              timeSinceLastMessage,
              AI_RESPONSE_DELAY
            });
          }
        } catch (error) {
          console.error('Error fetching AI settings:', error);
        }

        lastMessageTime.current = currentTime;
      }
    } catch (error: any) {
      console.error('Error sending message:', {
        error,
        message: error.message,
        stack: error.stack
      });

      if (error.message?.includes('401') || error.status === 401) {
        auth.logout();
        setIsAuthenticated(false);
        setError('Your session has expired. Please sign in again.');
      } else if (!isConnected) {
        setError('Connection lost. Trying to reconnect...');
        if (currentChatRoom) {
          joinRoom(currentChatRoom);
        }
      } else {
        setError(error.message || 'Failed to send message. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Modify polling effect
  useEffect(() => {
    if (!isAuthenticated || !currentChatRoom || !isConnected) {
      console.log('Skipping polling setup - prerequisites not met:', {
        isAuthenticated,
        currentChatRoom,
        isConnected
      });
      return;
    }

    let isActive = true;
    let pollInterval: NodeJS.Timeout | null = null;
    let lastMessageTimestamp = Date.now();

    const pollMessages = async () => {
      if (!isActive || document.visibilityState !== 'visible') return;

      try {
        const token = auth.getToken();
        if (!token) {
          console.error('No auth token available for polling');
          return;
        }

        const response = await fetch(`/api/chat/${businessId}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to poll messages: ${response.status}`);
        }

        const newMessages = await response.json();
        console.log('Polled messages:', {
          count: newMessages.length,
          hasImages: newMessages.some((msg: ChatMessage) => !!msg.image)
        });

        setMessages(prevMessages => {
          // Create a Set of existing message IDs for faster lookup
          const existingMessageIds = new Set(prevMessages.map(msg => msg._id));
          const existingTempMessages = new Set(
            prevMessages
              .filter(msg => msg._id.startsWith('temp_'))
              .map(msg => `${msg.content}-${msg.senderType}-${msg.createdAt}-${JSON.stringify(msg.image)}`)
          );

          // Filter out duplicates more strictly
          const uniqueNewMessages = newMessages.filter((newMsg: ChatMessage) => {
            // Skip if we already have this message ID
            if (existingMessageIds.has(newMsg._id)) return false;

            // For messages that might be temporary, check content, timing, and image data
            const tempKey = `${newMsg.content}-${newMsg.senderType}-${newMsg.createdAt}-${JSON.stringify(newMsg.image)}`;
            if (existingTempMessages.has(tempKey)) return false;

            // Only include messages newer than our last check
            return new Date(newMsg.createdAt).getTime() > lastMessageTimestamp;
          });

          if (uniqueNewMessages.length === 0) {
            return prevMessages;
          }

          console.log(`Adding ${uniqueNewMessages.length} new unique messages from polling:`, {
            newMessages: uniqueNewMessages.map((msg: ChatMessage) => ({
              id: msg._id,
              hasImage: !!msg.image,
              imageUrl: msg.image?.url
            }))
          });
          
          // Combine and sort messages
          const mergedMessages = [...prevMessages, ...uniqueNewMessages].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          // Update last message timestamp
          lastMessageTimestamp = Date.now();

          if (mergedMessages.length > prevMessages.length) {
            setTimeout(scrollToBottom, 100);
          }
          
          return mergedMessages;
        });
      } catch (error) {
        console.error('Error during message polling:', error);
      }
    };

    console.log('Setting up polling mechanism');
    pollMessages();
    pollInterval = setInterval(pollMessages, 3000);

    return () => {
      console.log('Cleaning up polling mechanism');
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isAuthenticated, currentChatRoom, isConnected, businessId]);

  // Add visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible - fetching latest messages');
        loadMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Improved socket monitoring and reconnection effect
  useEffect(() => {
    // Only run if we have a socket and we're authenticated
    if (!socket || !isAuthenticated) return;
    
    // Report current socket status
    console.log('Socket connection status in ChatWindow:', {
      isConnected: socket.connected,
      isAuthenticated,
      currentChatRoom: currentChatRoom,
      socketId: socket?.id,
      context: isFromSearchResults ? 'search_results' : 'business_page'
    });

    // Clear any existing retry timer when effect reruns
    if (connectionRetryRef.current) {
      clearTimeout(connectionRetryRef.current);
      connectionRetryRef.current = undefined;
    }

    // If we're authenticated but socket is disconnected, try to reconnect
    if (!socket.connected) {
      console.log('Socket is disconnected in ChatWindow, attempting reconnection...', {
        context: isFromSearchResults ? 'search_results' : 'business_page',
        attempts: connectionAttemptsRef.current,
        maxAttempts: maxConnectionAttempts
      });
      
      // Only try to reconnect if we haven't exceeded max attempts
      if (connectionAttemptsRef.current < maxConnectionAttempts) {
        connectionAttemptsRef.current += 1;
        
        try {
          // Force reconnect with enhanced context data
          socket.io.opts.query = {
            ...socket.io.opts.query,
            reconnectAttempt: 'true',
            timestamp: Date.now(),
            context: isFromSearchResults ? 'search_results' : 'business_page',
            path: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
            businessId: businessId
          };
          
          // Log reconnection attempt
          console.log('Initiating socket reconnection attempt', {
            attempt: connectionAttemptsRef.current,
            maxAttempts: maxConnectionAttempts,
            context: isFromSearchResults ? 'search_results' : 'business_page'
          });
          
          // Connect the socket
          socket.connect();
          
          // Set up check to verify if connection succeeded
          connectionRetryRef.current = setTimeout(() => {
            if (!socket.connected) {
              console.log('Socket still disconnected after reconnection attempt');
            } else {
              console.log('Socket successfully reconnected');
              
              // Reset the counter on success
              connectionAttemptsRef.current = 0;
              
              // Re-join room if we have one
              if (currentChatRoom) {
                console.log('Re-joining chat room after reconnection:', currentChatRoom);
                joinRoom(currentChatRoom);
              }
            }
          }, 2000);
        } catch (err) {
          console.error('Error during socket reconnection attempt:', err);
        }
      } else {
        // If connected, reset the counter
        connectionAttemptsRef.current = 0;
      }
    } else {
      // If connected, reset the counter
      connectionAttemptsRef.current = 0;
    }

    return () => {
      if (connectionRetryRef.current) {
        clearTimeout(connectionRetryRef.current);
      }
    };
  }, [socket, isAuthenticated, isConnected, currentChatRoom, isFromSearchResults, businessId, joinRoom]);

  // Add business online status monitoring
  useEffect(() => {
    if (socket) {
      socket.on('business_status', (status: { online: boolean }) => {
        setIsBusinessOnline(status.online);
      });

      return () => {
        socket.off('business_status');
      };
    }
  }, [socket]);

  // If we're in search results context and the businessId is valid, wrap with socket provider
  if (isFromSearchResults && isValidObjectId) {
    // Add a special socket reconnection attempt just for search results context
    useEffect(() => {
      if (socket && !isConnected && isAuthenticated) {
        console.log('Search results context: Attempting to reconnect socket manually...');
        try {
          // Force reconnect with additional context parameters
          socket.io.opts.query = {
            ...socket.io.opts.query,
            reconnectAttempt: 'true',
            timestamp: Date.now(),
            context: 'search_results',
            locationPath: window.location.pathname
          };
          socket.connect();
          
          // Set a timeout to check if connection succeeded
          setTimeout(() => {
            if (!socket.connected) {
              console.log('Manual socket reconnection failed in search results context');
            } else {
              console.log('Manual socket reconnection succeeded in search results context');
            }
          }, 2000);
        } catch (err) {
          console.error('Error during manual socket reconnection:', err);
        }
      }
    }, [socket, isConnected, isAuthenticated]);
  }

  // Focused fix for socket connection issues in search results context
  // Don't change anything else to avoid creating new errors

  // Add this code after the existing socket connection status effect
  useEffect(() => {
    // Only run this special handler for search results context
    if (!isFromSearchResults || !socket || !isAuthenticated) return;
    
    console.log('Search results special socket connection handler activated', {
      businessId,
      isConnected: socket.connected,
      socketId: socket?.id
    });
    
    // If we're authenticated but not connected in search results context, try to reconnect
    if (!socket.connected) {
      console.log('Search results context: Socket not connected, attempting special handling');
      
      // Function to attempt reconnection
      const attemptSearchResultsReconnect = () => {
        try {
          // Force socket reconnection with additional context data
          socket.io.opts.query = {
            ...socket.io.opts.query,
            reconnectAttempt: 'true',
            timestamp: Date.now(),
            context: 'search_results',
            businessId,
            path: window.location.pathname
          };
          
          console.log('Search results: Forcing socket reconnection');
          socket.connect();
        } catch (err) {
          console.error('Error during search results socket reconnection:', err);
        }
      };
      
      // Execute the reconnection
      attemptSearchResultsReconnect();
      
      // Also set up a fallback timer to retry if needed
      const searchResultsTimer = setTimeout(() => {
        if (socket && !socket.connected) {
          console.log('Search results: Socket still not connected, retrying');
          attemptSearchResultsReconnect();
        }
      }, 3000);
      
      return () => clearTimeout(searchResultsTimer);
    }
    
    return undefined;
  }, [isFromSearchResults, socket, isAuthenticated, businessId]);

  // Update AI context when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Save the last 15 messages for context
      const recentMessages = messages.slice(-15);
      
      // Convert to AI message format - fixing the type issue
      const aiMessages: AIMessage[] = recentMessages.map(msg => ({
        role: msg.senderType === SenderType.USER ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
        appointmentDetails: lastAppointmentDetails // Attach appointment details to every message
      }));
      
      // Store in context
      setAIContext(aiMessages);
    }
  }, [messages, lastAppointmentDetails]); // Also update when lastAppointmentDetails changes

  // Add a new useEffect for body scroll locking
  useEffect(() => {
    // Only apply scroll lock on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      // Save original body styles
      const originalStyle = window.getComputedStyle(document.body).overflow;
      
      // Apply scroll lock to body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Clean up function to restore original styles when component unmounts
      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      };
    }
    return undefined; // Return undefined explicitly for TypeScript
  }, []);

  // Add effect to hide header on mobile view
  useEffect(() => {
    const hideHeaderOnMobile = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        // Target the main header element
        const header = document.querySelector('header');
        const mainContent = document.querySelector('main');
        
        // If found, hide header and adjust main content
        if (header) {
          // Save original display style
          const originalHeaderDisplay = window.getComputedStyle(header).display;
          header.style.display = 'none';
          
          let originalMainPadding = '';
          // Also adjust main content if needed to avoid white space
          if (mainContent) {
            originalMainPadding = window.getComputedStyle(mainContent).paddingTop;
            mainContent.style.paddingTop = '0';
          }
          
          // Return cleanup function
          return () => {
            header.style.display = originalHeaderDisplay;
            if (mainContent) {
              mainContent.style.paddingTop = originalMainPadding;
            }
          };
        }
      }
      // Return empty cleanup for TypeScript
      return () => {};
    };

    // Call the function and return its cleanup
    return hideHeaderOnMobile();
  }, []);

  // Add an effect to mark messages as read when AI responds
  useEffect(() => {
    if (currentChatRoom && messages.length > 0) {
      // Check if there are any unread business messages
      const hasUnreadBusinessMessages = messages.some(
        msg => msg.senderType === SenderType.BUSINESS && !msg.read
      );
      
      if (hasUnreadBusinessMessages) {
        markMessagesAsRead(currentChatRoom);
      }
    }
  }, [currentChatRoom, messages]);

  // Add message visibility tracking with Intersection Observer
  useEffect(() => {
    if (!currentChatRoom) return;
    
    // Only run if we have a valid chat room and messages
    const unreadMessages = messages.filter(msg => 
      msg.senderType === SenderType.BUSINESS && !msg.read
    );
    
    if (unreadMessages.length === 0) return;
    
    // Mark messages as read when they become visible
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleMessages = entries
          .filter(entry => entry.isIntersecting)
          .map(entry => entry.target.getAttribute('data-message-id'));
        
        if (visibleMessages.length > 0) {
          // Mark all currently visible messages as read
          setMessages(prev => 
            prev.map(msg => {
              if (visibleMessages.includes(msg._id) && 
                  msg.senderType === SenderType.BUSINESS && 
                  !msg.read) {
                return { ...msg, read: true };
              }
              return msg;
            })
          );
          
          // Call the API to update on server
          if (currentChatRoom) {
            markMessagesAsRead(currentChatRoom);
          }
        }
      },
      { threshold: 0.5 }
    );
    
    // Get all message elements
    const messageElements = document.querySelectorAll('[data-message-id]');
    messageElements.forEach(el => observer.observe(el));
    
    return () => {
      observer.disconnect();
    };
  }, [messages, currentChatRoom]);

  // Add data-message-id attribute to message elements
  const MessageElement = ({ message, imagePreview }: { message: ChatMessage; imagePreview?: string | null }) => {
    return (
      <div data-message-id={message._id}>
        <MessageBubble message={message} imagePreview={imagePreview} />
      </div>
    );
  };

  const ChatHeader = ({ isError = false, errorMessage = null }: { isError?: boolean, errorMessage?: string | null }) => (
    <div className="p-4 border-b bg-white rounded-t-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button
            onClick={onClose}
            className="md:hidden flex-shrink-0 rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className={`flex-shrink-0 w-2 h-2 rounded-full ${isError ? errorMessage?.includes('sign in') ? 'bg-violet-500' : 'bg-red-500' : isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <h3 className="font-semibold text-gray-800 truncate">
            {isError ? 
              errorMessage?.includes('sign in') ? 'Authentication Required' : 'Chat Error' 
              : businessName ? `Flint with ${businessName}` : 'Loading...'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!isError && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={userPreferredAI}
                onClick={toggleUserAIPreference}
                disabled={isAIToggleLoading}
                className={`
                  relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full 
                  transition-colors duration-200 ease-in-out focus:outline-none
                  ${isAIToggleLoading ? 'opacity-50' : ''}
                  ${userPreferredAI ? 'bg-violet-600' : 'bg-gray-200'}
                `}
                title={userPreferredAI ? "AI responses enabled - Click to disable" : "AI responses disabled - Click to enable"}
              >
                <span className="sr-only">Toggle AI responses</span>
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full 
                    bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${userPreferredAI ? 'translate-x-4' : 'translate-x-0.5'}
                    ${isAIToggleLoading ? 'animate-pulse' : ''}
                  `}
                  style={{ marginTop: '2px' }}
                />
              </button>
              <span className="text-xs font-medium text-gray-600">
                AI
              </span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="md:flex hidden flex-shrink-0 hover:bg-gray-100 rounded-full h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[380px] w-full h-full md:h-[500px] bg-white rounded-lg shadow-xl border overflow-hidden flex flex-col z-50 md:z-auto">
        <ChatHeader isError errorMessage={error} />
        <div className="flex flex-col items-center justify-center flex-1 p-8 bg-gray-50">
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto rounded-full bg-violet-100 p-3 w-16 h-16 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600">
                  <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"></path>
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Sign In Required</h3>
            <p className="text-gray-600 mb-6 max-w-xs mx-auto">
              Please sign in to your account to access the chat feature and communicate with this business.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.href = '/signin'} 
                className="bg-violet-600 hover:bg-violet-700 text-white font-medium"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = '/signup'} 
                variant="outline" 
                className="text-violet-700 border-violet-200 hover:bg-violet-50"
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use a wrapper component when in search results context to ensure socket is available
  if (isFromSearchResults && !socket) {
    console.log('No socket in search results context, providing local SocketProvider');
    return (
      <SocketProvider type="user">
        <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[380px] w-full h-full md:h-[500px] bg-white rounded-lg shadow-xl border overflow-hidden flex flex-col z-50 md:z-auto">
          <ChatHeader isError errorMessage="Connection error" />
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center text-red-600">
              <p className="mb-2">Unable to connect to chat server</p>
              <p className="text-sm text-gray-600">Please try again later</p>
            </div>
          </div>
        </div>
      </SocketProvider>
    );
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[380px] w-full h-full md:h-[500px] bg-white rounded-lg shadow-xl border overflow-hidden flex flex-col z-50 md:z-auto">
      <ChatHeader />
      {!isConnected && (
        <div className="bg-yellow-50 text-yellow-600 px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></div>
            Reconnecting...
          </div>
          <button 
            onClick={() => socket?.connect()} 
            className="text-xs underline hover:text-yellow-700"
          >
            Try Now
          </button>
        </div>
      )}

      <ScrollArea 
        className="flex-1 p-4 bg-gray-50 overflow-y-auto" 
        data-scroll-lock="true"
        style={{ height: 'calc(100% - 140px)', maxHeight: 'calc(100% - 140px)' }}
      >
        <div 
          className="space-y-4 min-h-full w-full pb-4"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            e.stopPropagation();
            // Prevent the default browser behavior only if we've scrolled to the top or bottom
            const scrollElement = e.currentTarget.parentElement;
            if (scrollElement) {
              const isAtTop = scrollElement.scrollTop <= 0;
              const isAtBottom = scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight;
              if ((isAtTop && e.touches[0].clientY > 0) || 
                  (isAtBottom && e.touches[0].clientY < 0)) {
                e.preventDefault();
              }
            }
          }}
        >
          {messages.map((message) => (
            <MessageElement 
              key={message._id} 
              message={message} 
              imagePreview={message._id.startsWith('temp_') ? imagePreview : null}
            />
          ))}
          <div ref={messagesEndRef} style={{ height: '1px', marginBottom: '-1px' }} />
        </div>
        {isTyping && (
          <div className="flex items-center space-x-2 mt-4 text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">Someone is typing...</span>
          </div>
        )}
      </ScrollArea>

      <form 
        onSubmit={handleSendMessage} 
        className="p-3 border-t bg-white rounded-b-lg mt-auto"
      >
        <div className="flex flex-col gap-2">
          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Selected image"
                className="max-h-[100px] rounded-lg"
              />
              <button
                type="button"
                onClick={handleImageClear}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              className="flex-1"
              disabled={!isAuthenticated || isLoading}
              ref={inputRef}
            />
            <Button type="submit" disabled={!isAuthenticated || isLoading}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 