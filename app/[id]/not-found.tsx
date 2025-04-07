'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4 text-violet-600">Business Not Found</h1>
        <p className="text-gray-600 mb-8">
          The business profile you're looking for doesn't exist or may have been moved.
        </p>
        <Button asChild className="bg-violet-600 hover:bg-violet-700">
          <Link href="/">
            Go Back Home
          </Link>
        </Button>
      </div>
    </div>
  );
} 