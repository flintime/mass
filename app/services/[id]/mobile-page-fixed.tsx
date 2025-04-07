'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  Heart,
  Share2,
  Menu,
  X,
  MessageSquare,
  ArrowLeft,
  Image as ImageIcon,
  Info
} from 'lucide-react';
import { ServiceShare } from '@/components/ServiceShare';
import { ReviewList } from '@/app/components/reviews';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { useToast } from "@/components/ui/use-toast";
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
  
  const handlePrevious = () => {
    setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-black/50">
        <span className="text-white text-sm">{index + 1} / {images.length}</span>
        <button
          onClick={onClose}
          className="text-white p-2"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center">
        <Image
          src={images[index].url}
          alt="Business image"
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
        
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 bg-black/30 text-white p-2 rounded-full"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 bg-black/30 text-white p-2 rounded-full"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
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
  const [activeTab, setActiveTab] = useState<'info' | 'reviews' | 'services'>('info');
  const [expanded, setExpanded] = useState(false);
  
  // Get the id from the params
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

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

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="p-4 flex items-center border-b">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold ml-2">Loading...</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full px-4">
            <div className="h-64 w-full bg-gray-200 rounded-md"></div>
            <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !business) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="p-4 flex items-center border-b">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold ml-2">Error</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-6 w-full max-w-md text-center">
            <div className="mb-4 text-red-500">
              <Info className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-4">{error || 'Failed to load business details'}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="p-4 flex items-center justify-between border-b bg-white">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold ml-2 truncate max-w-[200px]">{business.business_name}</h1>
        </div>
        <div className="flex items-center space-x-1">
          <ServiceShare serviceId={id} />
        </div>
      </div>

      {/* Image gallery */}
      <div className="relative h-64 bg-gray-200">
        {business.images && business.images.length > 0 ? (
          <>
            <Image
              src={business.images[selectedImageIndex].url}
              alt={business.business_name}
              fill
              className="object-cover"
              priority
            />
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/20"
              onClick={() => handleOpenImageModal(selectedImageIndex)}
            >
              <Button variant="outline" className="bg-white/80 hover:bg-white">
                <ImageIcon className="h-4 w-4 mr-2" />
                View {business.images.length} Photos
              </Button>
            </div>
            {business.images.length > 1 && (
              <div className="absolute bottom-4 right-4 flex space-x-1">
                {business.images.slice(0, 5).map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 w-2 rounded-full ${selectedImageIndex === idx ? 'bg-white' : 'bg-white/50'}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  />
                ))}
                {business.images.length > 5 && (
                  <div className="h-2 w-2 rounded-full bg-white/50">+</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No images available</p>
          </div>
        )}
      </div>

      {/* Business info and tabs */}
      <div className="p-4 bg-white border-b">
        <h1 className="text-xl font-bold">{business.business_name}</h1>
        <div className="flex items-center mt-1">
          <div className="flex items-center text-yellow-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="ml-1 text-sm">{business.rating || 'New'}</span>
          </div>
          {business.totalReviews && (
            <span className="text-sm text-gray-500 ml-1">
              ({business.totalReviews} {business.totalReviews === 1 ? 'review' : 'reviews'})
            </span>
          )}
          <span className="mx-2 text-gray-300">•</span>
          <Badge variant="outline" className="text-xs">
            {business.Business_Category}
          </Badge>
        </div>
        
        <div className="mt-2 flex items-start">
          <MapPin className="h-4 w-4 text-gray-500 mt-0.5 mr-1 flex-shrink-0" />
          <span className="text-sm text-gray-500">
            {business.address}, {business.city}, {business.state} {business.zip_code}
          </span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b bg-white">
        <button 
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'info' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'services' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('services')}
        >
          Services
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-medium ${activeTab === 'reviews' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'info' && (
          <div className="p-4 space-y-4">
            {/* Description */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className={`text-sm text-gray-600 ${!expanded && 'line-clamp-3'}`}>
                {business.description}
              </p>
              {business.description && business.description.length > 150 && (
                <button 
                  className="text-primary text-sm mt-2 font-medium"
                  onClick={toggleExpand}
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </Card>

            {/* Contact information */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-2">Contact</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-500 mr-3" />
                  <a href={`tel:${business.phone}`} className="text-sm text-primary">
                    {business.phone}
                  </a>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-500 mr-3" />
                  <a href={`mailto:${business.email}`} className="text-sm text-primary">
                    {business.email}
                  </a>
                </div>
                {business.Website && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 text-gray-500 mr-3" />
                    <a 
                      href={business.Website.startsWith('http') ? business.Website : `https://${business.Website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary"
                    >
                      {business.Website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Business hours */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-2">Business Hours</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Weekdays</span>
                  <span className="text-sm">{business.operatingHours || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Weekends</span>
                  <span className="text-sm">{business.weekendHours || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Sunday</span>
                  <span className="text-sm">{business.sundayHours || 'Not specified'}</span>
                </div>
              </div>
            </Card>

            {/* Business features */}
            {business.business_features && business.business_features.length > 0 && (
              <Card className="p-4">
                <h2 className="text-lg font-semibold mb-2">Features</h2>
                <div className="flex flex-wrap gap-2">
                  {business.business_features.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs py-1">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="p-4 space-y-4">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">Services Offered</h2>
              <div className="space-y-3">
                {business.services.map((service, idx) => {
                  const gradientClass = getServiceGradient(service, idx);
                  const iconBgClass = getIconBackground(service, idx);
                  const textColorClass = getTextColor(service, idx);
                  
                  return (
                    <div key={idx} className="flex items-center">
                      <div className={`p-2 rounded-md mr-3 ${iconBgClass}`}>
                        <Star className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`font-medium text-sm ${textColorClass}`}>{service}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="p-4">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Reviews</h2>
                <Button size="sm" variant="outline" className="text-xs">
                  Write a Review
                </Button>
              </div>
              
              {/* Mock reviews for now */}
              <div className="space-y-4">
                {[1, 2, 3].map((_, idx) => (
                  <div key={idx} className="border-b pb-3 last:border-b-0">
                    <div className="flex items-start">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>
                          {String.fromCharCode(65 + idx)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium text-sm">Customer {idx + 1}</p>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(Date.now() - 1000 * 60 * 60 * 24 * idx).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex text-yellow-400 mt-1">
                          {[...Array(5)].map((_, starIdx) => (
                            <Star 
                              key={starIdx} 
                              className={`h-3 w-3 ${starIdx < (5 - idx) ? 'fill-current' : ''}`} 
                            />
                          ))}
                        </div>
                        <p className="text-sm mt-1">
                          {idx === 0 
                            ? "Great service, highly recommend!" 
                            : idx === 1 
                              ? "The staff was friendly and professional. Would use again."
                              : "Good value for the price. Service was completed on time."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button variant="outline" className="w-full mt-3 text-sm">
                View All Reviews
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 p-4 bg-white border-t shadow-md">
        <Button className="w-full">
          Contact Business
        </Button>
      </div>

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
} 