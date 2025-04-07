'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { Send, MessageCircle, Loader2, ArrowLeft, Check, CheckCheck, Image as ImageIcon, Smile, Paperclip, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { auth } from '@/lib/auth';

interface Message {
  _id: string;
  content: string;
  senderId: string;
  senderType: 'USER' | 'BUSINESS';
  read: boolean;
  createdAt: string;
  isAI?: boolean;
}

interface ChatRoom {
  _id: string;
  business: {
    business_name: string;
    images: { url: string }[];
  };
  businessId?: string;
  messages: Message[];
}

const POLLING_INTERVAL = 3000; // Poll every 3 seconds

export default function ChatRoomContent({
  params
}: {
  params: { roomId: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const componentId = useRef(Math.random().toString(36).substring(7));
  
  console.log(`ChatRoomContent mounted (ID: ${componentId.current})`, { 
    roomId: params.roomId,
    timestamp: new Date().toISOString()
  });
  
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userPreferredAI, setUserPreferredAI] = useState(true);
  const [isAIToggleLoading, setIsAIToggleLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef<number>(0);
  const pollingTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [aiContext, setAIContext] = useState<{ role: 'assistant' | 'user'; content: string; timestamp: string }[]>([]);
  const [isAIEnabled, setIsAIEnabled] = useState<boolean>(true);
  const lastMessageTime = useRef<number>(Date.now());
  const AI_RESPONSE_DELAY = 10000; // 10 seconds
  const [isBusinessTyping, setIsBusinessTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showTyping, setShowTyping] = useState<boolean>(false);
  const [lastAppointmentDetails, setLastAppointmentDetails] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messageObserverRef = useRef<IntersectionObserver | null>(null);
  const visibleMessagesRef = useRef<Set<string>>(new Set());

  const fetchChatRoom = async () => {
    try {
      console.log(`Fetching chat room (Component ID: ${componentId.current}):`, params.roomId);
      const response = await fetch(`/api/chat/rooms/${params.roomId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat room');
      }
      
      const data = await response.json();
      console.log(`Fetched chat room data (Component ID: ${componentId.current}):`, {
        businessName: data.business?.business_name,
        messageCount: data.messages?.length,
        roomId: data._id,
        hasBusinessId: !!data.businessId,
        businessId: data.businessId
      });
      
      setChatRoom(data);
      
      // Update previous message count
      previousMessageCount.current = data.messages?.length || 0;
    } catch (error) {
      console.error(`Error fetching chat room (Component ID: ${componentId.current}):`, error);
      setError(error instanceof Error ? error.message : 'Failed to fetch chat room');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    console.log('Starting polling for chat room:', params.roomId);
    
    // Clear any existing polling
    if (pollingTimeoutRef.current) {
      console.log('Clearing existing polling timeout');
      clearTimeout(pollingTimeoutRef.current);
    }

    // Set up new polling
    const poll = async () => {
      if (!document.hidden) { // Only poll when tab is visible
        try {
          console.log('Polling for new messages...');
          const response = await fetch(`/api/chat/rooms/${params.roomId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch chat room');
          }
          const data = await response.json();
          
          // Only update if there are new messages
          if (data.messages?.length > previousMessageCount.current) {
            console.log('New messages found:', {
              previous: previousMessageCount.current,
              current: data.messages.length,
              new: data.messages.length - previousMessageCount.current
            });
            setChatRoom(data);
            previousMessageCount.current = data.messages.length;
          } else {
            console.log('No new messages');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      } else {
        console.log('Tab is hidden, skipping poll');
      }

      // Schedule next poll
      pollingTimeoutRef.current = setTimeout(poll, POLLING_INTERVAL);
    };

    // Start first poll
    poll();
  };

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, fetching latest messages');
        fetchChatRoom();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Main effect for fetching data when roomId changes
  useEffect(() => {
    console.log(`Component mounted or roomId changed (ID: ${componentId.current})`, {
      roomId: params.roomId
    });
    
    // Initial fetch
    fetchChatRoom();
    
    // Start polling
    startPolling();

    // Reset previous message count when room changes
    previousMessageCount.current = 0;

    // Cleanup polling on unmount or roomId change
    return () => {
      console.log(`Component unmounting or roomId changing (ID: ${componentId.current})`, {
        roomId: params.roomId
      });
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [params.roomId]); // Explicitly depend on params.roomId

  useEffect(() => {
    // Function to properly position container without affecting page scroll
    const preScrollToBottom = () => {
      if (scrollContainerRef.current) {
        // Use this approach which only affects the container's scroll position
        // and not the entire page
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        console.log('Positioned container to latest messages without affecting page scroll');
      }
    };
    
    // Only call after a small delay to ensure the DOM is ready
    const timer = setTimeout(preScrollToBottom, 100);
    
    return () => clearTimeout(timer);
  }, [chatRoom?.messages?.length]);

  useEffect(() => {
    if (chatRoom?.messages && !loading) {
      const currentMessageCount = chatRoom.messages.length;
      
      if (previousMessageCount.current === 0 || currentMessageCount > previousMessageCount.current) {
        console.log('New messages detected, updating scroll container');
        
        // Only scroll the container itself, not the page
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }
      
      previousMessageCount.current = currentMessageCount;
    }
  }, [chatRoom?.messages, loading]);

  const fetchAISettings = async () => {
    try {
      console.log('Fetching AI settings from API...');
      const token = auth.getToken();
      console.log('Using auth token for settings:', !!token);
      
      const response = await fetch(`/api/business/settings/ai`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      console.log('AI settings API response status:', response.status);
      
      if (!response.ok) {
        console.error('Failed to fetch AI settings:', response.status);
        return;
      }

      const data = await response.json();
      console.log('Fetched AI settings data:', data);
      const previousValue = isAIEnabled;
      setIsAIEnabled(data.isAIEnabled ?? true);
      console.log('Updated isAIEnabled:', {
        previous: previousValue,
        current: data.isAIEnabled ?? true,
        usingDefault: data.isAIEnabled === undefined
      });
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    }
  };

  useEffect(() => {
    fetchAISettings();
  }, []);

  const handleAIResponse = async (userMessage: string) => {
    console.log('handleAIResponse called with message:', userMessage);
    try {
      console.log('Starting AI response process for room:', params.roomId);
      
      // Fetch latest AI settings before proceeding
      try {
        console.log('Fetching latest AI settings...');
        await fetchAISettings();
        console.log('AI settings fetched, isAIEnabled:', isAIEnabled);
        if (!isAIEnabled) {
          console.log('AI responses are currently disabled for this business');
          return;
        }
      } catch (error) {
        console.error('Error fetching AI settings:', error);
        return;
      }
      
      // Check if we have the required data
      if (!chatRoom || !chatRoom.business) {
        console.error('Missing required data:', { chatRoom });
        throw new Error('Missing required data for AI response');
      }

      // Extract the businessId properly from the chat room data
      // The ChatRoom model stores the actual business ID as an ObjectId
      // We need to use this directly rather than trying to extract it from the room ID
      let businessId: string;
      
      if (chatRoom.businessId) {
        // If businessId is directly available on the chat room object
        businessId = typeof chatRoom.businessId === 'string' 
          ? chatRoom.businessId 
          : String(chatRoom.businessId);
        console.log('Using businessId from chatRoom object:', businessId);
      } else {
        // Fallback to extracting from room ID if needed
        businessId = params.roomId.split('_')[0] || '';
        console.log('Extracted business ID from room ID:', businessId);
      }
      
      // Make sure we have a valid business ID
      if (!businessId) {
        console.error('Could not determine business ID for AI request');
        throw new Error('Missing business ID for AI request');
      }

      // Use business data we already have
      const businessDetails = {
        name: chatRoom.business.business_name,
        // Use empty or default values for other fields
        description: '',
        category: '',
        services: [],
        location: {
          address: '',
          city: '',
          state: '',
          zip_code: ''
        },
        phone: '',
        email: '',
        website: '',
        hours: {},
        features: {}
      };

      // Get token for authentication
      const token = auth.getToken();
      console.log('Using auth token for AI request:', !!token);
      if (!token) {
        console.error('No auth token available');
        throw new Error('Authentication required');
      }

      console.log('Sending AI response request with business ID:', businessId);
      console.log('Chat room ID for AI request:', params.roomId);

      // Create AI context from previous messages
      const aiContext = chatRoom.messages
        .slice(Math.max(0, chatRoom.messages.length - 10)) // Use only the last 10 messages for context
        .map(msg => ({
          role: msg.senderType === 'USER' ? 'user' : 'assistant',
          content: msg.content
        }));

      // Prepare the request payload
      const requestBody = {
        message: userMessage,
        userId: getUserIdFromPath(),
        businessId,
        chatRoomId: params.roomId,
        context: aiContext,
        businessName: chatRoom.business.business_name,
        businessDetails,
        lastAppointmentDetails // Include the lastAppointmentDetails in the request
      };
      console.log('AI request payload:', JSON.stringify(requestBody));
      
      console.log('Sending fetch request to /api/chat/ai-response...');
      const aiResponse = await fetch('/api/chat/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });

      console.log('AI response status:', aiResponse.status);
      console.log('AI response headers:', Object.fromEntries([...aiResponse.headers.entries()]));

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI response error detailed:', {
          status: aiResponse.status,
          statusText: aiResponse.statusText,
          error: errorText,
          url: aiResponse.url
        });
        throw new Error(`Failed to get AI response: ${aiResponse.status} ${errorText}`);
      }

      const data = await aiResponse.json();
      
      // Support both old and new response formats
      const responseText = data.text || data.response;
      
      console.log('Received AI response data:', {
        hasResponse: !!responseText,
        responseLength: responseText?.length,
        responseType: data.responseType
      });

      if (!responseText) {
        console.error('No response content in AI data:', data);
        throw new Error('No response content received from AI');
      }

      // Update the lastAppointmentDetails state if present in the response
      if (data.appointmentDetails && data.isAppointmentRequest) {
        setLastAppointmentDetails(data.appointmentDetails);
        console.log('Updated lastAppointmentDetails:', data.appointmentDetails);
      }
      
      // Check if we got a response message
      if (responseText) {
        // Send AI message to the API
        console.log('Sending AI message to API...');
        const aiMessageResponse = await fetch(`/api/chat/rooms/${params.roomId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            content: responseText,
            senderType: 'BUSINESS',
            isAI: true
          }),
        });

        if (!aiMessageResponse.ok) {
          throw new Error('Failed to send AI message');
        }

        console.log('AI message sent successfully, refreshing chat room');
        await fetchChatRoom();

        // Update AI context
        setAIContext(prev => [
          ...prev,
          { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
          { role: 'assistant', content: responseText, timestamp: new Date().toISOString() }
        ]);
      }

    } catch (error) {
      console.error('Error in AI response:', error);
      toast({
        title: "AI Response Error",
        description: error instanceof Error ? error.message : "Failed to get AI response",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');
    
    try {
      console.log('Sending new message to room:', params.roomId);
      const response = await fetch(`/api/chat/rooms/${params.roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: messageContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      console.log('Message sent successfully, status:', response.status);
      // Fetch latest messages
      await fetchChatRoom();
      
      // Use the container-based scrolling approach
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        console.log('Positioned container to latest messages after sending message');
      }
      
      // Check if AI should respond
      lastMessageTime.current = Date.now();
      
      // Extract businessId from roomId (format is usually businessId_userId)
      const businessId = params.roomId.split('_')[0];
      
      console.log('AI response decision point:', { 
        userPreferredAI, 
        isAIEnabled, 
        shouldTriggerAI: userPreferredAI && isAIEnabled,
        roomId: params.roomId,
        extractedBusinessId: businessId
      });
      
      if (userPreferredAI && isAIEnabled) {
        console.log('AI is enabled, will generate response after delay');
        // Add a slight delay before AI response to make it feel more natural
        setTimeout(() => {
          // Double check that we still have the chat room data
          if (!chatRoom) {
            console.error('Chat room data not available for AI response');
            return;
          }
          
          console.log('Triggering AI response for message:', messageContent);
          handleAIResponse(messageContent).catch(error => {
            console.error('Error in AI response:', error);
            // Show user feedback for AI response error
            toast({
              title: "AI Response Error",
              description: "The AI could not generate a response. Please try again later.",
              variant: "destructive",
            });
          });
        }, 1000);
      } else {
        console.log('AI is disabled, skipping response', { userPreferredAI, isAIEnabled });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Enhanced date formatting
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };
  
  // Group messages by date
  const groupMessagesByDate = (messages: Message[] | undefined) => {
    if (!messages || !messages.length) return [];
    
    const groups: { date: string; messages: Message[] }[] = [];
    
    messages.forEach(message => {
      const messageDate = new Date(message.createdAt).toDateString();
      const existingGroup = groups.find(group => group.date === messageDate);
      
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date: messageDate, messages: [message] });
      }
    });
    
    return groups;
  };

  const formatDateHeading = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  // Simulate business typing randomly (for UI enhancement)
  useEffect(() => {
    const randomlyShowTyping = () => {
      // 10% chance of showing typing indicator
      if (Math.random() < 0.1 && chatRoom?.messages.length) {
        setIsBusinessTyping(true);
        setTimeout(() => setIsBusinessTyping(false), 3000);
      }
    };
    
    const interval = setInterval(randomlyShowTyping, 20000);
    return () => clearInterval(interval);
  }, [chatRoom?.messages]);

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
      
      // Dispatch an event to notify other components about the preference change
      window.dispatchEvent(new CustomEvent('ai-preference-changed', { 
        detail: { aiEnabled: enabled }
      }));
      
      toast({
        title: enabled ? "AI responses enabled" : "AI responses disabled",
        description: enabled 
          ? "Your messages will now include AI suggestions" 
          : "AI suggestions have been turned off",
      });
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

  // Update the toggle function to save the preference
  const toggleUserAIPreference = () => {
    const newValue = !userPreferredAI;
    saveUserPreference(newValue);
  };

  // Load preferences when component mounts
  useEffect(() => {
    loadUserPreferences();
    
    // Listen for preference changes from other components
    const handlePreferenceChange = (event: CustomEvent) => {
      const { aiEnabled } = event.detail;
      console.log('AI preference changed event received:', aiEnabled);
      setUserPreferredAI(aiEnabled);
    };
    
    window.addEventListener('ai-preference-changed', handlePreferenceChange as EventListener);
    
    return () => {
      window.removeEventListener('ai-preference-changed', handlePreferenceChange as EventListener);
    };
  }, []);

  // Helper function to get the user ID from pathname
  const getUserIdFromPath = () => {
    const parts = params.roomId.split('_');
    return parts.length > 1 ? parts[1] : '';
  };

  // Function to mark messages as read when they become visible
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) return;
    
    console.log('========== MARK MESSAGES AS READ ==========');
    console.log('Marking messages as read:', messageIds);
    console.log('Chat Room ID:', params.roomId);
    
    try {
      // Get the auth token to verify user is authenticated
      const token = auth.getToken();
      console.log('Auth token present:', !!token);
      
      // Debug user ID from JWT if possible
      try {
        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('Auth token decoded payload:', {
              userId: payload.userId,
              exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
              valid: payload.exp ? (payload.exp * 1000 > Date.now()) : false
            });
          }
        }
      } catch (e) {
        console.error('Error decoding JWT token:', e);
      }
      
      // Debug user ID from chat room params
      const roomParts = params.roomId.split('_');
      const userIdFromRoom = roomParts.length > 1 ? roomParts[1] : '';
      console.log('User ID from room ID:', userIdFromRoom);
      
      // Validate message IDs to make sure they are proper format
      const validMessageIds = messageIds.filter(id => {
        // Check if it's a valid MongoDB ObjectId format (24-character hex string)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        if (!isValidObjectId) {
          console.warn(`Skipping invalid message ID format: ${id}`);
        }
        return isValidObjectId;
      });
      
      console.log(`Valid message IDs: ${validMessageIds.length} of ${messageIds.length}`);
      
      if (validMessageIds.length === 0) {
        console.error('No valid message IDs to mark as read');
        return;
      }
      
      // Capture cookies to verify they're set correctly
      console.log('Document cookies:', document.cookie.split(';').map(c => c.trim()).filter(c => c.startsWith('authToken=')).length > 0 ? 'authToken cookie exists' : 'NO authToken cookie');
      
      const response = await fetch(`/api/chat/mark-as-read/${params.roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Auth-Context': 'chat-user',
          'X-Request-Source': 'chat-interface',
        },
        body: JSON.stringify({ messageIds: validMessageIds }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        
        // If we got a 404, try a different approach
        if (response.status === 404) {
          console.log('Trying direct cookie authentication instead of Authorization header...');
          // Ensure the auth token is in cookies directly (not just in the header)
          if (token) {
            document.cookie = `authToken=${token}; path=/; max-age=2592000; SameSite=Lax`;
            
            // Try again with the request
            const retryResponse = await fetch(`/api/chat/mark-as-read/${params.roomId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Important: include credentials
              body: JSON.stringify({ messageIds: validMessageIds }),
            });
            
            console.log('Retry response status:', retryResponse.status);
            
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              console.log('Retry mark as read response:', data);
              // Update UI with the retry response
              processSuccessResponse(data, validMessageIds);
              return;
            } else {
              console.error('Retry also failed:', await retryResponse.text());
            }
          }
        }
        return;
      }

      const data = await response.json();
      console.log('Mark as read response:', data);
      
      // Process the successful response
      processSuccessResponse(data, validMessageIds);
      
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [params.roomId]);
  
  // Helper function to process successful mark-as-read responses
  const processSuccessResponse = useCallback((data: any, validMessageIds: string[]) => {
    // Update UI
    setChatRoom(prev => {
      if (!prev) return prev;
      
      const updatedMessages = prev.messages.map(msg => {
        if (validMessageIds.includes(msg._id) && msg.senderType === 'BUSINESS') {
          return { ...msg, read: true };
        }
        return msg;
      });
      
      return { ...prev, messages: updatedMessages };
    });

    // Update unread count
    setUnreadCount(prev => {
      const newCount = Math.max(0, prev - (data.messagesUpdated || 0));
      console.log(`Updated unread count: ${prev} -> ${newCount}`);
      return newCount;
    });
    
    // Dispatch event to update chat list
    window.dispatchEvent(new CustomEvent('chat-messages-read', { 
      detail: { chatRoomId: params.roomId, count: data.messagesUpdated || 0 } 
    }));
    
    console.log(`Marked ${data.messagesUpdated || 0} messages as read in database`);
    console.log('============================================');
  }, [params.roomId]);

  // add debug output to check if data-message-id is being rendered
  useEffect(() => {
    if (chatRoom) {
      console.log('DEBUG: Rendering messages with data-message-id attribute');
      // wait for rendering to complete
      setTimeout(() => {
        const messageElements = document.querySelectorAll('[data-message-id]');
        console.log(`DEBUG: Found ${messageElements.length} elements with data-message-id attribute`);
        messageElements.forEach(el => {
          const messageId = el.getAttribute('data-message-id');
          const senderType = el.getAttribute('data-sender-type');
          // Find the actual message data
          const messageData = chatRoom.messages.find(msg => msg._id === messageId);
          console.log(`DEBUG: Element with data-message-id=${messageId}, sender=${senderType}, content="${messageData?.content?.substring(0, 30)}...", read=${messageData?.read}`);
        });

        // Also log all unread business messages
        const unreadBusinessMessages = chatRoom.messages.filter(
          msg => msg.senderType === 'BUSINESS' && !msg.read
        );
        console.log(`DEBUG: Unread business messages count: ${unreadBusinessMessages.length}`);
        unreadBusinessMessages.forEach(msg => {
          console.log(`DEBUG: Unread message ID=${msg._id}, content="${msg.content.substring(0, 30)}..."`);
        });
      }, 500);
    }
  }, [chatRoom]);

  // Setup IntersectionObserver to detect visible messages
  useEffect(() => {
    if (!chatRoom) return;
    
    console.log('Setting up IntersectionObserver for message visibility tracking');
    
    // Create a map to track which business messages need to be marked as read
    const unreadBusinessMessages = chatRoom.messages.filter(
      msg => msg.senderType === 'BUSINESS' && !msg.read
    );
    
    console.log(`Found ${unreadBusinessMessages.length} unread business messages to observe`);
    
    if (unreadBusinessMessages.length === 0) {
      console.log('No unread messages to observe, skipping observer setup');
      return; // No unread messages to observe
    }
    
    // Setup observer
    messageObserverRef.current = new IntersectionObserver(
      (entries) => {
        console.log(`Intersection observed: ${entries.length} entries`);
        let newVisibleMessages = false;
        
        entries.forEach(entry => {
          const messageId = entry.target.getAttribute('data-message-id');
          if (!messageId) {
            console.log('Element missing data-message-id attribute:', entry.target);
            return;
          }
          
          if (entry.isIntersecting) {
            // Message is now visible
            console.log(`Message ${messageId} now visible (${entry.intersectionRatio.toFixed(2)})`);
            visibleMessagesRef.current.add(messageId);
            newVisibleMessages = true;
          } else {
            // Message is no longer visible
            console.log(`Message ${messageId} no longer visible`);
            visibleMessagesRef.current.delete(messageId);
          }
        });
        
        // If we have newly visible messages that need to be marked as read
        if (newVisibleMessages) {
          const visibleUnreadIds = unreadBusinessMessages
            .filter(msg => visibleMessagesRef.current.has(msg._id))
            .map(msg => msg._id);
            
          console.log(`${visibleUnreadIds.length} visible unread messages to mark as read`);
          console.log('Message IDs format example:', visibleUnreadIds.length > 0 ? visibleUnreadIds[0] : 'none');
          
          if (visibleUnreadIds.length > 0) {
            markMessagesAsRead(visibleUnreadIds);
          }
        }
      },
      { threshold: 0.6 } // Message is considered visible when 60% is in view
    );
    
    // Observe message elements
    setTimeout(() => {
      const messageElements = document.querySelectorAll('[data-message-id][data-sender-type="BUSINESS"]:not([data-read="true"])');
      console.log(`Found ${messageElements.length} unread business message elements to observe`);
      
      messageElements.forEach(el => {
        messageObserverRef.current?.observe(el);
        console.log(`Now observing element with data-message-id: ${el.getAttribute('data-message-id')}`);
      });
    }, 100); // Short delay to ensure DOM is updated
    
    return () => {
      console.log('Disconnecting IntersectionObserver');
      messageObserverRef.current?.disconnect();
    };
  }, [chatRoom, markMessagesAsRead]);

  // Update unread count when chat room changes
  useEffect(() => {
    if (chatRoom) {
      const unread = chatRoom.messages.filter(
        msg => msg.senderType === 'BUSINESS' && !msg.read
      ).length;
      setUnreadCount(unread);
      
      // If there are unread messages, mark them as read immediately
      if (unread > 0) {
        const unreadMessageIds = chatRoom.messages
          .filter(msg => msg.senderType === 'BUSINESS' && !msg.read)
          .map(msg => msg._id);
        console.log('Marking messages as read on load, count:', unreadMessageIds.length);
        markMessagesAsRead(unreadMessageIds);
      }
    }
  }, [chatRoom, markMessagesAsRead]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 rounded-full p-4">
          <MessageCircle className="w-12 h-12 text-red-400" />
        </div>
        <p className="mt-4 text-gray-600 text-center font-medium">{error}</p>
        <Button
          variant="outline"
          className="mt-6 font-medium"
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchChatRoom();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#f5f7fb]">
      {/* Enhanced Header with AI Toggle */}
      <div className="flex-none bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="w-full">
          <div className="flex items-center h-16 px-4">
            {/* Back button - now integrated into the header layout */}
            <div className="md:hidden mr-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-gray-100"
                onClick={() => {
                  // More reliable navigation handling - checks both routing scenarios
                  try {
                    // First try URL param approach
                    const url = new URL(window.location.href);
                    const roomIdParam = url.searchParams.get('roomId');
                    
                    if (roomIdParam) {
                      // We're in the main chat interface with a roomId param
                      url.searchParams.delete('roomId');
                      window.history.pushState({}, '', url.toString());
                      
                      // Dispatch both a popstate and storage event for better detection
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      window.dispatchEvent(new Event('storage')); // This can help trigger useEffect hooks
                    } else {
                      // We might be in a standalone chat view
                      router.push('/chat');
                    }
                  } catch (err) {
                    console.error('Navigation error:', err);
                    // Fallback to simple navigation
                    router.push('/chat');
                  }
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            
            {loading ? (
              <div className="flex items-center space-x-4 flex-1">
                <div className="animate-pulse flex space-x-4 items-center">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ) : chatRoom ? (
              <>
                <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
                  {chatRoom.business.images?.[0]?.url ? (
                    <AvatarImage src={chatRoom.business.images[0].url} alt={chatRoom.business.business_name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-violet-50 to-violet-100">
                      {(chatRoom.business.business_name || 'BU').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0 ml-4">
                  <h2 className="text-base font-semibold text-gray-900 truncate">
                    {chatRoom.business.business_name}
                  </h2>
                  <div className="flex items-center mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full ring-1 ring-green-500/30"></div>
                    <span className="ml-1.5 text-xs text-green-600 font-medium">Active now</span>
                  </div>
                </div>
                {/* Add AI Toggle */}
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-medium text-gray-600 flex items-center">
                          <Brain className="h-3 w-3 mr-1 text-violet-500" />
                          AI
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">{userPreferredAI ? 'AI responses are enabled' : 'AI responses are disabled'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Messages Area with explicit scrolling behavior */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent" 
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: '#a1a1aa transparent',
            scrollBehavior: 'auto'
          }}
        >
          <div className="py-6 px-4 max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-end space-x-2 max-w-[70%]">
                    {i % 2 !== 0 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 shadow-sm" />
                    )}
                    <div className="space-y-1">
                      <div className={`h-16 ${
                        i % 2 === 0 ? 'bg-violet-100' : 'bg-gray-100'
                      } rounded-2xl w-64 animate-pulse shadow-sm`} />
                      <div className="h-2 bg-gray-100 rounded w-20 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : chatRoom?.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <MessageCircle className="w-12 h-12 text-violet-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Start a Conversation</h3>
                <p className="text-base text-gray-500 max-w-sm mb-6">
                  Send a message to {chatRoom?.business.business_name} to get the conversation started
                </p>
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 w-full max-w-md">
                  <p className="text-sm text-gray-600 mb-3">Try one of these conversation starters:</p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto py-2 text-sm font-normal"
                      onClick={() => setNewMessage("Hi, I'm interested in your services. Can you tell me more?")}
                    >
                      Hi, I'm interested in your services. Can you tell me more?
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto py-2 text-sm font-normal"
                      onClick={() => setNewMessage("Do you have any availability in the next few days?")}
                    >
                      Do you have any availability in the next few days?
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto py-2 text-sm font-normal"
                      onClick={() => setNewMessage("What are your rates for your services?")}
                    >
                      What are your rates for your services?
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {groupMessagesByDate(chatRoom?.messages).map((group, groupIndex) => (
                  <div key={group.date} className="space-y-4">
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-[#f5f7fb] px-3 text-xs font-medium text-gray-500">
                          {formatDateHeading(group.date)}
                        </span>
                      </div>
            </div>
                    
                    {group.messages.map((message, messageIndex) => {
                      const isUser = message.senderType === 'USER';
                      const isLast = messageIndex === group.messages.length - 1;
                      const showAvatar = !isUser && (!isLast || message.senderType !== group.messages[messageIndex - 1]?.senderType);

                      return (
                        <div
                          key={message._id}
                          data-message-id={message._id}
                          data-sender-type={message.senderType}
                          data-read={message.read ? "true" : "false"}
                          className={cn(
                            'flex',
                            message.senderType === 'USER' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div className={`flex items-end space-x-2 max-w-[75%] ${!showAvatar ? 'ml-10' : ''}`}>
                            {showAvatar && chatRoom && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                {chatRoom.business?.images?.[0]?.url ? (
                                  <AvatarImage 
                                    src={chatRoom.business.images[0].url}
                                    alt={chatRoom.business?.business_name || 'Business'} 
                                  />
                                ) : (
                                  <AvatarFallback className="bg-gradient-to-br from-violet-50 to-violet-100 text-xs">
                                    {chatRoom.business?.business_name ? 
                                      chatRoom.business.business_name.substring(0, 2).toUpperCase() : 
                                      'BU'}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            )}
                            <div>
                              <div
                                className={cn(
                                  'px-4 py-2.5 rounded-2xl shadow-sm transition-all relative',
                                  isUser
                                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none'
                                  : 'bg-white ring-1 ring-gray-100 rounded-bl-none'
                                )}
                              >
                                {!isUser && message.isAI && (
                                  <span className="absolute -top-2 -right-2 bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                                    AI
                                  </span>
                                )}
                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              </div>
                              <div
                                className={cn(
                                  'mt-1 flex items-center text-[11px] space-x-1',
                                  isUser ? 'justify-end text-gray-400' : 'justify-start text-gray-400'
                                )}
                              >
                                <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
                                {isUser && isLast && (
                                  <span className="ml-1">
                                    {message.read ? 
                                      <CheckCheck className="h-3 w-3 text-blue-500" /> : 
                                      <Check className="h-3 w-3" />
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                
                {/* Typing indicator */}
                {isBusinessTyping && chatRoom && (
                  <div className="flex justify-start">
                    <div className="flex items-end space-x-2 max-w-[75%]">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        {chatRoom.business?.images?.[0]?.url ? (
                          <AvatarImage 
                            src={chatRoom.business.images[0].url} 
                            alt={chatRoom.business.business_name || 'Business'} 
                          />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-violet-50 to-violet-100 text-xs">
                            {(chatRoom.business?.business_name || 'B').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm ring-1 ring-gray-100">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} data-messages-end="true" className="h-px w-full" />
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Enhanced Message Input */}
      <div className="flex-none bg-white border-t shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <div className="flex-none flex space-x-1">
              <Button type="button" size="icon" variant="ghost" className="rounded-full text-gray-500 hover:text-violet-600 hover:bg-violet-50">
                <ImageIcon className="h-5 w-5" />
              </Button>
            </div>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={loading || sending}
              className="flex-1 bg-gray-50 border-gray-200 focus:ring-violet-500 focus:border-violet-500 text-[14px] py-5 rounded-full shadow-sm"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || loading || sending}
              className={cn(
                'rounded-full h-10 w-10 p-0 flex items-center justify-center shadow-sm',
                newMessage.trim() && !loading && !sending
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
              )}
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 