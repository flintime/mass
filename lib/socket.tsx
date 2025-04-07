'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from './auth';
import { businessAuth } from './businessAuth';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (data: {
    chatRoomId: string;
    content: string;
    senderId: string;
    senderType: string;
    isAI?: boolean;
    image?: {
      url: string;
      type: string;
      size: number;
    };
  }) => void;
  setTypingStatus: (chatRoomId: string, isTyping: boolean) => void;
  onMessage: (handler: (message: any) => void) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinRoom: () => {},
  leaveRoom: () => {},
  sendMessage: () => {},
  setTypingStatus: () => {},
  onMessage: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
  type: 'user' | 'business';
  forceContext?: 'chat_enabled' | 'search_results' | 'business_page';
}

export function SocketProvider({ children, type, forceContext }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authenticatedId, setAuthenticatedId] = useState<string | null>(null);
  const messageHandlerRef = useRef<((message: any) => void) | null>(null);
  
  // Add tracking for reconnection attempts
  const reconnectionAttemptsRef = useRef(0);
  const maxReconnectionAttempts = 5;
  
  // Enhanced isFromSearchResults detection that works on both client and server
  const detectedContext = typeof window !== 'undefined' && 
    (window.location.pathname === '/search' || 
     window.location.pathname.includes('/search') || 
     window.location.search.includes('?q=') ||
     window.location.pathname === '/') ? 'search_results' : 'business_page';
  
  // Use forced context if provided, otherwise use detected context
  const currentContext = forceContext || detectedContext;
  const isSearchContext = currentContext === 'search_results' || currentContext === 'chat_enabled';

  const onMessage = (handler: (message: any) => void) => {
    messageHandlerRef.current = handler;
  };

  useEffect(() => {
    const initSocket = async () => {
      try {
        console.log('Initializing socket with context:', {
          type,
          forceContext,
          path: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
          url: typeof window !== 'undefined' ? window.location.href : 'unknown'
        });
        
        // Get the appropriate token and ID based on type
        let token: string | null = null;
        let id: string | null = null;

        if (type === 'business') {
          token = businessAuth.getToken();
          if (token) {
            try {
              const business = await businessAuth.getCurrentUser();
              id = business?._id || null;
              console.log('Business authentication:', { 
                id, 
                hasToken: !!token,
                context: isSearchContext ? 'search_results' : 'business_page'  
              });
            } catch (error) {
              console.log('Error getting business user, likely not authenticated:', error);
              return; // Exit early if not authenticated
            }
          }
        } else {
          token = auth.getToken();
          if (token) {
            try {
              const user = await auth.getCurrentUser();
              id = user?.id?.toString() || null;
              console.log('User authentication:', { 
                id, 
                hasToken: !!token,
                context: isSearchContext ? 'search_results' : 'business_page',
                path: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
              });
            } catch (error) {
              console.log('Error getting user, likely not authenticated:', error);
              return; // Exit early if not authenticated
            }
          }
        }

        if (!token || !id) {
          console.log('No auth token or ID found for type:', {
            type,
            context: isSearchContext ? 'search_results' : 'business_page'
          });
          return; // Exit silently without error
        }

        setAuthenticatedId(id);

        // Create a unique socket instance for this provider
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        console.log('Initializing socket with URL:', {
          url: socketUrl,
          context: isSearchContext ? 'search_results' : 'business_page',
          path: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
        });

        // Close any existing socket
        if (socket) {
          console.log('Closing existing socket connection', {
            context: isSearchContext ? 'search_results' : 'business_page'
          });
          socket.close();
        }

        const connectionId = `${type}_${id}_${Date.now()}`;
        
        // Log critical configuration details
        console.log('Socket connection config:', {
          url: socketUrl,
          type,
          id,
          connectionId,
          context: isSearchContext ? 'search_results' : 'business_page',
          isSearchContext
        });

        const socketInstance = io(socketUrl, {
          auth: { 
            token,
            type,
            id
          },
          withCredentials: true,
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 500,
          reconnectionDelayMax: 2000,
          reconnectionAttempts: Infinity,
          timeout: 10000,
          query: {
            clientId: id,
            clientType: type,
            connectionId,
            context: isSearchContext ? 'search_results' : 'business_page',
            path: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
            isHomepage: typeof window !== 'undefined' && window.location.pathname === '/' ? 'true' : 'false',
            isSearchPage: typeof window !== 'undefined' && 
              (window.location.pathname.includes('/search') || window.location.search.includes('?q=')) ? 'true' : 'false',
            forceContext: forceContext || 'none'
          },
          forceNew: true,
          multiplex: false
        });

        // Log socket instance details
        console.log('Socket instance created:', {
          id,
          type,
          url: socketUrl,
          transports: socketInstance.io.opts.transports,
          context: isSearchContext ? 'search_results' : 'business_page'
        });

        // Try to connect immediately
        socketInstance.connect();

        // Enhanced socket event handlers with more detailed logging
        socketInstance.on('connect', () => {
          console.log('Socket connected successfully:', {
            id: socketInstance.id,
            type,
            transport: socketInstance.io.engine.transport.name,
            context: isSearchContext ? 'search_results' : 'business_page'
          });
          setIsConnected(true);
          // Re-emit a join event for all rooms after reconnection
          socketInstance.emit('client_ready', { type, id });
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', {
            type,
            error: error.message,
            transport: socketInstance.io.engine?.transport?.name,
            context: isSearchContext ? 'search_results' : 'business_page'
          });
          setIsConnected(false);
          
          // Simple reconnection with increasing delay
          const retryDelay = 1000;
          console.log(`Will retry connection in ${retryDelay}ms`, {
            context: isSearchContext ? 'search_results' : 'business_page'
          });
          
          setTimeout(() => {
            if (!socketInstance.connected) {
              console.log('Attempting reconnection...', {
                context: isSearchContext ? 'search_results' : 'business_page'
              });
              try {
                // Update the query to add timestamp to force reconnection
                socketInstance.io.opts.query = {
                  ...socketInstance.io.opts.query,
                  timestamp: Date.now()
                };
                socketInstance.connect();
              } catch (err) {
                console.error('Error during socket reconnection:', err);
              }
            }
          }, retryDelay);
        });

        // Add specific handler for authentication errors
        socketInstance.on('auth_error', (error) => {
          console.error('Socket authentication error:', error);
          // Log the authentication error and attempt to reconnect
          console.log('Will attempt to reconnect with existing credentials');
          
          // Simple delay before reconnection attempt
          setTimeout(() => {
            console.log('Attempting reconnection after auth error');
            socketInstance.disconnect().connect();
          }, 2000);
        });

        // Add handler for auth status confirmations
        socketInstance.on('auth_status', (status) => {
          console.log('Received auth status from server:', status);
          if (status.authenticated) {
            setIsConnected(true);
          } else {
            console.error('Socket authentication failed:', status);
            setIsConnected(false);
          }
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Socket disconnected:', {
            type,
            reason,
            wasConnected: socketInstance.connected
          });
          setIsConnected(false);

          // Handle specific disconnect reasons
          if (reason === 'io server disconnect') {
            // Server disconnected us, need to manually reconnect
            console.log('Server disconnected socket, attempting manual reconnect...');
            socketInstance.connect();
          } else if (reason === 'transport close' || reason === 'ping timeout') {
            // Network issue, socket.io will try to reconnect automatically
            console.log('Network issue detected, automatic reconnection will be attempted');
          }
        });

        // Add ping/pong monitoring
        socketInstance.io.engine?.on('ping', () => {
          console.log('Socket ping sent');
        });

        socketInstance.io.engine?.on('pong', () => {
          console.log('Socket pong received');
        });

        setSocket(socketInstance);

        // Cleanup function
        return () => {
          console.log('Cleaning up socket connection:', {
            type,
            id: socketInstance.id,
            connected: socketInstance.connected
          });
          socketInstance.removeAllListeners();
          socketInstance.disconnect();
        };
      } catch (error) {
        console.error('Socket initialization error:', {
          type,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        setIsConnected(false);
      }
    };

    // Initialize socket
    initSocket();

    // Add window focus/blur handlers
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket && !socket.connected) {
        console.log('Page became visible, checking connection...');
        socket.connect();
      }
    };

    const handleOnline = () => {
      console.log('Network connection restored');
      if (socket && !socket.connected) {
        socket.connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, [type, isSearchContext]);

  const joinRoom = (roomId: string) => {
    if (!socket || !isConnected || !authenticatedId) {
      console.log(`Cannot join room (${type}):`, {
        hasSocket: !!socket,
        isConnected,
        hasAuthId: !!authenticatedId
      });
      return;
    }

    console.log(`Joining room (${type}):`, {
      roomId,
      clientType: type,
      clientId: authenticatedId
    });

    socket.emit('join_room', { 
      roomId, 
      clientType: type,
      clientId: authenticatedId 
    });
  };

  const leaveRoom = (roomId: string) => {
    if (!socket || !isConnected || !authenticatedId) {
      return;
    }

    console.log(`Leaving room (${type}):`, {
      roomId,
      clientType: type,
      clientId: authenticatedId
    });

    socket.emit('leave_room', { 
      roomId, 
      clientType: type,
      clientId: authenticatedId 
    });
  };

  const sendMessage = async (data: {
    chatRoomId: string;
    content: string;
    senderId: string;
    senderType: string;
    isAI?: boolean;
    image?: {
      url: string;
      type: string;
      size: number;
    };
  }) => {
    if (!socket || !isConnected || !authenticatedId) {
      console.error(`Cannot send message via socket (${type}):`, {
        hasSocket: !!socket,
        isConnected,
        hasAuthId: !!authenticatedId
      });
      
      // Try to send via API as fallback
      if (type === 'business') {
        try {
          console.log('Attempting to send message via API fallback');
          const token = localStorage.getItem('businessToken') || '';
          const response = await fetch('/api/business/chat/message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              chatRoomId: data.chatRoomId,
              content: data.content,
              image: data.image
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to send message via API');
          }
          
          const result = await response.json();
          console.log('Message sent via API fallback:', result);
          return result;
        } catch (error) {
          console.error('Failed to send message via API fallback:', error);
          throw error;
        }
      }
      return;
    }

    // Skip sender ID validation for AI messages
    if (!data.isAI && data.senderId !== authenticatedId) {
      console.error(`Sender ID mismatch (${type}):`, {
        senderId: data.senderId,
        authenticatedId,
        senderType: data.senderType
      });
      return;
    }

    const messageData = {
      chatRoomId: data.chatRoomId,
      content: data.content,
      senderType: data.senderType,
      senderId: data.senderId,
      isAI: data.isAI,
      clientType: type,
      clientId: authenticatedId,
      timestamp: Date.now(),
      image: data.image
    };

    console.log(`Sending message (${type}):`, {
      ...messageData,
      content: messageData.content.substring(0, 50) + (messageData.content.length > 50 ? '...' : '')
    });

    // Only emit send_message, remove broadcast_message
    socket.emit('send_message', messageData);
  };

  const setTypingStatus = async (chatRoomId: string, isTyping: boolean) => {
    if (!socket || !isConnected || !authenticatedId) {
      return;
    }

    const typingData = {
      chatRoomId,
      userId: authenticatedId,
      clientType: type,
      clientId: authenticatedId,
      timestamp: Date.now()
    };

    socket.emit(isTyping ? 'typing' : 'stop_typing', typingData);
  };

  const contextValue = {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    setTypingStatus,
    onMessage,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
} 