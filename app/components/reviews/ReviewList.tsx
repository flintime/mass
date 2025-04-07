'use client'

import { useState } from 'react'
import { Star, ChevronDown, ChevronUp, User, ThumbsUp } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

interface Review {
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewListProps {
  reviews: Review[];
  averageRating?: number;
  totalReviews?: number;
}

export function ReviewList({ reviews, averageRating = 0, totalReviews = 0 }: ReviewListProps) {
  const [expanded, setExpanded] = useState(false);

  const displayedReviews = expanded ? reviews : reviews.slice(0, 3);

  // Calculate rating distribution
  const ratingDistribution = Array.from({ length: 5 }, (_, i) => {
    const count = reviews.filter(review => review.rating === 5 - i).length;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { rating: 5 - i, count, percentage };
  });

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Average Rating */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
              <div className="flex justify-center mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(averageRating) 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">{totalReviews} reviews</p>
            </div>
          </div>

          {/* Right Column - Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-2">
                <div className="w-12 text-sm text-gray-600">{rating} stars</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-12 text-sm text-gray-500 text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <AnimatePresence>
          {displayedReviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-violet-100 to-violet-50 p-2.5 rounded-full">
                    <User className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{review.customerName}</h4>
                    <p className="text-sm text-gray-500">
                      {format(new Date(review.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-violet-50 px-3 py-1 rounded-full">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-violet-700">{review.rating}</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Review comment */}
                {review.comment ? (
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                ) : (
                  <p className="text-gray-500 italic">No written review provided</p>
                )}
                
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-violet-600">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Helpful
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {reviews.length > 3 && (
          <Button
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-4"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Show More Reviews <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
} 