'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { cn } from '@/lib/utils';

interface ConditionalHeaderProps {
  children: React.ReactNode;
}

export function ConditionalHeader({ children }: ConditionalHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isBusinessDashboard = pathname?.startsWith('/business/dashboard');
  const isChatPage = pathname === '/chat';
  const selectedRoomId = searchParams.get('roomId');
  const shouldHideHeader = isChatPage && selectedRoomId;

  if (isBusinessDashboard) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      "flex flex-col min-h-screen",
      shouldHideHeader && "md:pt-16" // Add padding top on desktop only when header is hidden on mobile
    )}>
      <div className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-transform duration-200',
        'md:relative md:block', // Always show on desktop
        shouldHideHeader ? '-translate-y-full md:translate-y-0' : 'translate-y-0' // Slide up on mobile when chat selected
      )}>
        <Header />
      </div>
      <main className={cn(
        "flex-grow",
        shouldHideHeader && "md:pt-0" // Remove padding on desktop when header is hidden on mobile
      )}>
        {children}
      </main>
      <Footer />
    </div>
  );
} 