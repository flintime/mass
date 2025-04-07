import React, { useState, useEffect } from 'react';
import { FaComments } from 'react-icons/fa';
import { useRouter, usePathname } from 'next/navigation';
import { useChatState } from '@/app/context/chat/chatContext';

interface ChatButtonProps {
  businessId: string;
  className?: string;
}

const ChatButton: React.FC<ChatButtonProps> = ({ businessId, className }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { setToggledBusinessId, resetChat } = useChatState();

  // Determine context based on current page
  const getContext = () => {
    if (pathname?.includes('/search')) return 'search_results';
    if (pathname?.includes('/business/')) return 'business_details';
    return 'unknown';
  };

  const context = getContext();
  
  // Log initial props for debugging
  useEffect(() => {
    console.log(`[ChatButton] Initialized with businessId: ${businessId}, context: ${context}, pathname: ${pathname}`);
    
    // Special handling for skillprobillerica
    if (businessId === 'skillprobillerica') {
      console.log('[ChatButton] Detected special case for skillprobillerica');
    }
    
    // Validate if businessId looks like a MongoDB ObjectId
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(businessId);
    console.log(`[ChatButton] BusinessId is ${isMongoId ? 'a valid' : 'NOT a valid'} MongoDB ObjectId`);
  }, [businessId, pathname]);

  // Preemptively lookup MongoDB ObjectId if we have a unique_id
  useEffect(() => {
    const lookupBusinessId = async () => {
      // Skip lookup if businessId is already a valid MongoDB ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(businessId)) {
        console.log(`[ChatButton] BusinessId ${businessId} is already a valid MongoDB ObjectId, skipping lookup`);
        setResolvedId(businessId);
        return;
      }

      console.log(`[ChatButton] Looking up MongoDB ObjectId for unique_id: ${businessId}`);
      setLoading(true);
      setError(null);

      try {
        // Make up to 3 attempts to resolve the ID
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`[ChatButton] Attempt ${attempt} to resolve businessId: ${businessId}`);
          
          const response = await fetch(`/api/business/lookup-id?uniqueId=${encodeURIComponent(businessId)}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[ChatButton] Successfully resolved businessId:`, data);
            setResolvedId(data.businessId);
            setLoading(false);
            return;
          } else if (response.status === 404) {
            console.warn(`[ChatButton] Business not found with unique_id: ${businessId}`);
            
            // Special case for skillprobillerica - try a direct API call to find it
            if (businessId === 'skillprobillerica') {
              console.log('[ChatButton] Trying special handling for skillprobillerica');
              
              // Try to fetch by partial business name
              const specialResponse = await fetch(`/api/business/search?q=SkillPro+Billerica`);
              
              if (specialResponse.ok) {
                const specialData = await specialResponse.json();
                if (specialData.businesses && specialData.businesses.length > 0) {
                  const foundBusiness = specialData.businesses[0];
                  console.log(`[ChatButton] Found business via special search:`, foundBusiness);
                  setResolvedId(foundBusiness._id);
                  setLoading(false);
                  return;
                }
              }
            }
            
            // If this is the last attempt, set error
            if (attempt === 3) {
              setError(`Business not found with ID: ${businessId}`);
              setLoading(false);
            }
            break;
          } else {
            console.error(`[ChatButton] Error looking up businessId: ${response.status}`);
            
            // If this is the last attempt, set error
            if (attempt === 3) {
              setError(`Error looking up business: ${response.statusText}`);
              setLoading(false);
            }
            
            // Wait before retrying
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      } catch (err) {
        console.error('[ChatButton] Exception during business lookup:', err);
        setError('Failed to lookup business ID');
        setLoading(false);
      }
    };

    if (businessId) {
      lookupBusinessId();
    }
  }, [businessId]);

  const handleClick = () => {
    // Use resolvedId if available, otherwise use original businessId
    const finalBusinessId = resolvedId || businessId;
    
    console.log(`[ChatButton] Clicked with finalBusinessId: ${finalBusinessId}, context: ${context}`);
    
    // Reset chat to ensure we start fresh
    resetChat();
    
    // Set the toggled business ID to show the chat window
    setToggledBusinessId(finalBusinessId);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || !!error}
      className={`flex items-center justify-center p-2 rounded-full ${
        loading ? 'bg-gray-400' : error ? 'bg-red-500' : 'bg-green-500'
      } text-white hover:bg-opacity-90 ${className}`}
      title={error || (loading ? 'Loading...' : 'Chat with this business')}
    >
      {loading ? (
        <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" />
      ) : (
        <FaComments className="text-xl" />
      )}
    </button>
  );
};

export default ChatButton; 