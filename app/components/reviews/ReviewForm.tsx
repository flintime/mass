'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Image as ImageIcon, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/hooks/useAuth';

interface ReviewFormProps {
  businessId: string;
  onSubmit: () => void;
}

export function ReviewForm({ businessId, onSubmit }: ReviewFormProps) {
  const { user, loading, refreshToken } = useAuth();
  const [rating, setRating] = useState(0);
  const [serviceQualityRating, setServiceQualityRating] = useState(0);
  const [valueForMoneyRating, setValueForMoneyRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  
  // Add state for image upload
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing review data
  const fetchExistingReview = async () => {
    try {
      const reviewsResponse = await fetch(`/api/reviews/${businessId}`, {
        credentials: 'include'
      });
      const reviewsData = await reviewsResponse.json();
      const userReview = reviewsData.reviews.find((review: any) => 
        review.userId === user?.id
      );
      if (userReview) {
        console.log('Found existing review:', userReview);
        setExistingReview(userReview);
        if (isEditing) {
          // Ensure we have valid numeric ratings
          const overallRating = Number(userReview.rating) || 0;
          setRating(overallRating);
          
          // Use the specific ratings if they exist, otherwise fall back to overall rating
          const sqRating = Number(userReview.serviceQualityRating);
          const vfmRating = Number(userReview.valueForMoneyRating);
          
          setServiceQualityRating(!isNaN(sqRating) && sqRating > 0 ? sqRating : overallRating);
          setValueForMoneyRating(!isNaN(vfmRating) && vfmRating > 0 ? vfmRating : overallRating);
          
          setComment(userReview.comment || '');
          
          // Handle existing images
          if (userReview.images && userReview.images.length > 0) {
            console.log('Setting existing images:', userReview.images);
            setPreviewImages([...userReview.images]);
            setReviewImages([]); // Clear any new images when editing
          }
        }
      }
    } catch (error) {
      console.error('Error fetching review:', error);
    }
  };

  // Check if user has already reviewed when component mounts
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/reviews/${businessId}/check-review`, {
          credentials: 'include'
        });
        const data = await response.json();
        setHasReviewed(data.hasReviewed);
        
        // If user has reviewed, fetch the existing review
        if (data.hasReviewed) {
          await fetchExistingReview();
        }
      } catch (error) {
        console.error('Error checking existing review:', error);
      }
    };

    checkExistingReview();
  }, [businessId, user, isEditing]);

  // Set existing review images when editing
  useEffect(() => {
    if (isEditing && existingReview?.images && existingReview.images.length > 0) {
      console.log('Setting up edit mode with images:', existingReview.images);
      // Set preview images from existing review
      setPreviewImages(existingReview.images);
      // Clear reviewImages array since we're working with existing images
      setReviewImages([]);
    }
  }, [isEditing, existingReview]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Limit to 10 images total
      const totalImages = [...reviewImages, ...selectedFiles];
      if (totalImages.length > 10) {
        toast({
          title: "Too many images",
          description: "You can upload a maximum of 10 images per review.",
          variant: "destructive",
        });
        return;
      }
      
      // Add new images
      setReviewImages(prev => [...prev, ...selectedFiles]);
      
      // Create preview URLs
      const newPreviewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewImages(prev => [...prev, ...newPreviewUrls]);
    }
  };
  
  // Remove an image
  const removeImage = (index: number) => {
    console.log('Removing image at index:', index, 'Preview images:', previewImages);
    
    // Always remove from preview images
    if (index < previewImages.length) {
      // If it's a new image (File object URL), revoke it to avoid memory leaks
      if (previewImages[index].startsWith('blob:')) {
        URL.revokeObjectURL(previewImages[index]);
        
        // Also remove from reviewImages array if it's a new image
        const newImageIndex = previewImages.slice(0, index).filter(url => url.startsWith('blob:')).length;
        if (newImageIndex < reviewImages.length) {
          setReviewImages(prev => prev.filter((_, i) => i !== newImageIndex));
        }
      }
      
      // Remove from preview images
      setPreviewImages(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure service quality and value for money ratings are set
    // Only if they haven't been explicitly set by the user
    const finalServiceQualityRating = serviceQualityRating === 0 ? rating : serviceQualityRating;
    const finalValueForMoneyRating = valueForMoneyRating === 0 ? rating : valueForMoneyRating;
    
    console.log('Submitting review with ratings:', {
      rating,
      serviceQualityRating,
      valueForMoneyRating,
      finalServiceQualityRating,
      finalValueForMoneyRating
    });
    
    // Remove the safety check that was causing validation failures
    // The finalServiceQualityRating and finalValueForMoneyRating will never be 0
    // because they default to the overall rating which must be > 0
    
    setIsSubmitting(true);

    try {
      // First check if user is authenticated
      if (!user || !user.id) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to submit a review.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Refresh the auth token before submitting to ensure it's properly set in cookies
      const tokenRefreshed = await refreshToken();
      if (!tokenRefreshed) {
        toast({
          title: "Authentication Error",
          description: "Unable to authenticate. Please sign in again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append('rating', rating.toString());
      formData.append('serviceQualityRating', finalServiceQualityRating.toString());
      formData.append('valueForMoneyRating', finalValueForMoneyRating.toString());
      formData.append('comment', comment);
      formData.append('customerName', user?.name || 'Anonymous');
      formData.append('customerEmail', user?.email || '');
      
      // Add new images to FormData
      reviewImages.forEach((image) => {
        formData.append('reviewImages', image);
      });
      
      // Add existing image URLs if editing
      if (isEditing) {
        // Include all current preview images that are URLs (not blob URLs)
        previewImages.forEach((url: string) => {
          if (!url.startsWith('blob:')) {
            formData.append('reviewImages', url);
          }
        });
      }

      console.log('Submitting review with images:', {
        newImages: reviewImages.length,
        existingImages: previewImages.filter(url => !url.startsWith('blob:')).length,
        totalPreviewImages: previewImages.length
      });

      // Log the actual form data being sent
      console.log('Form data values:');
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch(`/api/reviews/${businessId}`, {
        method,
        credentials: 'include',
        body: formData, // Send FormData instead of JSON
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle token expiration or authentication issues
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please sign in again to submit a review.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error || 'Failed to submit review');
      }

      // Update the existing review data immediately
      setExistingReview({
        ...data,
        rating,
        serviceQualityRating: finalServiceQualityRating,
        valueForMoneyRating: finalValueForMoneyRating,
        comment,
        customerName: user?.name || 'Anonymous',
        createdAt: new Date().toISOString(),
        images: data.images || []
      });

      toast({
        title: "Success",
        description: isEditing ? "Your review has been updated successfully." : "Your review has been submitted successfully.",
      });

      // Reset form and state
      if (!isEditing) {
        setRating(0);
        setServiceQualityRating(0);
        setValueForMoneyRating(0);
        setComment('');
        setReviewImages([]);
        setPreviewImages([]);
      }
      setHasReviewed(true);
      setIsEditing(false);
      onSubmit();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-white shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="p-8 bg-white shadow-sm">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in to Write a Review</h3>
          <p className="text-gray-600 mb-6">Share your experience with others by signing in to write a review.</p>
          <Button asChild className="min-w-[200px]">
            <a href="/signin">Sign In to Review</a>
          </Button>
        </div>
      </Card>
    );
  }

  if (hasReviewed && !isEditing) {
    return (
      <Card className="p-8 bg-white shadow-sm">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Review</h3>
          
          <div className="space-y-3 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Overall Rating</p>
              <div className="flex justify-center">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={cn(
                      'h-6 w-6 mx-0.5',
                      value <= (existingReview?.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                    )}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-center gap-8 mt-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Service Quality</p>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={cn(
                        'h-5 w-5 mx-0.5',
                        value <= (existingReview?.serviceQualityRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                      )}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Value for Money</p>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={cn(
                        'h-5 w-5 mx-0.5',
                        value <= (existingReview?.valueForMoneyRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-gray-700 italic">"{existingReview?.comment}"</p>
          </div>
          
          {/* Display existing review images if any */}
          {existingReview?.images && existingReview.images.length > 0 && (
            <div className="mt-4 mb-6">
              <p className="text-sm text-gray-500 mb-2">Your review images:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {existingReview.images.map((image: string, index: number) => (
                  <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden border border-amber-200 group">
                    <img 
                      src={image} 
                      alt={`Review image ${index + 1}`} 
                      className="w-full h-full object-cover"
                      onClick={() => window.open(image, '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            className="min-w-[200px]"
          >
            Edit Your Review
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      {!loading && (
        <>
          {!user ? (
            <div className="p-3 bg-amber-50 rounded-md border border-amber-100 text-center">
              <p className="text-amber-800 text-sm mb-2">You need to sign in to write a review</p>
              <Button 
                variant="default" 
                size="sm"
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => window.location.href = `/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`}
              >
                Sign In
              </Button>
            </div>
          ) : hasReviewed && !isEditing ? (
            <div className="p-3 bg-amber-50 rounded-md border border-amber-100">
              <p className="text-amber-800 text-sm mb-2">You have already reviewed this business.</p>
              <Button 
                variant="outline" 
                size="sm"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => setIsEditing(true)}
              >
                Edit Your Review
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Overall Rating */}
              <div>
                <Label htmlFor="rating" className="text-sm font-medium mb-1 block">
                  Overall Rating
                </Label>
                <div className="flex items-center mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-0.5 focus:outline-none"
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 cursor-pointer transition-colors",
                          star <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {rating ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select rating'}
                  </span>
                </div>
              </div>

              {/* Service Quality Rating */}
              <div>
                <Label htmlFor="serviceQuality" className="text-xs text-gray-600 mb-1 block">
                  Service Quality
                </Label>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-0.5 focus:outline-none"
                      onClick={() => setServiceQualityRating(star)}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 cursor-pointer transition-colors",
                          star <= serviceQualityRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Value for Money Rating */}
              <div>
                <Label htmlFor="valueForMoney" className="text-xs text-gray-600 mb-1 block">
                  Value for Money
                </Label>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-0.5 focus:outline-none"
                      onClick={() => setValueForMoneyRating(star)}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 cursor-pointer transition-colors",
                          star <= valueForMoneyRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <Label htmlFor="comment" className="text-sm font-medium mb-1 block">
                  Your Review
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="resize-none h-20 text-sm"
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label className="text-sm font-medium mb-1 block">
                  Add Photos (Optional)
                </Label>
                
                {/* Image Preview */}
                {previewImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {previewImages.map((imageUrl, index) => (
                      <div 
                        key={index} 
                        className="relative w-14 h-14 border border-gray-200 rounded-md overflow-hidden"
                      >
                        <img 
                          src={imageUrl} 
                          alt={`Preview ${index+1}`} 
                          className="w-full h-full object-cover" 
                        />
                        <button 
                          type="button" 
                          onClick={() => removeImage(index)}
                          className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-md"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={triggerFileInput}
                    className="text-gray-600 text-xs flex items-center gap-1"
                    disabled={previewImages.length >= 10}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload Image
                  </Button>
                  <span className="text-xs text-gray-500">
                    {previewImages.length}/10 images
                  </span>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 text-sm"
                  size="sm"
                >
                  {isSubmitting 
                    ? 'Submitting...' 
                    : isEditing 
                      ? 'Update Review' 
                      : 'Submit Review'
                  }
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </>
  );
} 