'use client';

import { useState, useEffect, useRef, lazy, Suspense, Key } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { Search, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Dynamically import the chat room component
import dynamic from 'next/dynamic';
// Define the props type for the imported component
interface ChatRoomContentProps {
  params: {
    roomId: string;
  };
}
// Use string path instead of module path with square brackets
const ChatRoomContent = dynamic<ChatRoomContentProps>(
  () => import('./[roomId]/page' as any), 
  {
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }
);

interface ChatRoom {
  _id: string;
  business: {
    business_name: string;
    images: { url: string }[];
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderType: 'user' | 'business';
  };
  unreadCount: number;
}

interface ChatPageProps {
  children?: React.ReactNode;
}

const POLLING_INTERVAL = 3000; // Poll every 3 seconds

export default function ChatPage({ children }: ChatPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const roomIdParam = searchParams.get('roomId');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(roomIdParam);
  const [chatRoomKey, setChatRoomKey] = useState(0);
  const pollingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isMobileView, setIsMobileView] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Handle initial page loading
  useEffect(() => {
    // Set a small timeout to let the CSS transitions initialize properly
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Track whether we're in mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Fix header hiding for mobile view
  useEffect(() => {
    try {
      const header = document.querySelector('header');
      const main = document.querySelector('main');
      
      if (header && main) {
        // Store original values to restore later
        const originalHeaderDisplay = header.style.display;
        const originalMainPadding = main.style.paddingTop;
        
        // Hide header
        header.style.display = 'none';
        main.style.paddingTop = '0px';
        
        return () => {
          // Restore original styles when component unmounts
          header.style.display = originalHeaderDisplay;
          main.style.paddingTop = originalMainPadding;
        };
      }
    } catch (error) {
      console.error('Error manipulating header:', error);
    }
  }, []);

  // Effect to listen for URL changes
  useEffect(() => {
    try {
      const handleRouteChange = () => {
        const params = new URLSearchParams(window.location.search);
        const newRoomId = params.get('roomId');
        setSelectedRoomId(newRoomId);
        if (newRoomId) {
          // Force refresh chat room content
          setChatRoomKey(prev => prev + 1);
        }
      };
      
      // Listen for popstate (browser back/forward)
      window.addEventListener('popstate', handleRouteChange);
      
      return () => window.removeEventListener('popstate', handleRouteChange);
    } catch (error) {
      console.error('Error setting up route change listener:', error);
    }
  }, []);

  // Watch for roomId param changes
  useEffect(() => {
    setSelectedRoomId(roomIdParam);
  }, [roomIdParam]);
  
  // Add safety check for when selectedRoomId is set
  useEffect(() => {
    if (selectedRoomId) {
      // On mobile, ensure the chat panel is visible by adding a class to body
      if (isMobileView) {
        document.body.classList.add('chat-panel-visible');
      }
    } else {
      document.body.classList.remove('chat-panel-visible');
    }
    
    return () => {
      document.body.classList.remove('chat-panel-visible');
    };
  }, [selectedRoomId, isMobileView]);

  // Check for roomId in query parameters
  useEffect(() => {
    const roomId = searchParams.get('roomId');
    if (roomId) {
      console.log('Found roomId in query params:', {
        paramRoomId: roomId,
        currentSelectedRoomId: selectedRoomId,
        isChange: roomId !== selectedRoomId
      });
      
      if (roomId !== selectedRoomId) {
        setSelectedRoomId(roomId);
        console.log('Updated selectedRoomId from URL params to:', roomId);
      }
    } else if (selectedRoomId) {
      // If roomId is removed from URL but we have a selectedRoomId, clear it
      console.log('No roomId in URL but selectedRoomId exists, clearing selection');
      setSelectedRoomId(null);
    }
  }, [searchParams, selectedRoomId]);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchChatRooms();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = chatRooms.filter((room) =>
        room.business.business_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
      setFilteredRooms(filtered);
    } else {
      setFilteredRooms(chatRooms);
    }
  }, [searchQuery, chatRooms]);

  const fetchChatRooms = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      console.log('Fetching chat rooms...');
      const response = await fetch('/api/chat/rooms', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to parse error response'
        }));

        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please sign in to view your messages",
            variant: "destructive",
          });
          router.push('/signin');
          return;
        }

        if (response.status === 503) {
          throw new Error('Chat server is currently unavailable. Please try again later.');
        }

        throw new Error(errorData.error || 'Failed to fetch chat rooms');
      }

      // Verify we have JSON response
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from server');
      }

      const data = await response.json();
      console.log('Received chat rooms:', data);
      setChatRooms(data);
      setFilteredRooms(data);
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to load chat rooms. Please try again later.';
      
      setLoadError(errorMessage);
      toast({
        title: "Error Loading Messages",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start polling with improved implementation
  const startPolling = () => {
    console.log('Starting chat rooms polling');
    
    // Clear any existing polling
    if (pollingTimeoutRef.current) {
      console.log('Clearing existing polling timeout');
      clearTimeout(pollingTimeoutRef.current);
    }

    // Set up new polling
    const poll = async () => {
      if (!document.hidden) { // Only poll when tab is visible
        try {
          console.log('Polling for chat room updates...');
          const response = await fetch('/api/chat/rooms');
          if (!response.ok) {
            throw new Error('Failed to fetch chat rooms');
          }
          const data = await response.json();
          
          // Check for updates before setting state
          const hasUpdates = JSON.stringify(data) !== JSON.stringify(chatRooms);
          if (hasUpdates) {
            console.log('Updates found in chat rooms');
            setChatRooms(data);
          } else {
            console.log('No updates in chat rooms');
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
        console.log('Tab became visible, fetching latest chat rooms');
        fetchChatRooms();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    console.log('Chat page mounted or selectedRoomId changed, updating polling', { selectedRoomId });
    // Initial fetch
    fetchChatRooms();
    
    // Start polling
    startPolling();

    // Cleanup when unmounting
    return () => {
      console.log('Chat page unmounting, clearing polling');
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [selectedRoomId]);

  const handleRoomClick = (roomId: string) => {
    console.log('Room click handler triggered:', {
      current: selectedRoomId,
      new: roomId,
      isDifferent: selectedRoomId !== roomId
    });
    
    // Set selected room ID in state
    setSelectedRoomId(roomId);
    
    // Update URL using query parameter without triggering a navigation
    const url = new URL(window.location.href);
    url.searchParams.set('roomId', roomId);
    window.history.pushState({}, '', url.toString());
    
    // Log the change
    console.log('Updated selected room ID to:', roomId);
    
    // Prevent default navigation behavior that might trigger redirects
    return false;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday ? format(date, 'h:mm a') : format(date, 'MMM d');
  };

  // Listen for messages read events from chat room component
  useEffect(() => {
    const handleMessagesRead = (event: CustomEvent) => {
      const { chatRoomId } = event.detail;
      console.log('Chat messages read event received for room:', chatRoomId);
      
      // Update the chat rooms list with zero unread count for this room
      setChatRooms(prev => 
        prev.map(room => 
          room._id === chatRoomId ? { ...room, unreadCount: 0 } : room
        )
      );
    };
    
    window.addEventListener('chat-messages-read', handleMessagesRead as EventListener);
    
    return () => {
      window.removeEventListener('chat-messages-read', handleMessagesRead as EventListener);
    };
  }, []);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex">
        <div className="w-80 border-r bg-gray-50/50 space-y-4 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-[calc(100vh-8rem)]" />
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 text-center">{loadError}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            setLoadError(null);
            setIsLoading(true);
            fetchChatRooms();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Remove the direct reference to checking if we're on the main chat page
  // since we're now always on the main chat page
  const isMainChatPage = !selectedRoomId;
  
  // Using the existing chatRoomKey state instead of declaring a new one
  const roomDisplayKey = selectedRoomId || 'empty';

  return (
    <div className="fixed inset-0 bg-white md:bg-gray-50 flex flex-col overflow-hidden">
      {/* Loading overlay for initial page load */}
      {!pageLoaded && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}
      
      {/* Optional global styles for mobile fixes */}
      <style jsx global>{`
        @media (max-width: 767px) {
          /* Fix for mobile transitions */
          .chat-panel-visible .chat-content-panel {
            transform: translateX(0) !important;
            opacity: 1 !important;
          }
          
          /* Add padding for mobile footer */
          .chat-list-panel, .chat-content-panel {
            padding-bottom: 64px !important;
          }
          
          /* Ensure message input stays above footer */
          .message-input-container {
            bottom: 64px !important;
          }
          
          /* Add subtle animation to footer buttons */
          .mobile-footer-btn {
            transition: all 0.2s ease;
          }
          
          .mobile-footer-btn:active {
            transform: scale(0.92);
          }
        }
      `}</style>
      
      {/* Main Container with Chat List and Chat Content */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Chat List Panel - Full screen on mobile when no chat selected */}
        <div className={cn(
          "flex flex-col bg-white h-full overflow-y-auto chat-list-panel",
          "md:w-[320px] md:border-r md:static",
          "w-full absolute inset-0 z-30 transition-all duration-300",
          selectedRoomId && isMobileView ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"
        )}>
          {/* Top Header */}
          <div className="flex items-center h-16 px-4 border-b">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 mr-3 rounded-full hover:bg-gray-100 focus:outline-none active:bg-gray-200"
              onClick={() => router.push('/')}
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Messages</h1>
            </div>
          </div>
          
          {/* Error display if loading fails */}
          {loadError && (
            <div className="p-4 bg-red-50 text-red-700 border-b">
              <p>{loadError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => fetchChatRooms()}
              >
                Retry
              </Button>
            </div>
          )}
          
          {/* Search Bar */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                placeholder="Search"
                className="pl-9 h-10 bg-gray-50 border-none rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-700 text-center font-medium">
                  {searchQuery ? `No matches found` : 'No messages yet'}
                </p>
                <p className="text-gray-500 text-sm text-center mt-2">
                  {!searchQuery && 'Your conversations will appear here'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredRooms.map((room) => (
                  <div
                    key={room._id}
                    onClick={() => handleRoomClick(room._id)}
                    className={cn(
                      "flex items-center gap-3 p-4 cursor-pointer transition-colors",
                      "hover:bg-gray-50 active:bg-gray-100",
                      selectedRoomId === room._id ? "bg-gray-50" : ""
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        {room.business?.images?.[0]?.url ? (
                          <Image
                            src={room.business.images[0].url}
                            alt={room.business.business_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-200">
                            <span className="text-gray-600 font-medium">
                              {(room.business?.business_name || 'UN').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      {room.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-violet-600 text-white text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full">
                          {room.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium text-gray-900 truncate">
                          {room.business?.business_name || 'Unknown Business'}
                        </h3>
                        {room.lastMessage && (
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {formatMessageTime(room.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {room.lastMessage && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {room.lastMessage.senderType === 'user' ? 'You: ' : ''}
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Chat Content Panel */}
        <div className={cn(
          "flex flex-col bg-white md:bg-gray-50 h-full chat-content-panel",
          "md:border-l flex-1",
          "w-full absolute inset-0 md:relative transition-all duration-300",
          selectedRoomId ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 md:opacity-100 md:translate-x-0"
        )}>
          {selectedRoomId ? (
            <div className="flex flex-col h-full relative">
              {/* Render chat room content */}
              <ChatRoomContent 
                key={roomDisplayKey} 
                params={{ roomId: selectedRoomId }} 
              />
            </div>
          ) : (
            /* Empty state for desktop when no chat is selected */
            <div className="hidden md:flex flex-col items-center justify-center h-full">
              <div className="p-8 text-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Select a conversation</h2>
                <p className="text-gray-600">
                  Choose a conversation from the list to start chatting.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 