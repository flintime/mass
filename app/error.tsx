'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-violet-600">Something went wrong!</h1>
          <p className="text-gray-600">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        <div className="space-y-4">
          <Button onClick={reset} variant="default" className="w-full">
            Try again
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
            Refresh page
          </Button>
        </div>
      </div>
    </div>
  );
} 