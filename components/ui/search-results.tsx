'use client';

import { Business } from '@/app/types/business';
import { NoResultsState } from '@/components/ui/no-results-state';
import { SmartRecommendations } from '@/components/ui/smart-recommendations';
import { AIScoreBadge } from '@/components/ui/ai-score-badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchResultsProps {
  businesses: Business[];
  isLoading: boolean;
  searchQuery: string;
  onNotifyMe?: (category: string) => void;
}

export function SearchResults({
  businesses,
  isLoading,
  searchQuery,
  onNotifyMe
}: SearchResultsProps) {
  // Available categories in your system
  const availableCategories = [
    'Hair Salon',
    'Spa',
    'Cleaning',
    'Plumbing',
    'Electrician',
    'Personal Training'
    // Add more as needed
  ];

  if (isLoading) {
    return <SearchResultsSkeleton />;
  }

  if (businesses.length === 0) {
    return (
      <NoResultsState
        searchQuery={searchQuery}
        suggestedCategories={availableCategories}
        onNotifyMe={onNotifyMe}
      />
    );
  }

  return (
    <div className="space-y-8">
      <SmartRecommendations businesses={businesses} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((business) => (
          <BusinessCard key={business.id} business={business} />
        ))}
      </div>
    </div>
  );
}

function BusinessCard({ business }: { business: Business }) {
  return (
    <div className="relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
      {/* AI Score Badge removed as requested */}
      
      {/* Rest of your business card content */}
      {/* ... */}
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-4">
            <Skeleton className="h-40 w-full rounded-lg mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 