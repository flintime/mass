'use client';

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { usePathname } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { CookieConsent } from '@/components/ui/cookie-consent';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBusinessPage = pathname?.startsWith('/business');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check for critical environment variables
    const checkEnvironment = async () => {
      try {
        setIsLoading(true);
        // Add any critical initialization here
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize app'));
        toast({
          title: 'Error',
          description: 'Failed to initialize app. Please try again.',
          variant: 'destructive',
        });
      }
    };

    checkEnvironment();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-violet-600">Something went wrong!</h1>
            <p className="text-gray-600">{error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isBusinessPage && <Header />}
      <main className="min-h-screen w-full relative">{children}</main>
      <Footer />
      <CookieConsent />
    </>
  );
} 