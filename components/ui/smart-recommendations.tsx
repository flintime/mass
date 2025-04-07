'use client';

import { motion } from 'framer-motion';
import { Sparkles, Clock, Star, ThumbsUp } from 'lucide-react';
import { Business } from '@/app/types/business';
import { AIScoreBadge } from '@/components/ui/ai-score-badge';
import Image from 'next/image';
import Link from 'next/link';

interface SmartRecommendationsProps {
  businesses: Business[];
}

export function SmartRecommendations({ businesses }: SmartRecommendationsProps) {
  const topPicks = businesses.slice(0, 3);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-violet-500" />
        <h3 className="text-lg font-semibold text-gray-900">AI Smart Recommendations</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topPicks.map((business, index) => (
          <motion.div
            key={business.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            {/* AI Score Badge removed as requested */}
            
            <div className="relative h-40">
              <Image
                src={typeof business.images?.[0] === 'string' ? business.images[0] : business.images?.[0]?.url || '/placeholder-business.jpg'}
                alt={business.business_name}
                fill
                className="object-cover rounded-t-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-t-xl" />
              <div className="absolute bottom-3 left-3 right-3">
                <h4 className="text-white font-semibold truncate">{business.business_name}</h4>
                <p className="text-white/90 text-sm truncate">{business.city}, {business.state}</p>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center gap-4 mb-3 text-sm">
                {business.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{business.rating.toFixed(1)}</span>
                  </div>
                )}
                {business.reviews_count && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{business.reviews_count} reviews</span>
                  </div>
                )}
                {business.availability === 'available' && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Clock className="h-4 w-4" />
                    <span>Available Now</span>
                  </div>
                )}
              </div>
              
              {business.ai_explanation && (
                <div className="mb-3 text-sm text-violet-600 italic">
                  "{business.ai_explanation}"
                </div>
              )}
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {business.description}
              </p>
              
              <Link 
                href={`/${business.id}`}
                className="block text-center py-2 px-4 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium"
              >
                View Details
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 