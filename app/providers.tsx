'use client';

import { ConditionalSocketProvider } from '@/app/components/ConditionalSocketProvider';
import { Toaster } from "@/components/ui/toaster";
import { ChatStateProvider } from '@/app/context/chat/chatContext';
import { GlobalChat } from '@/app/components/GlobalChat';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ChatStateProvider>
      <ConditionalSocketProvider>
        {children}
        <GlobalChat />
        <Toaster />
      </ConditionalSocketProvider>
    </ChatStateProvider>
  );
} 