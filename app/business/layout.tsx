'use client';

import { usePathname } from 'next/navigation';
import BusinessNavbar from '@/app/components/business-navbar';
import BusinessHeader from '@/app/components/business-header';
import { useEffect } from 'react';
import { businessAuth } from '@/lib/businessAuth';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const isDashboardPage = pathname?.startsWith('/business/dashboard');
  const isSubscriptionPage = pathname === '/business/subscription';

  // Initialize business auth on every page in the business section
  useEffect(() => {
    const initAuth = async () => {
      try {
        await businessAuth.initialize();
        console.log('BusinessLayout: Initialized auth state');
      } catch (error) {
        console.error('BusinessLayout: Error initializing auth:', error);
      }
    };
    
    initAuth();
  }, []);

  return (
    <>
      {isSubscriptionPage && <BusinessHeader />}
      {!isDashboardPage && !isSubscriptionPage && <BusinessNavbar />}
      <div className={!isDashboardPage && !isSubscriptionPage ? "min-h-screen pt-16" : "min-h-screen"}>
        {children}
      </div>
    </>
  )
} 