'use client';

import { Business } from '@/app/types/business';
import { NoResultsState } from '@/components/ui/no-results-state';
import { SmartRecommendations } from '@/components/ui/smart-recommendations';
import { AIScoreBadge } from '@/components/ui/ai-score-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface SearchResultsProps {
  businesses: (Business & {
    relevance_score?: number;
    ai_explanation?: string;
  })[];
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

  // Sort businesses by relevance score if available
  const sortedBusinesses = [...businesses].sort((a, b) => 
    (b.relevance_score || 0) - (a.relevance_score || 0)
  );

  // Get top 3 businesses for recommendations
  const topRecommendations = sortedBusinesses.slice(0, 3);

  return (
    <div className="space-y-8">
      <SmartRecommendations businesses={topRecommendations} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedBusinesses.map((business) => (
          <BusinessCard key={business.id} business={business} />
        ))}
      </div>
    </div>
  );
}

function BusinessCard({ business }: { 
  business: Business & { 
    relevance_score?: number;
    ai_explanation?: string;
    matched_services?: string[];
  }
}) {
  // Construct the image URL from the business images array
  const imageUrl = business.images?.[0]?.url || '/placeholder-business.jpg';
  
  // Construct the location string
  const location = `${business.city}, ${business.state}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Business Image */}
      <div className="relative h-48 w-full rounded-t-xl overflow-hidden">
        <img
          src={imageUrl}
          alt={business.business_name}
          className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Business Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{business.business_name}</h3>
        
        {/* Category */}
        <p className="text-sm text-gray-600 mb-2">{business.Business_Category}</p>
        
        {/* Location */}
        <p className="text-sm text-gray-500 mb-2">{location}</p>
        
        {/* Matched Services */}
        {business.matched_services && business.matched_services.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Matched Services:</h4>
            <div className="flex flex-wrap gap-2">
              {business.matched_services.map((service, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* AI Explanation */}
        {business.ai_explanation && (
          <p className="mt-2 text-sm text-gray-500 italic">{business.ai_explanation}</p>
        )}
      </div>
    </motion.div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-4">
            <Skeleton className="h-48 w-full rounded-lg mb-4" />
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