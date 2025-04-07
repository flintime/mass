'use client';

import React, { createContext, useContext, useState } from 'react';

interface ChatStateContextType {
  toggledBusinessId: string | null;
  setToggledBusinessId: (businessId: string | null) => void;
  resetChat: () => void;
}

const ChatStateContext = createContext<ChatStateContextType>({
  toggledBusinessId: null,
  setToggledBusinessId: () => {},
  resetChat: () => {},
});

export const useChatState = () => useContext(ChatStateContext);

interface ChatStateProviderProps {
  children: React.ReactNode;
}

export const ChatStateProvider: React.FC<ChatStateProviderProps> = ({ children }) => {
  const [toggledBusinessId, setToggledBusinessId] = useState<string | null>(null);

  const resetChat = () => {
    // Reset any chat state here
    console.log('[ChatContext] Resetting chat state');
  };

  return (
    <ChatStateContext.Provider
      value={{
        toggledBusinessId,
        setToggledBusinessId,
        resetChat,
      }}
    >
      {children}
    </ChatStateContext.Provider>
  );
}; 