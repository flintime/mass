'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ChatPage from './page';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // If attempting to access a direct chat room URL, redirect to the main chat page
  useEffect(() => {
    if (pathname && pathname.startsWith('/chat/') && pathname !== '/chat') {
      const roomId = pathname.split('/')[2];
      if (roomId) {
        console.log('Redirecting from standalone chat to main chat with room:', roomId);
        // Redirect to main chat page with the room selected
        router.replace(`/chat?roomId=${roomId}`);
      }
    }
  }, [pathname, router]);

  // Always render the ChatPage component
  return <ChatPage />;
} 