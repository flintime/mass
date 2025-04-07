'use client';

import { useState, useEffect } from 'react';
import { businessAuth } from '@/lib/businessAuth';
import { Star, MessageSquare, ThumbsUp, Users, Clock, User, Calendar, Send, Filter, Award, BarChart, Edit, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import useMobileDetect from '@/hooks/useMobileDetect';
import './mobile.css';

export default function ReviewsPage() {
  const { isMobile } = useMobileDetect();
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState('all');
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, []);

  const fetchReviews = async () => {
    try {
      const data = await businessAuth.getReviews();
      setReviews(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await businessAuth.getReviewStats();
      setStats(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReply = async (reviewId: string) => {
    try {
      const reply = replyText[reviewId];
      if (!reply?.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter a reply',
          variant: 'destructive',
        });
        return;
      }

      await businessAuth.replyToReview(reviewId, reply);
      toast({
        title: 'Success',
        description: 'Reply posted successfully',
      });
      
      setReplyText({ ...replyText, [reviewId]: '' });
      fetchReviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditReply = async (reviewId: string) => {
    try {
      if (!editReplyText?.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter a reply',
          variant: 'destructive',
        });
        return;
      }

      await businessAuth.editReplyToReview(reviewId, editReplyText);
      toast({
        title: 'Success',
        description: 'Reply updated successfully',
      });
      
      setEditingReply(null);
      setEditReplyText('');
      fetchReviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    try {
      await businessAuth.deleteReplyToReview(reviewId);
      toast({
        title: 'Success',
        description: 'Reply deleted successfully',
      });
      
      fetchReviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const startEditingReply = (reviewId: string, currentReply: string) => {
    setEditingReply(reviewId);
    setEditReplyText(currentReply);
  };

  const cancelEditingReply = () => {
    setEditingReply(null);
    setEditReplyText('');
  };

  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
          }`}
        />
      ));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-50 text-green-700 border-green-200';
    if (rating === 3) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4) return 'Excellent';
    if (rating === 3) return 'Good';
    return 'Needs Improvement';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const reviewDate = new Date(date);
    const diffInDays = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true;
    if (filter === 'high') return review.rating >= 4;
    if (filter === 'low') return review.rating <= 2;
    if (filter === 'replied') return !!review.reply;
    if (filter === 'pending') return !review.reply;
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden border border-gray-100">
              <CardHeader className="pb-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <Card className="border border-gray-100">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-gray-100">
              <CardHeader>
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-8 max-w-7xl mx-auto ${isMobile ? 'mobile-container' : ''}`}>
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`text-center mb-6 ${isMobile ? 'mobile-header' : ''}`}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Reviews</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Manage and respond to customer feedback to improve your business reputation and service quality.
        </p>
      </motion.div>

      {/* Stats Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${isMobile ? 'mobile-stats-grid' : ''}`}
      >
        <Card className={`overflow-hidden border-0 shadow-sm bg-gradient-to-br from-violet-50 to-white ${isMobile ? 'mobile-stat-card' : ''}`}>
          <CardHeader className={isMobile ? 'card-header' : 'pb-2'}>
            <CardTitle className={`text-2xl font-bold flex items-center gap-2 ${isMobile ? 'card-title' : ''}`}>
              <Users className="h-6 w-6 text-violet-600" />
              <span>{stats?.totalReviews || 0}</span>
            </CardTitle>
            <CardDescription className={isMobile ? 'card-description' : ''}>Total Reviews</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className={`overflow-hidden border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-white ${isMobile ? 'mobile-stat-card' : ''}`}>
          <CardHeader className={isMobile ? 'card-header' : 'pb-2'}>
            <CardTitle className={`text-2xl font-bold flex items-center gap-2 ${isMobile ? 'card-title' : ''}`}>
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-400" />
              <span>{stats?.averageRating?.toFixed(1) || 0}</span>
            </CardTitle>
            <CardDescription className={isMobile ? 'card-description' : ''}>Average Rating</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className={`overflow-hidden border-0 shadow-sm bg-gradient-to-br from-green-50 to-white ${isMobile ? 'mobile-stat-card' : ''}`}>
          <CardHeader className={isMobile ? 'card-header' : 'pb-2'}>
            <CardTitle className={`text-2xl font-bold flex items-center gap-2 ${isMobile ? 'card-title' : ''}`}>
              <ThumbsUp className="h-6 w-6 text-green-600" />
              <span>{stats?.ratingDistribution?.[5] || 0}</span>
            </CardTitle>
            <CardDescription className={isMobile ? 'card-description' : ''}>5 Star Reviews</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className={`overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white ${isMobile ? 'mobile-stat-card' : ''}`}>
          <CardHeader className={isMobile ? 'card-header' : 'pb-2'}>
            <CardTitle className={`text-2xl font-bold flex items-center gap-2 ${isMobile ? 'card-title' : ''}`}>
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <span>{reviews.filter(r => !r.reply).length}</span>
            </CardTitle>
            <CardDescription className={isMobile ? 'card-description' : ''}>Awaiting Response</CardDescription>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Rating Distribution */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={isMobile ? 'mobile-rating-distribution' : ''}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className={`pb-2 flex flex-row items-center justify-between ${isMobile ? 'card-header' : ''}`}>
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-yellow-600" />
                  Rating Distribution
                </CardTitle>
                <CardDescription>
                  Overview of ratings received from customers
                </CardDescription>
              </div>
              {stats.totalReviews > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200">
                  {stats.totalReviews} total reviews
                </Badge>
              )}
            </CardHeader>
            <CardContent className={isMobile ? 'card-content' : ''}>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.ratingDistribution[rating] || 0;
                  const percentage = (count / stats.totalReviews) * 100 || 0;
                  
                  let barColor = "bg-gray-200";
                  if (rating === 5) barColor = "bg-green-500";
                  if (rating === 4) barColor = "bg-green-400";
                  if (rating === 3) barColor = "bg-yellow-400";
                  if (rating === 2) barColor = "bg-orange-400";
                  if (rating === 1) barColor = "bg-red-500";
                  
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="w-14 flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium">{rating}</span>
                      </div>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: 0.1 * (6 - rating) }}
                          className={`h-full ${barColor} rounded-full`}
                        />
                      </div>
                      <div className="w-14 text-sm text-right font-medium">
                        {count} <span className="text-gray-500 text-xs">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Reviews List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-4"
      >
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isMobile ? 'mobile-reviews-header' : ''}`}>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            Customer Feedback
          </h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className={`w-[200px] border-violet-200 ${isMobile ? 'select-trigger' : ''}`}>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-violet-500" />
                <SelectValue placeholder="Filter reviews" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="high">High Ratings (4-5 ★)</SelectItem>
              <SelectItem value="low">Low Ratings (1-2 ★)</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="pending">Awaiting Response</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredReviews.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <MessageSquare className="h-12 w-12 text-gray-300" />
                <h3 className="text-lg font-semibold">No Reviews Found</h3>
                <p className="max-w-md text-sm text-gray-500">
                  There are no reviews matching your current filter. Try changing your filter or check back later.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredReviews.map((review, index) => (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
              >
                <Card className={`w-full border-0 shadow-sm overflow-hidden ${isMobile ? 'mobile-review-card' : ''}`}>
                  <CardHeader className={`pb-0 ${isMobile ? 'card-header' : ''}`}>
                    <div className={`flex justify-between items-start ${isMobile ? 'card-header-content' : ''}`}>
                      <div className={`flex items-start gap-4 ${isMobile ? 'customer-details' : ''}`}>
                        <Avatar className="h-10 w-10 border border-gray-200">
                          <AvatarFallback className={`${
                            review.rating >= 4 ? 'bg-green-100 text-green-700' :
                            review.rating === 3 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {getInitials(review.customerName || 'Anonymous')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {review.customerName || 'Anonymous Customer'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <div className="flex">{renderStars(review.rating)}</div>
                            <Badge className={getRatingColor(review.rating)}>
                              {getRatingText(review.rating)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-1 text-sm text-gray-500 ${isMobile ? 'review-date' : ''}`}>
                        <Clock className="h-3 w-3" />
                        <span>{getTimeAgo(review.createdAt)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className={`space-y-4 pt-4 ${isMobile ? 'card-content' : ''}`}>
                    <div className={`bg-gray-50 p-4 rounded-lg ${isMobile ? 'review-text' : ''}`}>
                      {review.comment ? (
                        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                      ) : (
                        <p className="text-gray-500 italic">No written review provided</p>
                      )}
                    </div>
                    
                    {review.reply && (
                      <div className={`bg-violet-50 p-4 rounded-lg border border-violet-100 ${isMobile ? 'reply-container' : ''}`}>
                        <div className={`flex items-center justify-between mb-2 ${isMobile ? 'mobile-reply-header' : ''}`}>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-violet-100 text-violet-800 border-violet-200">Your Response</Badge>
                            <span className="text-xs text-violet-600">
                              {new Date(review.replyDate!).toLocaleDateString()}
                            </span>
                          </div>
                          {editingReply !== review._id && (
                            <div className={`flex items-center gap-2 ${isMobile ? 'reply-actions' : ''}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-500 hover:text-violet-700"
                                onClick={() => startEditingReply(review._id, review.reply)}
                                title="Edit reply"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-700"
                                    title="Delete reply"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className={isMobile ? 'mobile-alert-dialog' : ''}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Reply</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete your reply to this review? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() => handleDeleteReply(review._id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                        
                        {editingReply === review._id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editReplyText}
                              onChange={(e) => setEditReplyText(e.target.value)}
                              className={`min-h-[100px] border-violet-200 focus:border-violet-300 ${isMobile ? 'textarea' : ''}`}
                            />
                            <div className={`flex justify-end gap-2 ${isMobile ? 'mobile-reply-actions' : ''}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditingReply}
                                className="text-gray-600"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditReply(review._id)}
                                className="bg-violet-600 hover:bg-violet-700 text-white"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-violet-700">{review.reply}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                  
                  {!review.reply && (
                    <CardFooter className={`border-t bg-gray-50 p-4 ${isMobile ? 'card-footer' : ''}`}>
                      <div className="w-full space-y-3">
                        <Textarea
                          placeholder="Write your reply to this review..."
                          value={replyText[review._id] || ''}
                          onChange={(e) =>
                            setReplyText({
                              ...replyText,
                              [review._id]: e.target.value,
                            })
                          }
                          className={`min-h-[100px] border-gray-200 focus:border-violet-300 ${isMobile ? 'textarea' : ''}`}
                        />
                        <Button
                          onClick={() => handleReply(review._id)}
                          className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Post Reply
                        </Button>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
      
      {/* Review Tips */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className={`mt-8 ${isMobile ? 'mobile-tips-section' : ''}`}
      >
        <Card className="bg-gradient-to-r from-violet-50 via-purple-50 to-violet-50 border-0 shadow-sm">
          <CardHeader className={isMobile ? 'card-header' : ''}>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-violet-600" />
              Tips for Responding to Reviews
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'card-content' : ''}>
            <div className={`grid gap-4 md:grid-cols-3 ${isMobile ? 'mobile-tips-grid' : ''}`}>
              <div className={`bg-white p-4 rounded-lg border border-violet-100 ${isMobile ? 'mobile-tip-card' : ''}`}>
                <h3 className="font-semibold text-violet-900 mb-2">Be Timely</h3>
                <p className="text-sm text-gray-600">Respond promptly to reviews, especially negative ones, to show customers you value their feedback.</p>
              </div>
              <div className={`bg-white p-4 rounded-lg border border-violet-100 ${isMobile ? 'mobile-tip-card' : ''}`}>
                <h3 className="font-semibold text-violet-900 mb-2">Be Professional</h3>
                <p className="text-sm text-gray-600">Maintain a professional tone even when responding to critical reviews. Never be defensive.</p>
              </div>
              <div className={`bg-white p-4 rounded-lg border border-violet-100 ${isMobile ? 'mobile-tip-card' : ''}`}>
                <h3 className="font-semibold text-violet-900 mb-2">Personalize Responses</h3>
                <p className="text-sm text-gray-600">Address the customer by name and reference specific points from their review to show you've read it carefully.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 