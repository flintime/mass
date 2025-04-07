'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { ChatWindow } from './ChatWindow';

interface ChatButtonProps {
  businessId: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  className?: string;
}

export function ChatButton({ businessId, variant = 'default', className }: ChatButtonProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [actualBusinessId, setActualBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const lookupAttempted = useRef(false);
  
  // Identify context more reliably by checking URL patterns
  const isFromSearchResults = typeof window !== 'undefined' && 
    (window.location.pathname === '/search' || 
     window.location.pathname.includes('/search') || 
     window.location.search.includes('?q=') ||
     window.location.pathname === '/');
  
  // Debug the businessId value with context
  console.log('ChatButton businessId:', {
    id: businessId,
    context: isFromSearchResults ? 'search_results' : 'business_page',
    isValidObjectId: /^[0-9a-fA-F]{24}$/.test(businessId),
    length: businessId?.length,
    url: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    actualBusinessId: actualBusinessId || 'not_set_yet'
  });

  // Always perform lookup when the button is first rendered if not a valid ObjectId
  useEffect(() => {
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(businessId);
    
    // If it's already a valid ObjectId, use it directly
    if (isValidObjectId) {
      setActualBusinessId(businessId);
      lookupAttempted.current = true;
      return;
    }
    
    // Only perform lookup if not already looking up or we haven't attempted yet
    if (!isLookingUp && !lookupAttempted.current && businessId) {
      lookupAttempted.current = true;
      setIsLookingUp(true);
      
      console.log(`Pre-emptively looking up MongoDB ObjectId for unique_id: ${businessId}`, {
        context: isFromSearchResults ? 'search_results' : 'business_page'
      });
      
      // Attempt lookup
      (async () => {
        try {
          const response = await fetch(`/api/business/lookup-id?uniqueId=${encodeURIComponent(businessId)}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to pre-load business ID: ${response.status}`, errorText);
            setIsLookingUp(false);
            return;
          }
          
          const data = await response.json();
          
          if (data && data._id) {
            console.log(`Successfully pre-loaded MongoDB ObjectId for ${businessId}:`, {
              data, 
              context: isFromSearchResults ? 'search_results' : 'business_page'
            });
            setActualBusinessId(data._id);
          } else {
            console.error(`No valid businessId returned from lookup for ${businessId}`, data);
          }
        } catch (err) {
          console.warn('Error pre-loading business ID:', err);
        } finally {
          setIsLookingUp(false);
        }
      })();
    }
  }, [businessId, isLookingUp, isFromSearchResults]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!businessId) {
      console.error('Business ID is required');
      setError('Cannot open chat: Missing business identifier');
      return;
    }

    setError(null);
    
    // If we already have a valid MongoDB ObjectId (either directly or from pre-lookup), use it
    if (actualBusinessId && /^[0-9a-fA-F]{24}$/.test(actualBusinessId)) {
      console.log(`Using pre-loaded MongoDB ObjectId: ${actualBusinessId}`, {
        context: isFromSearchResults ? 'search_results' : 'business_page'
      });
      setIsChatOpen(true);
      return;
    }
    
    // Check if the businessId is already a valid MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(businessId);
    
    if (!isValidObjectId) {
      // If it's not a valid ObjectId, it might be a unique_id, so look it up
      setIsLoading(true);
      try {
        console.log(`Looking up MongoDB ObjectId for unique_id: ${businessId}`, {
          context: isFromSearchResults ? 'search_results' : 'business_page'
        });
        
        // Use a more reliable API endpoint with better error handling
        const response = await fetch(`/api/business/lookup-id?uniqueId=${encodeURIComponent(businessId)}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to look up business ID: ${response.status}`, {
            error: errorText,
            context: isFromSearchResults ? 'search_results' : 'business_page'
          });
          throw new Error(`Failed to look up business ID: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`Successfully looked up MongoDB ObjectId for ${businessId}:`, {
          data,
          context: isFromSearchResults ? 'search_results' : 'business_page'
        });
        
        // Check for _id field in the response (API returns the business object directly)
        if (!data._id) {
          throw new Error('No business ID returned from lookup');
        }
        
        // Use the _id field as the business ID
        setActualBusinessId(data._id);
      } catch (error) {
        console.error('Error looking up business ID:', {
          error,
          context: isFromSearchResults ? 'search_results' : 'business_page'
        });
        setError('Cannot open chat: Unable to find business');
        setIsLoading(false);
        return; // Don't open chat if we can't get the MongoDB ObjectId
      }
      setIsLoading(false);
    } else {
      // If it's already a valid ObjectId, use it directly
      console.log(`Using provided MongoDB ObjectId: ${businessId}`, {
        context: isFromSearchResults ? 'search_results' : 'business_page'
      });
      setActualBusinessId(businessId);
    }
    
    // Log when chat is opened
    console.log('Opening chat with businessId:', {
      id: actualBusinessId || businessId,
      context: isFromSearchResults ? 'search_results' : 'business_page'
    });
    setIsChatOpen(true);
  };

  return (
    <div className="relative">
      <Button
        onClick={handleClick}
        variant={variant}
        size="sm"
        className={`gap-2 ${className || ''}`}
        type="button"
        disabled={isLoading}
      >
        <MessageCircle className="h-4 w-4" />
        {isLoading ? 'Loading...' : 'Flint to Book'}
      </Button>

      {error && (
        <div className="absolute bottom-full mb-2 right-0 bg-red-100 text-red-800 text-xs p-2 rounded shadow-md whitespace-nowrap">
          {error}
        </div>
      )}

      {/* Chat Window */}
      {isChatOpen && actualBusinessId && (
        <div className="fixed bottom-4 right-4 z-50">
          <ChatWindow
            businessId={actualBusinessId}
            onClose={() => {
              console.log(`Closing chat window for business: ${actualBusinessId}`);
              setIsChatOpen(false);
              // Keep the actualBusinessId in case they open the chat again
            }}
          />
        </div>
      )}
    </div>
  );
} 