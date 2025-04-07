'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import useMobileDetect from '../../../hooks/useMobileDetect';

// Dynamically import components to avoid server/client hydration issues
const MobileBusinessChat = dynamic(
  () => import('@/app/components/chat/MobileBusinessChat'),
  {
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    ),
    ssr: false
  }
);

// Import the desktop chat view
const DesktopChatView = dynamic(
  () => import('@/app/chat/page'),
  {
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    ),
    ssr: false
  }
);

export default function BusinessChatPage() {
  const { isMobile, isClient } = useMobileDetect();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  
  // Hide header for mobile view
  useEffect(() => {
    if (isMobile) {
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
    }
  }, [isMobile]);

  // Show loading state until client-side code runs
  if (!isClient) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <>
      {isMobile ? (
        <MobileBusinessChat />
      ) : (
        <DesktopChatView />
      )}
    </>
  );
} 