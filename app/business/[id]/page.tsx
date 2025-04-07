'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, Phone, Globe, Mail, Clock, Calendar, Star, Copy } from 'lucide-react';
import Image from 'next/image';
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Map from '@/components/Map';
import { geocodeAddress, formatAddress } from '@/lib/geocoding';
import Link from 'next/link';
import Header from '@/app/components/Header';
import dynamic from 'next/dynamic';
import { toast } from '@/components/ui/use-toast';

const ChatButton = dynamic(() => import('@/components/chat/ChatButton').then(mod => mod.ChatButton), {
  ssr: false
});

interface Service {
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface BusinessDetails {
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
  unique_id?: string;
}

interface Review {
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Add renderStars function
const renderStars = (rating: number) => {
  return Array.from({ length: 5 }).map((_, i) => (
    <Star
      key={i}
      className={`h-4 w-4 ${
        i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
      }`}
    />
  ));
};

export default function BusinessDetailsPage() {
  const params = useParams();
  const businessId = params?.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchBusinessDetails = async () => {
      try {
        if (!businessId) {
          setIsLoading(false);
          return;
        }

        // Replace with your actual API endpoint
        const response = await fetch(`/api/business/${businessId}`);
        if (!response.ok) throw new Error('Failed to fetch business details');
        const data = await response.json();
        setBusiness(data);

        // Fetch reviews
        const reviewsResponse = await fetch(`/api/business/${businessId}/reviews`);
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData);
        }

        // Geocode the business address
        const address = formatAddress(
          data.address,
          data.city,
          data.state,
          data.zip_code
        );
        const coords = await geocodeAddress(address);
        setCoordinates(coords);

        setServices([
          {
            name: 'Basic Cleaning',
            description: 'Standard cleaning service for homes',
            price: 100,
            duration: 120
          },
          {
            name: 'Deep Cleaning',
            description: 'Thorough cleaning including hard-to-reach areas',
            price: 200,
            duration: 240
          }
        ]);
      } catch (error) {
        console.error('Error fetching business details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessDetails();
  }, [businessId]);

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (!business || !businessId) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-500">Business not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8 pt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <Card className="mb-8">
              <div className="relative h-64 w-full">
                {business.images && business.images[0] ? (
                  <Image
                    src={business.images[0].url}
                    alt={business.business_name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                    <p className="text-gray-500">No image available</p>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {business.business_name}
                    </h1>
                    <p className="text-gray-600 mb-4">{business.description}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary">{business.Business_Category}</Badge>
                      {business.Business_Subcategories?.map((subcategory, index) => (
                        <Badge key={index} variant="outline">{subcategory}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <ChatButton businessId={businessId} variant="outline" />
                    </div>
                    {business.unique_id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600">Share this business:</p>
                        <div className="flex items-center mt-2">
                          <code className="text-xs bg-gray-100 p-2 rounded flex-1 overflow-x-auto">
                            http://flintime.com/{business.unique_id}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`http://flintime.com/${business.unique_id}`);
                              toast({
                                description: "Link copied to clipboard",
                                duration: 2000,
                              });
                            }}
                            className="ml-2"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {business.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-semibold">{business.rating.toFixed(1)}</span>
                      <span className="text-gray-500">({business.totalReviews} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="booking">Book Now</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Business Information</h2>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <span>{`${business.address}, ${business.city}, ${business.state} ${business.zip_code}`}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <span>{business.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-500" />
                        <span>{business.email}</span>
                      </div>
                      {business.Website && (
                        <div className="flex items-center gap-3">
                          <Globe className="h-5 w-5 text-gray-500" />
                          <a href={business.Website} target="_blank" rel="noopener noreferrer" 
                             className="text-blue-600 hover:underline">
                            {business.Website}
                          </a>
                        </div>
                      )}
                    </div>

                    {business.business_features && business.business_features.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">Features & Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                          {business.business_features.map((feature, index) => (
                            <Badge key={index} variant="secondary">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Customer Reviews</h2>
                    {reviews.length === 0 ? (
                      <p className="text-gray-500">No reviews yet</p>
                    ) : (
                      <div className="space-y-6">
                        {reviews.map((review, index) => (
                          <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{review.customerName}</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{review.rating}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {renderStars(review.rating)}
                            </div>
                            {review.comment ? (
                              <p className="text-gray-600">{review.comment}</p>
                            ) : (
                              <p className="text-gray-500 italic">No written review provided</p>
                            )}
                            <p className="text-sm text-gray-400 mt-2">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="booking">
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Book an Appointment</h2>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <span>Select a Date</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <span>Choose a Time</span>
                      </div>
                      <Button className="w-full">
                        Check Availability
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
} 