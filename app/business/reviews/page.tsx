'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  MessageSquare,
  Calendar,
  ThumbsUp,
  User
} from 'lucide-react';

interface Review {
  id: number;
  customerName: string;
  serviceName: string;
  rating: number;
  comment: string;
  date: string;
  response?: string;
  helpful: number;
}

export default function BusinessReviews() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [response, setResponse] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      // TODO: Replace with actual API call
      // Mock data for demonstration
      setReviews([
        {
          id: 1,
          customerName: "John Doe",
          serviceName: "House Cleaning",
          rating: 5,
          comment: "Excellent service! The team was professional and thorough.",
          date: "2024-01-20",
          helpful: 3
        },
        {
          id: 2,
          customerName: "Jane Smith",
          serviceName: "Window Cleaning",
          rating: 4,
          comment: "Great job overall, but missed a few spots.",
          date: "2024-01-19",
          response: "Thank you for your feedback! We'll ensure better attention to detail next time.",
          helpful: 1
        },
        {
          id: 3,
          customerName: "Mike Johnson",
          serviceName: "Deep Cleaning",
          rating: 3,
          comment: "Service was okay, but took longer than expected.",
          date: "2024-01-18",
          helpful: 0
        }
      ]);
      setIsLoading(false);
    } catch (error) {
      setError('Failed to load reviews');
      setIsLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedReview || !response.trim()) return;

    try {
      // TODO: Replace with actual API call
      setReviews(reviews.map(review =>
        review.id === selectedReview.id ? { ...review, response } : review
      ));
      setSelectedReview(null);
      setResponse('');
    } catch (error) {
      setError('Failed to submit response');
    }
  };

  const handleMarkHelpful = async (reviewId: number) => {
    try {
      // TODO: Replace with actual API call
      setReviews(reviews.map(review =>
        review.id === reviewId ? { ...review, helpful: review.helpful + 1 } : review
      ));
    } catch (error) {
      setError('Failed to mark review as helpful');
    }
  };

  const getStarRating = (rating: number) => {
    return Array(5).fill(0).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const filteredReviews = filter === 'all'
    ? reviews
    : reviews.filter(review => {
        switch (filter) {
          case 'positive':
            return review.rating >= 4;
          case 'neutral':
            return review.rating === 3;
          case 'negative':
            return review.rating <= 2;
          case 'unresponded':
            return !review.response;
          default:
            return true;
        }
      });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">Loading reviews...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reviews</h1>
            <p className="text-gray-500">Manage customer reviews and responses</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter reviews" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="positive">Positive (4-5★)</SelectItem>
              <SelectItem value="neutral">Neutral (3★)</SelectItem>
              <SelectItem value="negative">Negative (1-2★)</SelectItem>
              <SelectItem value="unresponded">Unresponded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {filteredReviews.map((review) => (
            <Card key={review.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <User className="h-10 w-10 text-gray-400 bg-gray-100 p-2 rounded-full" />
                    <div>
                      <h3 className="font-medium">{review.customerName}</h3>
                      <p className="text-sm text-gray-500">{review.serviceName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex">{getStarRating(review.rating)}</div>
                        <span className="text-sm text-gray-500">•</span>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {review.date}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkHelpful(review.id)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    {review.helpful}
                  </Button>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  {getStarRating(review.rating)}
                </div>
                {review.comment ? (
                  <p className="text-gray-600">{review.comment}</p>
                ) : (
                  <p className="text-gray-500 italic">No written review provided</p>
                )}

                {review.response ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm font-medium mb-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Your Response</span>
                    </div>
                    <p className="text-gray-600">{review.response}</p>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedReview(review);
                      setResponse('');
                    }}
                  >
                    Respond to Review
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Respond to Review</DialogTitle>
            </DialogHeader>
            {selectedReview && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex">{getStarRating(selectedReview.rating)}</div>
                    <span className="text-sm text-gray-500">from {selectedReview.customerName}</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-semibold text-lg mb-2">Review</h3>
                    {selectedReview.comment ? (
                      <p className="text-gray-600">{selectedReview.comment}</p>
                    ) : (
                      <p className="text-gray-500 italic">No written review provided</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Response</label>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write your response here..."
                    rows={4}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleRespond}
                  disabled={!response.trim()}
                >
                  Submit Response
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 