'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { SocketProvider } from '@/lib/socket';
import { useEffect, useState } from 'react';

interface ConditionalSocketProviderProps {
  children: React.ReactNode;
}

export function ConditionalSocketProvider({ children }: ConditionalSocketProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [socketType, setSocketType] = useState<'user' | 'business' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Check if we're on a public page that doesn't need socket connection
  const isPublicPageWithoutChat = 
    pathname?.includes('/signin') || 
    pathname?.includes('/signup') || 
    pathname?.includes('/forgot-password') ||
    pathname?.includes('/reset-password') ||
    pathname?.includes('/terms') ||
    pathname?.includes('/privacy') ||
    pathname?.includes('/about');
    
  // Check if we're on a page that needs chat (search or home page)
  const isChatEnabledPage = 
    pathname === '/' || 
    pathname?.includes('/search') || 
    searchParams?.has('q') ||
    pathname?.includes('/business/');
    
  // Determine the specific context
  const getForceContext = () => {
    if (pathname?.includes('/search') || searchParams?.has('q')) {
      return 'search_results' as const;
    }
    if (pathname?.includes('/business/')) {
      return 'business_page' as const;
    }
    if (isChatEnabledPage) {
      return 'chat_enabled' as const;
    }
    return undefined;
  };
  
  // Initialize socket type
  useEffect(() => {
    // Skip initializing if already done
    if (isInitialized) return;
    
    // Check if we're in a business or user context
    const isBusinessPage = pathname?.includes('/for-business');
    
    // Log the current page context
    console.log('[ConditionalSocketProvider] Initializing for path:', pathname, {
      isPublicPageWithoutChat,
      isChatEnabledPage,
      isBusinessPage,
      forceContext: getForceContext()
    });
    
    if (isPublicPageWithoutChat) {
      // Don't initialize socket for pages that don't need it
      setSocketType(null);
    } else {
      // Set the correct socket type
      setSocketType(isBusinessPage ? 'business' : 'user');
    }
    
    setIsInitialized(true);
  }, [pathname, isPublicPageWithoutChat, isChatEnabledPage, isInitialized]);
  
  // Conditionally wrap with SocketProvider
  if (isPublicPageWithoutChat || !socketType) {
    return <>{children}</>;
  }
  
  return (
    <SocketProvider type={socketType} forceContext={getForceContext()}>
      {children}
    </SocketProvider>
  );
} 