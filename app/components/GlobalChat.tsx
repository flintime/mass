'use client';

import { useEffect } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChatState } from '@/app/context/chat/chatContext';

export function GlobalChat() {
  const { toggledBusinessId, setToggledBusinessId } = useChatState();

  // Log when the businessId changes for debugging
  useEffect(() => {
    if (toggledBusinessId) {
      console.log('GlobalChat: Displaying chat for business ID:', toggledBusinessId);
    }
  }, [toggledBusinessId]);

  // Render the chat window if there's a toggled business ID
  if (!toggledBusinessId) return null;

  const handleClose = () => {
    console.log('GlobalChat: Closing chat window');
    setToggledBusinessId(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <ChatWindow 
        businessId={toggledBusinessId} 
        onClose={handleClose} 
      />
    </div>
  );
} 