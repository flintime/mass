'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { 
  MapPin, Phone, Globe, Clock, Star, ChevronRight, ChevronLeft, 
  X, MessageSquare, Calendar, Users, Briefcase, CheckCircle,
  ArrowLeft, Image as ImageIcon, Info, Mail, DollarSign,
  ChevronDown, ChevronUp, Heart, Share2, Menu, Gift, PartyPopper, Tag
} from 'lucide-react';
import { ServiceShare } from '@/components/ServiceShare';
import { ReviewList } from '@/app/components/reviews';
import { ReviewForm } from '@/app/components/reviews/ReviewForm';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { getServiceGradient, getIconBackground, getTextColor } from './violet-theme';

// Use the same types and helper functions from the desktop page
interface BusinessDetails {
  id?: string;
  business_name: string;
  description: string;
  Business_Category: string;
  Business_Subcategories: string[];
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  Website?: string;
  images: { url: string }[];
  business_features?: string[];
  rating?: number;
  totalReviews?: number;
  location?: {
    coordinates: [number, number];
  };
  faqs?: {
    question: string;
    answer: string;
  }[];
  services: string[];
  operatingHours?: string;
  weekendHours?: string;
  sundayHours?: string;
  years_in_business?: string | number;
  promotions?: {
    name: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    isFirstTimeOnly: boolean;
    validUntil: string;
    isActive: boolean;
  }[];
  averageServiceQuality?: number;
  averageValueForMoney?: number;
  unique_id?: string;
}

interface Review {
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  images?: string[];
  reply?: string;
  replyDate?: string;
  businessReply?: {
    text: string;
    createdAt: string;
  };
}

// Mobile-specific image preview modal
function MobileImagePreviewModal({ 
  images,
  currentIndex,
  onClose
}: { 
  images: { url: string }[];
  currentIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(currentIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [transition, setTransition] = useState(true); // For transition control
  
  const handlePrevious = () => {
    setTransition(true);
    setIsZoomed(false);
    setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setTransition(true);
    setIsZoomed(false);
    setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };
  
  // Swipe handlers for touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
    
    // Reset values
    setTouchStart(0);
    setTouchEnd(0);
  };
  
  // Toggle zoom on image tap
  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTransition(true);
    setIsZoomed(!isZoomed);
  };
  
  // To disable transitions after zoom starts
  useEffect(() => {
    if (isZoomed) {
      const timer = setTimeout(() => setTransition(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isZoomed]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
      {/* Header with controls */}
      <div className="flex justify-between items-center p-4 bg-black/60 backdrop-blur-lg z-10">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-9 w-9 rounded-full text-white hover:bg-white/15 transition-all duration-300"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="ml-3 bg-black/40 backdrop-blur-lg px-3 py-1 rounded-full text-white text-xs flex items-center shadow-sm">
            <span className="font-medium">{index + 1} / {images.length}</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-all duration-300"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-all duration-300"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Main image view */}
      <div 
        className="flex-1 relative flex items-center justify-center touch-pan-y bg-black"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={`absolute inset-0 flex items-center justify-center ${isZoomed ? 'overflow-auto' : ''}`}
          onClick={toggleZoom}
        >
          <div 
            className={`relative ${
              isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
            } ${transition ? 'transition-transform duration-300' : ''}`}
          >
            <Image
              src={images[index].url}
              alt="Business image"
              width={isZoomed ? 1200 : 800}
              height={isZoomed ? 1200 : 800}
              className={`object-contain ${transition ? 'transition-all duration-300' : ''} ${
                isZoomed ? 'opacity-100' : 'opacity-95 hover:opacity-100'
              }`}
              sizes="100vw"
              priority
            />
          </div>
        </div>
        
        {!isZoomed && images.length > 1 && (
          <div className="absolute inset-y-0 inset-x-0 flex items-center justify-between pointer-events-none">
            <div 
              className="h-full flex items-center justify-start pl-2 w-1/5 pointer-events-auto" 
              onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
            >
              <div className="bg-black/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/40 transition-all duration-300 shadow-lg">
                <ChevronLeft className="h-5 w-5" />
              </div>
            </div>
            
            <div 
              className="h-full flex items-center justify-end pr-2 w-1/5 pointer-events-auto" 
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
            >
              <div className="bg-black/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/40 transition-all duration-300 shadow-lg">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}
        
        {/* Overlay instructions */}
        {isZoomed ? (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-lg shadow-lg">
            <p className="text-white/90">Tap image to zoom out</p>
          </div>
        ) : (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/40 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg opacity-80">
            <p className="text-white/90">Tap image to zoom in</p>
          </div>
        )}
      </div>
      
      {/* Thumbnail navigation */}
      {!isZoomed && images.length > 1 && (
        <div className="bg-black/80 backdrop-blur-lg py-4">
          <ScrollArea className="w-full">
            <div className="flex justify-center gap-2 px-4">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  className={`relative h-1.5 rounded-full transition-all duration-300 ${
                    index === idx 
                      ? 'w-8 bg-white' 
                      : 'w-1.5 bg-white/30 hover:bg-white/50'
                  }`}
                  onClick={() => { setIsZoomed(false); setIndex(idx); }}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// Add a BusinessHours component for mobile
function BusinessHours({ 
  business, 
  feedAIBusinessHours 
}: { 
  business: BusinessDetails; 
  feedAIBusinessHours: Record<string, { isOpen: boolean; open: string; close: string; }> | null;
}) {
  if (!business) return null;
  
  const formatHours = (time: string): string => {
    if (!time || time === "00:00") return "Closed";
    
    // Convert 24-hour format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };
  
  // Get current day to highlight it
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = daysOfWeek[new Date().getDay()];
  
  // Check if we have AI-generated business hours
  if (feedAIBusinessHours) {
    return (
      <div className="space-y-2.5">
        {daysOfWeek.map((day) => {
          const isToday = day === currentDay;
          const isOpen = feedAIBusinessHours[day]?.isOpen;
          
          return (
            <div 
              key={day} 
              className={`flex justify-between items-center p-2.5 rounded-lg transition-all duration-300 ${
                isToday 
                  ? 'bg-violet-50/80 border border-violet-100/60 shadow-sm' 
                  : 'hover:bg-violet-50/40'
              }`}
            >
              <div className="flex items-center">
                <span className={`capitalize font-medium ${isToday ? 'text-violet-700' : 'text-gray-600'}`}>
                  {day}
                </span>
                {isToday && (
                  <span className="ml-2 text-xs font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </div>
              <div className="flex items-center">
                <span className={`font-medium text-sm ${
                  !isOpen 
                    ? 'text-gray-500' 
                    : isToday 
                      ? 'text-violet-700' 
                      : 'text-gray-700'
                }`}>
                  {isOpen 
                    ? `${formatHours(feedAIBusinessHours[day].open)} - ${formatHours(feedAIBusinessHours[day].close)}`
                    : "Closed"}
                </span>
                {isOpen && isToday && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  // Otherwise fall back to the legacy format
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-violet-50/40 transition-all duration-300">
        <span className="text-gray-600 font-medium">Monday - Friday</span>
        <span className="font-medium text-sm text-gray-700">{business.operatingHours || "9:00 AM - 5:00 PM"}</span>
      </div>
      <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-violet-50/40 transition-all duration-300">
        <span className="text-gray-600 font-medium">Saturday</span>
        <span className="font-medium text-sm text-gray-700">{business.weekendHours || "10:00 AM - 4:00 PM"}</span>
      </div>
      <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-violet-50/40 transition-all duration-300">
        <span className="text-gray-600 font-medium">Sunday</span>
        <span className="font-medium text-sm text-gray-700">{business.sundayHours || "Closed"}</span>
      </div>
    </div>
  );
}

export default function MobileServiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'reviews' | 'services' | 'offers'>('info');
  const [expanded, setExpanded] = useState(false);
  const [feedAIBusinessHours, setFeedAIBusinessHours] = useState<any>(null);
  const [promotions, setPromotions] = useState<BusinessDetails['promotions']>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Get the id from the params
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!business?.id) return;
      
      setLoadingReviews(true);
      try {
        console.log(`Mobile view: Fetching reviews for business id: ${business.id}`);
        const response = await fetch(`/api/reviews/${business.id}`);
        if (!response.ok) throw new Error('Failed to fetch reviews');
        
        const data = await response.json();
        console.log('Mobile view: Reviews fetched successfully:', data);
        
        // The API returns { reviews, averageRating, totalReviews, ... }
        if (Array.isArray(data.reviews)) {
          setReviews(data.reviews);
          // Update business rating and totalReviews if they weren't set before
          if (business && (!business.rating || !business.totalReviews)) {
            setBusiness(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                rating: prev.rating || data.averageRating,
                totalReviews: prev.totalReviews || data.totalReviews
              };
            });
          }
        } else {
          console.error('Mobile view: Unexpected reviews data format:', data);
          setReviews([]);
        }
      } catch (err) {
        console.error('Mobile view: Error fetching reviews:', err);
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };
    
    if (business?.id) {
      fetchReviews();
    }
  }, [business?.id]);

  useEffect(() => {
    const fetchBusinessDetails = async () => {
      setLoading(true);
      try {
        console.log(`Mobile view: Fetching business details for id: ${id}`);
        const response = await fetch(`/api/business/${id}`);
        if (!response.ok) throw new Error('Failed to fetch business details');
        const data = await response.json();
        
        // Extract business data and ensure services is an array
        const businessData = {
          ...data.business,
          id: data.business._id || id,
          unique_id: data.business.unique_id || id,
          images: Array.isArray(data.business?.images) ? data.business.images : [],
          services: Array.isArray(data.business?.services) ? data.business.services : [],
          promotions: Array.isArray(data.business?.promotions) ? data.business.promotions : [],
          averageServiceQuality: data.business?.averageServiceQuality,
          averageValueForMoney: data.business?.averageValueForMoney
        };
        
        // Ensure faqs array exists (convert legacy format if needed)
        if (!businessData.faqs || businessData.faqs.length === 0) {
          if (businessData.faq_question && businessData.faq_answer) {
            businessData.faqs = [{
              question: businessData.faq_question,
              answer: businessData.faq_answer
            }];
          } else {
            businessData.faqs = [];
          }
        }
        
        console.log('Mobile view: Business data fetched successfully', businessData);
        setBusiness(businessData);
        setLoading(false);
        
        // Set initial promotions
        if (businessData.promotions && businessData.promotions.length > 0) {
          setPromotions(businessData.promotions);
        }

        // Fetch AI business hours
        try {
          if (businessData.id) {
            const feedAIResponse = await fetch(`/api/business/feed-ai/public?businessId=${businessData.id}`);
            if (feedAIResponse.ok) {
              const feedAIData = await feedAIResponse.json();
              if (feedAIData.businessHours) {
                setFeedAIBusinessHours(feedAIData.businessHours);
              }
              
              // Get additional promotions from Feed AI
              if (feedAIData.promotions && feedAIData.promotions.length > 0) {
                setPromotions(prevPromotions => {
                  // Handle the case where prevPromotions might be undefined
                  const currentPromotions = prevPromotions || [];
                  
                  // Create a Set of existing promotion names instead of ids
                  const existingNames = new Set(currentPromotions.map(p => p.name));
                  
                  // Filter new promotions by name instead of id
                  const newPromotions = feedAIData.promotions.filter(
                    (p: any) => !existingNames.has(p.name)
                  );
                  
                  return [...currentPromotions, ...newPromotions];
                });
              }
            }
          }
        } catch (err) {
          console.error('Mobile view: Error fetching Feed AI data:', err);
        }
      } catch (err) {
        console.error('Mobile view: Error fetching business details:', err);
        setError('Failed to load business details. Please try again later.');
        setLoading(false);
      }
    };

    fetchBusinessDetails();
  }, [id]);

  const handleOpenImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  // Function to toggle description expansion
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Format promotion date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No expiration';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'No expiration';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format discount display
  const formatDiscount = (promotion: any) => {
    if (!promotion) return '';
    
    if (promotion.discountType === 'percentage') {
      return `${promotion.discountValue}% off`;
    } else {
      return `$${promotion.discountValue} off`;
    }
  };

  // Helper functions for offers section
  const getPromotionGradient = (promotion: any, index: number) => {
    // Determine gradient based on discount type and value
    if (promotion.discountType === 'percentage') {
      if (promotion.discountValue >= 50) {
        return 'from-rose-50 to-rose-100';
      } else if (promotion.discountValue >= 30) {
        return 'from-amber-50 to-amber-100';
      }
    } else if (promotion.discountType === 'fixed') {
      if (promotion.discountValue >= 100) {
        return 'from-purple-50 to-purple-100';
      } else if (promotion.discountValue >= 50) {
        return 'from-blue-50 to-blue-100';
      }
    }
    
    // Default gradients in a rotation
    const gradients = [
      'from-indigo-50 to-violet-100',
      'from-blue-50 to-indigo-100',
      'from-sky-50 to-blue-100',
      'from-teal-50 to-emerald-100'
    ];
    
    return gradients[index % gradients.length];
  };
  
  const getPromotionIconBg = (promotion: any, index: number) => {
    // Backgrounds based on discount type
    if (promotion.discountType === 'percentage') {
      if (promotion.discountValue >= 50) {
        return 'bg-rose-100 text-rose-600';
      } else if (promotion.discountValue >= 30) {
        return 'bg-amber-100 text-amber-600';
      }
    } else if (promotion.discountType === 'fixed') {
      if (promotion.discountValue >= 100) {
        return 'bg-purple-100 text-purple-600';
      } else if (promotion.discountValue >= 50) {
        return 'bg-blue-100 text-blue-600';
      }
    }
    
    // Default backgrounds
    const backgrounds = [
      'bg-violet-100 text-violet-600',
      'bg-indigo-100 text-indigo-600',
      'bg-blue-100 text-blue-600',
      'bg-teal-100 text-teal-600'
    ];
    
    return backgrounds[index % backgrounds.length];
  };
  
  const getPromotionTextColor = (promotion: any, index: number) => {
    // Colors based on discount type
    if (promotion.discountType === 'percentage') {
      if (promotion.discountValue >= 50) {
        return 'text-rose-700';
      } else if (promotion.discountValue >= 30) {
        return 'text-amber-700';
      }
    } else if (promotion.discountType === 'fixed') {
      if (promotion.discountValue >= 100) {
        return 'text-purple-700';
      } else if (promotion.discountValue >= 50) {
        return 'text-blue-700';
      }
    }
    
    // Default text colors
    const colors = [
      'text-violet-700',
      'text-indigo-700',
      'text-blue-700',
      'text-teal-700'
    ];
    
    return colors[index % colors.length];
  };

  // Function to handle the review submission success
  const handleReviewSuccess = async () => {
    setShowReviewForm(false);
    
    // Refetch reviews to update the list
    setLoadingReviews(true);
    try {
      const response = await fetch(`/api/reviews/${business?.id || id}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      
      const data = await response.json();
      if (Array.isArray(data.reviews)) {
        setReviews(data.reviews);
        
        // Update business rating and totalReviews
        setBusiness(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            rating: data.averageRating,
            totalReviews: data.totalReviews,
            averageServiceQuality: data.averageServiceQuality,
            averageValueForMoney: data.averageValueForMoney
          };
        });
      }
    } catch (err) {
      console.error('Error refreshing reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
    
    // Show success toast
    toast({
      title: "Review Submitted",
      description: "Your review has been submitted successfully!",
      duration: 3000,
    });
  };

  // Define all rendering logic here
  const renderLoading = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-white to-violet-50">
      <div className="p-4 flex items-center sticky top-0 z-40 backdrop-blur-lg bg-white/90 border-b border-gray-100/50 shadow-sm">
        <Button variant="ghost" size="icon" onClick={handleGoBack} className="rounded-full hover:bg-violet-100/60 text-violet-600 transition-all duration-300">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2 text-violet-600">Loading</h1>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse space-y-5 w-full px-5">
          {/* Loading image placeholder */}
          <div className="h-72 w-full bg-gradient-to-r from-violet-100 to-indigo-100 rounded-xl shadow-inner"></div>
          
          {/* Loading thumbnails placeholder */}
          <div className="flex space-x-2 overflow-x-auto py-2 bg-gradient-to-r from-violet-200/50 to-indigo-200/50 rounded-lg">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="h-16 w-20 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-lg flex-shrink-0"></div>
            ))}
          </div>
          
          {/* Loading title and details placeholder */}
          <div className="h-7 w-3/4 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full"></div>
          <div className="h-5 w-1/2 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full"></div>
          
          {/* Loading content placeholder */}
          <div className="space-y-3 mt-4">
            <div className="h-5 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full"></div>
            <div className="h-5 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full"></div>
            <div className="h-5 w-5/6 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full"></div>
            <div className="h-5 w-4/5 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full"></div>
          </div>
          
          {/* Loading card placeholders */}
          <div className="h-32 w-full bg-gradient-to-r from-violet-100 to-indigo-100 rounded-xl mt-4"></div>
          <div className="h-40 w-full bg-gradient-to-r from-violet-100 to-indigo-100 rounded-xl mt-2"></div>
        </div>
      </div>
      
      {/* Animated loading indicator at bottom */}
      <div className="flex justify-center pb-6 pt-2">
        <div className="flex space-x-1.5 items-center">
          <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse"></div>
          <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse delay-150"></div>
          <div className="h-2 w-2 rounded-full bg-violet-600 animate-pulse delay-300"></div>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-white to-violet-50">
      <div className="p-4 flex items-center sticky top-0 z-40 backdrop-blur-lg bg-white/90 border-b border-gray-100/50 shadow-sm">
        <Button variant="ghost" size="icon" onClick={handleGoBack} className="rounded-full hover:bg-violet-100/60 text-violet-600 transition-all duration-300">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2 text-violet-600">Error</h1>
      </div>
      <div className="flex-1 flex items-center justify-center p-5">
        <Card className="p-8 w-full max-w-md text-center border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
          <div className="mb-6 text-red-500 bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto border border-red-100/50 shadow-sm">
            <Info className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold mb-3 bg-gradient-to-r from-red-600 to-violet-600 text-transparent bg-clip-text">Something went wrong</h2>
          <p className="text-gray-500 mb-6 max-w-xs mx-auto">{error || 'Failed to load business details'}</p>
          <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 px-6 py-2.5">
            Try Again
          </Button>
        </Card>
      </div>
    </div>
  );

  const renderContent = () => {
    if (!business) return null;
    
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-white to-violet-50">
        {/* Mobile header - Modernized with frosted glass effect */}
        <div className="sticky top-0 z-40 p-4 flex items-center justify-between backdrop-blur-lg bg-white/90 border-b border-gray-100/50 shadow-sm">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleGoBack} className="rounded-full hover:bg-violet-100/60 text-violet-600 transition-all duration-300">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold ml-2 truncate max-w-[200px] bg-gradient-to-r from-violet-600 to-indigo-600 text-transparent bg-clip-text">{business.business_name}</h1>
          </div>
          <div className="flex items-center space-x-1">
            <ServiceShare serviceId={id} />
          </div>
        </div>

        {/* Image gallery - Modernized with immersive design */}
        <div className="relative">
          {business.images && business.images.length > 0 ? (
            <>
              {/* Main featured image - Modernized with immersive design */}
              <div 
                className="relative overflow-hidden bg-black"
                onClick={() => handleOpenImageModal(selectedImageIndex)}
              >
                <div className="relative h-96 w-full">
                  <Image
                    src={business.images[selectedImageIndex].url}
                    alt={business.business_name}
                    fill
                    className="object-cover transition-all duration-500 hover:scale-105 cursor-pointer"
                    sizes="100vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10"></div>
                  
                  {/* Overlay elements */}
                  <div className="absolute top-0 inset-x-0 flex justify-between items-start p-4">
                    <div className="bg-black/40 backdrop-blur-lg px-3 py-1.5 rounded-full text-white text-xs flex items-center shadow-lg">
                      <div className="flex items-center">
                        <ImageIcon className="h-3 w-3 mr-1.5" />
                        <span className="font-medium">{selectedImageIndex + 1}/{business.images.length}</span>
                      </div>
                    </div>
                    
                    <div className="bg-black/40 backdrop-blur-lg p-2 rounded-full text-white flex items-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8V5a2 2 0 0 1 2-2h3"></path>
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                        <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                        <path d="M21 16v3a2 2 0 0 1-2 2h-3"></path>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Business name overlay at bottom */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <h2 className="text-white font-semibold text-lg">{business.business_name}</h2>
                </div>

                {/* Navigation arrows on main image - Cleaner design */}
                {business.images.length > 1 && (
                  <div className="absolute inset-y-0 inset-x-0 flex items-center justify-between pointer-events-none">
                    <div 
                      className="h-12 w-12 flex items-center justify-center pointer-events-auto" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : business.images.length - 1));
                      }}
                    >
                      <div className="bg-black/30 backdrop-blur-md text-white p-2 rounded-r-full hover:bg-black/50 transition-all duration-300 shadow-lg">
                        <ChevronLeft className="h-5 w-5" />
                      </div>
                    </div>
                    <div 
                      className="h-12 w-12 flex items-center justify-center pointer-events-auto" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => (prev < business.images.length - 1 ? prev + 1 : 0));
                      }}
                    >
                      <div className="bg-black/30 backdrop-blur-md text-white p-2 rounded-l-full hover:bg-black/50 transition-all duration-300 shadow-lg">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thumbnail carousel - Modern horizontal scrolling with active indicator */}
              <div className="bg-black py-4 px-2">
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-4 pt-1 px-2">
                    {business.images.map((image, idx) => (
                      <button
                        key={idx}
                        className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg transition-all duration-300 focus:outline-none"
                        onClick={() => setSelectedImageIndex(idx)}
                      >
                        <Image 
                          src={image.url} 
                          alt={`${business.business_name} - image ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 80px, 80px"
                        />
                        <div className={`absolute inset-0 transition-all duration-300 ${
                          selectedImageIndex === idx 
                            ? 'bg-transparent ring-2 ring-white' 
                            : 'bg-black/40 hover:bg-black/20'
                        }`}></div>
                        {selectedImageIndex === idx && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-white"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="text-center">
                <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4 opacity-50" />
                <p className="text-gray-300 font-medium">No images available</p>
              </div>
            </div>
          )}
        </div>

        {/* Business info - Enhanced with better spacing and gradients */}
        <div className="p-5 bg-white border-b border-violet-100/40 shadow-sm">
          <div className="flex items-center mt-2">
            <div className="flex items-center text-amber-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="ml-1 text-sm font-medium">{business.rating || 'New'}</span>
            </div>
            {business.totalReviews && (
              <span className="text-sm text-gray-500 ml-1">
                ({business.totalReviews} {business.totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            )}
            <span className="mx-2 text-gray-300">•</span>
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 border-violet-200 px-2.5 py-0.5">
              {business.Business_Category}
            </Badge>
          </div>
          
          {/* Subcategories */}
          {business.Business_Subcategories && business.Business_Subcategories.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {business.Business_Subcategories.map((subcategory, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-gray-200 px-2 py-0.5">
                  {subcategory}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="mt-3 flex items-start">
            <MapPin className="h-4 w-4 text-violet-500 mt-0.5 mr-1.5 flex-shrink-0" />
            <span className="text-sm text-gray-600">
              {business.address}, {business.city}, {business.state} {business.zip_code}
            </span>
          </div>
        </div>

        {/* Tab navigation - Modernized with better transitions */}
        <div className="flex border-b bg-white/95 backdrop-blur-lg sticky top-[60px] z-30 shadow-sm">
          <button 
            className={`flex-1 py-3.5 text-sm font-medium transition-all duration-300 relative ${activeTab === 'info' ? 'text-violet-600' : 'text-gray-500 hover:text-violet-400'}`}
            onClick={() => setActiveTab('info')}
          >
            Info
            {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />}
          </button>
          <button 
            className={`flex-1 py-3.5 text-sm font-medium transition-all duration-300 relative ${activeTab === 'services' ? 'text-violet-600' : 'text-gray-500 hover:text-violet-400'}`}
            onClick={() => setActiveTab('services')}
          >
            Services
            {activeTab === 'services' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />}
          </button>
          <button 
            className={`flex-1 py-3.5 text-sm font-medium transition-all duration-300 relative ${activeTab === 'offers' ? 'text-violet-600' : 'text-gray-500 hover:text-violet-400'}`}
            onClick={() => setActiveTab('offers')}
          >
            Offers
            {activeTab === 'offers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />}
          </button>
          <button 
            className={`flex-1 py-3.5 text-sm font-medium transition-all duration-300 relative ${activeTab === 'reviews' ? 'text-violet-600' : 'text-gray-500 hover:text-violet-400'}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews
            {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />}
          </button>
        </div>

        {/* Tab content - Enhanced with consistent card styling and better spacing */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-violet-50/30 pb-16">
          {activeTab === 'info' && (
            <div className="p-4 space-y-5">
              {/* Description - Enhanced card */}
              <Card className="p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">About</h2>
                <p className={`text-sm text-gray-600 leading-relaxed ${!expanded && 'line-clamp-3'}`}>
                  {business.description}
                </p>
                {business.description && business.description.length > 150 && (
                  <button 
                    className="text-violet-600 text-sm mt-3 font-medium flex items-center"
                    onClick={toggleExpand}
                  >
                    {expanded ? 'Show less' : 'Read more'}
                    {expanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                  </button>
                )}
              </Card>

              {/* Business Highlights - Enhanced card */}
              <Card className="p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">Business Highlights</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100/30 p-4 rounded-xl border border-amber-100/50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                    <span className="text-amber-600 font-bold text-lg mb-1">
                      {business.years_in_business 
                        ? (typeof business.years_in_business === 'string' && business.years_in_business.includes('(')
                            ? business.years_in_business.split('(')[1].replace(')', '')
                            : business.years_in_business + (typeof business.years_in_business === 'number' ? ' years' : ''))
                        : "5+ years"}
                    </span>
                    <span className="text-gray-600 text-xs">Years in Business</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100/30 p-4 rounded-xl border border-blue-100/50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                    <span className="text-blue-600 font-bold text-lg mb-1">{business.totalReviews || 0}</span>
                    <span className="text-gray-600 text-xs">Customer Reviews</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100/30 p-4 rounded-xl border border-emerald-100/50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                    <span className="text-emerald-600 font-bold text-lg mb-1">{business.services?.length || 0}</span>
                    <span className="text-gray-600 text-xs">Services Offered</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-violet-100/30 p-4 rounded-xl border border-violet-100/50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center text-violet-600 font-bold text-lg mb-1">
                      {business.rating ? business.rating.toFixed(1) : "-"}
                      {business.rating && <Star className="h-4 w-4 ml-1 fill-amber-400 text-amber-400" />}
                    </div>
                    <span className="text-gray-600 text-xs">Average Rating</span>
                  </div>
                </div>
              </Card>

              {/* Contact information - Enhanced card */}
              <Card className="p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">Contact</h2>
                <div className="space-y-3">
                  <div className="flex items-center bg-violet-50/80 p-3 rounded-lg hover:bg-violet-50 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm">
                    <div className="p-2 bg-violet-100 rounded-full mr-3">
                      <Phone className="h-4 w-4 text-violet-600" />
                    </div>
                    <a href={`tel:${business.phone}`} className="text-sm text-violet-700 font-medium hover:text-violet-800 transition-colors">
                      {business.phone}
                    </a>
                  </div>
                  <div className="flex items-center bg-violet-50/80 p-3 rounded-lg hover:bg-violet-50 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm">
                    <div className="p-2 bg-violet-100 rounded-full mr-3">
                      <Mail className="h-4 w-4 text-violet-600" />
                    </div>
                    <a href={`mailto:${business.email}`} className="text-sm text-violet-700 font-medium hover:text-violet-800 transition-colors">
                      {business.email}
                    </a>
                  </div>
                  {business.Website && (
                    <div className="flex items-center bg-violet-50/80 p-3 rounded-lg hover:bg-violet-50 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm">
                      <div className="p-2 bg-violet-100 rounded-full mr-3">
                        <Globe className="h-4 w-4 text-violet-600" />
                      </div>
                      <a 
                        href={business.Website.startsWith('http') ? business.Website : `https://${business.Website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-violet-700 font-medium hover:text-violet-800 transition-colors"
                      >
                        {business.Website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </Card>

              {/* Business hours - Enhanced card */}
              <Card className="p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">Business Hours</h2>
                <BusinessHours business={business} feedAIBusinessHours={feedAIBusinessHours} />
              </Card>

              {/* Business features - Enhanced card */}
              {business.business_features && business.business_features.length > 0 && (
                <Card className="p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                  <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">Features</h2>
                  <div className="flex flex-wrap gap-2">
                    {business.business_features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs py-1.5 px-3 bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 border-violet-200 rounded-full hover:bg-violet-100 transition-all duration-300 shadow-sm">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
              
              {/* FAQs - Enhanced card */}
              {business.faqs && business.faqs.length > 0 && (
                <Card className="p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                  <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">Frequently Asked Questions</h2>
                  <div className="space-y-3">
                    {business.faqs.map((faq, idx) => (
                      <div key={idx} className="border-b border-violet-100/30 pb-3 last:border-b-0 hover:bg-violet-50/50 p-3 rounded-lg transition-all duration-300">
                        <h3 className="font-medium text-sm text-violet-800 mb-2">{faq.question}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'services' && (
            <div className="p-4 space-y-5">
              <Card className="p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">Services Offered</h2>
                <div className="space-y-3">
                  {business.services.map((service, idx) => {
                    const gradientClass = getServiceGradient(service, idx);
                    const iconBgClass = getIconBackground(service, idx);
                    const textColorClass = getTextColor(service, idx);
                    
                    return (
                      <div key={idx} className="flex items-center p-3 rounded-lg hover:bg-violet-50/80 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm border border-violet-50/60">
                        <div className={`p-2.5 rounded-full mr-3 ${iconBgClass} shadow-sm`}>
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${textColorClass}`}>{service}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
          
          {activeTab === 'offers' && (
            <div className="p-4 space-y-5">
              <div className="flex items-center bg-gradient-to-r from-violet-100/40 to-indigo-100/40 p-4 rounded-xl mb-2">
                <div className="bg-violet-100 text-violet-600 p-2.5 rounded-full shadow-sm mr-3">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-violet-900">Special Offers & Promotions</h3>
                  <p className="text-sm text-gray-600">Exclusive deals from this business</p>
                </div>
              </div>

              {isLoadingPromotions ? (
                <div className="flex justify-center items-center py-12 bg-white/80 rounded-xl shadow-sm">
                  <div className="h-8 w-8 animate-spin text-amber-500 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                  </div>
                  <span className="text-amber-600 font-medium">Loading latest offers...</span>
                </div>
              ) : promotions && promotions.length > 0 ? (
                <div className="space-y-4">
                  {promotions.filter(promo => promo.isActive !== false).map((promotion, index) => (
                    <Card key={index} className={`overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-none`}>
                      <div className={`bg-gradient-to-br ${getPromotionGradient(promotion, index)} relative`}>
                        {/* Premium offer badge */}
                        {((promotion.discountType === 'percentage' && promotion.discountValue >= 30) || 
                          (promotion.discountType === 'fixed' && promotion.discountValue >= 50)) && (
                          <Badge 
                            className={`absolute top-3 right-3 ${
                              promotion.discountType === 'percentage' && promotion.discountValue >= 50 
                                ? 'bg-rose-100 text-rose-700 border-rose-200' 
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}
                          >
                            {promotion.discountType === 'percentage' && promotion.discountValue >= 50 
                              ? 'Premium Offer' 
                              : 'Special Deal'
                            }
                          </Badge>
                        )}
                        
                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2.5 rounded-full ${getPromotionIconBg(promotion, index)} shadow-sm`}>
                              <Tag className="h-5 w-5" />
                            </div>
                            <h3 className={`text-lg font-medium ${getPromotionTextColor(promotion, index)}`}>
                              {promotion.name}
                            </h3>
                          </div>
                          
                          <p className="text-gray-600 mb-4 text-sm">{promotion.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {/* Discount value with visual emphasis */}
                            <div className={`px-3 py-2 rounded-lg font-bold text-base ${
                              promotion.discountType === 'percentage' && promotion.discountValue >= 50 ? 'bg-rose-100 text-rose-700' :
                              promotion.discountType === 'percentage' && promotion.discountValue >= 30 ? 'bg-amber-100 text-amber-700' :
                              promotion.discountType === 'fixed' && promotion.discountValue >= 100 ? 'bg-purple-100 text-purple-700' :
                              promotion.discountType === 'fixed' && promotion.discountValue >= 50 ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {promotion.discountType === 'percentage' 
                                ? `${promotion.discountValue}% OFF` 
                                : `$${promotion.discountValue} OFF`}
                            </div>
                            
                            {/* First-time customer badge */}
                            {promotion.isFirstTimeOnly && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                First-time customers only
                              </Badge>
                            )}
                          </div>
                          
                          {/* Validity period with emphasis on urgency */}
                          {promotion.validUntil && (
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <p className={`text-xs font-medium ${
                                new Date(promotion.validUntil).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000
                                  ? 'text-rose-600'
                                  : 'text-gray-500'
                              }`}>
                                Valid until: {formatDate(promotion.validUntil)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl shadow-inner">
                  <PartyPopper className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-violet-600 font-medium mb-2">No active promotions</p>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">This business doesn't have any special offers at the moment. Check back later!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="p-4 space-y-5">
              {/* Review form section */}
              {showReviewForm && (
                <Card className="mb-5 p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">Write a Review</h2>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowReviewForm(false)}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ReviewForm
                    businessId={business.id || id}
                    onSubmit={handleReviewSuccess}
                  />
                </Card>
              )}
            
              <Card className="p-5 border-none rounded-xl shadow-md bg-white/95 backdrop-blur-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-indigo-700 text-transparent bg-clip-text">Reviews</h2>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 border-violet-200 hover:bg-violet-100 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm"
                    onClick={() => setShowReviewForm(true)}
                  >
                    Write a Review
                  </Button>
                </div>
                
                {loadingReviews ? (
                  // Loading state for reviews
                  <div className="space-y-4 py-2">
                    {[1, 2, 3].map((_, idx) => (
                      <div key={idx} className="animate-pulse flex items-start space-x-3">
                        <div className="rounded-full bg-violet-200 h-12 w-12"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-violet-100 rounded w-1/4"></div>
                          <div className="h-3 bg-violet-100 rounded w-1/2"></div>
                          <div className="h-3 bg-violet-100 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reviews.length > 0 ? (
                  // Manual rendering of reviews with enhanced styling
                  <div className="space-y-4">
                    {reviews.slice(0, 3).map((review, idx) => (
                      <div key={idx} className="border-b border-violet-100/30 pb-4 last:border-b-0 hover:bg-violet-50/50 p-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5">
                        <div className="flex items-start">
                          <Avatar className="h-12 w-12 mr-3 ring-2 ring-violet-100 shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                              {review.customerName ? review.customerName[0].toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center">
                              <p className="font-medium text-sm text-violet-800">{review.customerName || 'Anonymous'}</p>
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex text-amber-400 mt-1.5">
                              {[...Array(5)].map((_, starIdx) => (
                                <Star 
                                  key={starIdx}
                                  className={`h-3.5 w-3.5 ${starIdx < review.rating ? 'fill-current' : ''}`}
                                />
                              ))}
                            </div>
                            <p className="text-sm mt-2 text-gray-700 leading-relaxed">{review.comment}</p>
                            
                            {/* Review images - Enhanced gallery */}
                            {review.images && review.images.length > 0 && (
                              <div className="flex mt-3 space-x-2.5 overflow-x-auto pb-2">
                                {review.images.map((img, imgIdx) => (
                                  <div key={imgIdx} className="relative h-18 w-18 flex-shrink-0 rounded-lg overflow-hidden shadow-md transform transition-transform duration-300 hover:scale-105">
                                    <Image
                                      src={img}
                                      alt="Review image"
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Business reply - Enhanced styling */}
                            {review.businessReply && (
                              <div className="mt-3 bg-gradient-to-r from-violet-50 to-indigo-50 p-3 rounded-lg border border-violet-100/50 shadow-sm">
                                <p className="text-xs font-medium text-violet-700 mb-1">Business reply:</p>
                                <p className="text-xs text-gray-600 leading-relaxed">{review.businessReply.text}</p>
                                <p className="text-xs text-gray-400 mt-1.5 flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(review.businessReply.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // No reviews state - Enhanced styling
                  <div className="text-center py-8 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg p-5 shadow-inner">
                    <p className="text-violet-600 mb-3 font-medium">No reviews yet</p>
                    <p className="text-sm text-gray-500 mb-4">Be the first to leave a review!</p>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReviewForm(true)}
                      className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200 transition-all duration-300"
                    >
                      Write a Review
                    </Button>
                  </div>
                )}
                
                {reviews.length > 3 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 text-sm rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 border-violet-200 hover:bg-violet-100 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm"
                    onClick={() => {
                      // Implement view all reviews logic here
                      toast({
                        title: "Coming soon!",
                        description: "View all reviews functionality will be available soon.",
                        duration: 3000,
                      });
                    }}
                  >
                    View All Reviews ({reviews.length})
                  </Button>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Sticky footer - Enhanced with better styling and higher z-index */}
        <div className="sticky bottom-0 px-5 py-4 bg-white/95 backdrop-blur-lg border-t border-violet-100/40 shadow-lg z-40">
          {!isChatOpen ? (
            <Button
              onClick={() => setIsChatOpen(true)}
              variant="secondary"
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 py-3 font-medium text-base"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Flint to Book
            </Button>
          ) : (
            <div className="h-1"></div> // Spacer when chat is open
          )}
        </div>

        {/* Chat Window - Fixed positioning above the footer */}
        {isChatOpen && business?.id && (
          <div className="fixed inset-0 z-50 bg-gray-50/95 flex flex-col pt-16">
            <Button
              onClick={() => setIsChatOpen(false)}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 rounded-full bg-white shadow-md"
            >
              <X className="h-5 w-5" />
            </Button>
            <ChatWindow
              businessId={business.id || id}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}

        {/* Mobile image gallery modal */}
        {showImageModal && business.images && (
          <MobileImagePreviewModal
            images={business.images}
            currentIndex={selectedImageIndex}
            onClose={handleCloseImageModal}
          />
        )}
      </div>
    );
  };

  // Render proper UI based on state, making sure all hooks are called first
  if (loading) {
    return renderLoading();
  }

  if (error || !business) {
    return renderError();
  }

  return renderContent();
} 