'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { SearchIcon, MapPin, Star, Clock, DollarSign, Heart, Calendar, Tag, Phone, Mail, Globe, MessageCircle } from 'lucide-react'
import { SearchFilters } from './SearchFilters'
import { Map } from './Map'
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { ChatButton } from '@/components/chat'
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination"
import ServiceDetailsModal from './ServiceDetailsModal'
import CompareServicesModal from './CompareServicesModal'
import AvailabilityCalendar from './AvailabilityCalendar'
import RelatedServices from './RelatedServices'
import Link from 'next/link'
import { Business } from '@/app/types/business'
import { Skeleton } from "@/components/ui/skeleton"

interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface SearchResultsProps {
  services: Business[];
  isLoading: boolean;
  mapCenter: { lat: number; lng: number } | null;
  onMapViewportChange?: (center: { lat: number; lng: number }, bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }) => void;
}

function SearchResultSkeleton() {
  return (
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Skeleton className="h-24 w-24 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex space-x-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SearchResults({ services, isLoading, mapCenter: initialMapCenter, onMapViewportChange }: SearchResultsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sortBy, setSortBy] = useState<string>('distance')
  const [favorites, setFavorites] = useState<string[]>([])
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null)
  const { toast } = useToast()
  const listRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedService, setSelectedService] = useState<any | null>(null)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [ratingFilter, setRatingFilter] = useState("")
  const [availabilityFilter, setAvailabilityFilter] = useState("anytime")
  const [offersFilter, setOffersFilter] = useState(false)
  const [businessImages, setBusinessImages] = useState<Record<string, string>>({})
  const [currentMapCenter, setCurrentMapCenter] = useState<{ lat: number; lng: number } | null>(initialMapCenter)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentMapCenter(initialMapCenter);
  }, [initialMapCenter]);

  useEffect(() => {
    // Check if Google Maps is loaded
    const checkGoogleMaps = () => {
      if (window.google?.maps) {
        setIsMapLoaded(true);
        setMapError(null);
        return true;
      }
      return false;
    };

    // If Google Maps is not loaded, wait for it
    if (!checkGoogleMaps()) {
      const interval = setInterval(() => {
        if (checkGoogleMaps()) {
          clearInterval(interval);
        }
      }, 1000);

      // Clear interval after 10 seconds if Google Maps hasn't loaded
      setTimeout(() => {
        clearInterval(interval);
        if (!window.google?.maps) {
          setMapError('Google Maps failed to load. Please refresh the page.');
        }
      }, 10000);

      return () => {
        clearInterval(interval);
      };
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    router.push(`/search?${params.toString()}`)
  }

  const sortedServices = useMemo(() => {
    let sorted = [...services];
    
    if (sortBy === 'distance') {
      sorted.sort((a, b) => {
        const distA = typeof a.distance === 'number' ? a.distance : Infinity;
        const distB = typeof b.distance === 'number' ? b.distance : Infinity;
        return distA - distB;
      });
    }
    
    return sorted;
  }, [services, sortBy]);

  // Add the missing properties to the extended Business type
  type ExtendedBusiness = Business & {
    availableNow?: boolean;
    offers?: any[];
    name?: string;
    pricing?: {
      basePrice?: number;
    };
  };

  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services
      .filter((s) => 
        (!ratingFilter || (s.rating && s.rating >= parseInt(ratingFilter))) &&
        (availabilityFilter === "anytime" || true) &&
        true
      )
      .sort((a, b) => {
        if (sortBy === 'distance') {
          const distA = a.distance || 0;
          const distB = b.distance || 0;
          return distA - distB;
        }
        if (sortBy === 'name') return a.business_name.localeCompare(b.business_name);
        return 0;
      });
  }, [services, ratingFilter, availabilityFilter, sortBy]);

  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }

  const getNumericId = (id: string | undefined): number => {
    if (!id) return Math.floor(Math.random() * 1000000);
    // Try to parse the ID as a number, fall back to hashing if not possible
    const numId = parseInt(id);
    return isNaN(numId) ? Math.abs(hashString(id)) : numId;
  };

  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(id) 
        ? prev.filter(fid => fid !== id)
        : [...prev, id];
      
      // Show toast notification
      toast({
        title: prev.includes(id) ? "Removed from favorites" : "Added to favorites",
        description: "You can view your favorites in your profile.",
      });
      
      return newFavorites;
    });
  };

  const handleMarkerClick = (id: string) => {
    if (!id) return;
    const service = services.find(s => getNumericId(s.id || s._id) === parseInt(id));
    if (service) {
      handleSelectedBusiness(service);
    }
  };

  const openServiceModal = (service: any) => {
    setSelectedService(service)
    setIsServiceModalOpen(true)
  }

  const toggleCompareService = (id: string) => {
    setSelectedForComparison(prev => 
      prev.includes(id) ? prev.filter(serviceId => serviceId !== id) : [...prev, id]
    )
  }

  const formatDistance = (distance: number) => {
    if (distance < 0.1) return 'Less than 0.1 miles';
    return `${distance.toFixed(1)} miles`;
  };

  const formatPhoneNumber = (phone: number) => {
    const phoneStr = phone.toString();
    if (phoneStr.length === 10) {
      return `(${phoneStr.slice(0, 3)}) ${phoneStr.slice(3, 6)}-${phoneStr.slice(6)}`;
    }
    return phoneStr;
  };

  const handleImageChange = (businessId: string, imageUrl: string) => {
    if (!businessId || !imageUrl) return;
    setBusinessImages(prev => ({
      ...prev,
      [businessId]: imageUrl
    }));
  };

  const handleSelectedBusiness = (business: Business | null) => {
    setSelectedService(business);
    if (business?.latitude && business?.longitude) {
      const newCenter = {
        lat: business.latitude,
        lng: business.longitude
      };
      setCurrentMapCenter(newCenter);
      if (onMapViewportChange) {
        const defaultBounds = {
          sw: { lat: business.latitude - 0.1, lng: business.longitude - 0.1 },
          ne: { lat: business.latitude + 0.1, lng: business.longitude + 0.1 }
        };
        onMapViewportChange(newCenter, defaultBounds);
      }
    }
  };

  const handleShare = (businessId: string) => {
    if (!businessId) return;
    // Rest of share logic
  };

  const handleCompare = (businessId: string) => {
    if (!businessId) return;
    // Rest of compare logic
  };

  const handleHoverBusiness = (id: string | undefined) => {
    if (!id) {
      setHoveredBusinessId(null);
      return;
    }
    setHoveredBusinessId(id);
  };

  const getBusinessId = (business: Business): string => {
    // Always use unique_id for SEO friendly URLs
    if (business.unique_id) {
      return business.unique_id;
    }
    
    // If no unique_id is available, log a warning and fall back to MongoDB ID
    console.warn('Business missing unique_id:', business.business_name || business.id || business._id);
    const id = business.id || business._id;
    return typeof id === 'string' ? id : String(id);
  };

  // Function to get the MongoDB ObjectId for chat functionality
  const getBusinessMongoId = (business: Business): string => {
    // Debug the business object structure with more informative logging
    console.log('Business object for chat:', {
      name: business.business_name,
      _id: business._id,
      id: business.id,
      unique_id: business.unique_id,
      type_id: typeof business.id,
      type__id: typeof business._id,
      is_search_results: true,
      url: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
    });
    
    // Validate MongoDB ObjectId format using regex
    const isValidObjectId = (id: string): boolean => /^[0-9a-fA-F]{24}$/.test(id);
    
    // First try with _id
    if (business._id) {
      const idStr = typeof business._id === 'string' ? business._id : String(business._id);
      if (isValidObjectId(idStr)) {
        console.log(`Using valid MongoDB ObjectId _id: ${idStr} for business: ${business.business_name}`);
        return idStr;
      } else {
        console.warn(`Invalid MongoDB ObjectId format for _id: ${idStr} for business: ${business.business_name}`);
      }
    }
    
    // Fall back to id if _id is not available or valid
    if (business.id) {
      const idStr = typeof business.id === 'string' ? business.id : String(business.id);
      if (isValidObjectId(idStr)) {
        console.log(`Using valid MongoDB ObjectId id: ${idStr} for business: ${business.business_name}`);
        return idStr;
      } else {
        console.warn(`Invalid MongoDB ObjectId format for id: ${idStr} for business: ${business.business_name}`);
      }
    }
    
    // For unique_id, we'll use the lookup API through the ChatButton component
    // The ChatButton is responsible for converting unique_id to MongoDB ObjectId
    if (business.unique_id) {
      console.log(`Using business unique_id for lookup: ${business.unique_id} for business: ${business.business_name}`);
      return business.unique_id;
    }
    
    // If all else fails, use whatever identifier we have
    console.error(`No suitable ID found for business: ${business.business_name}`);
    return "";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <SearchResultSkeleton key={i} />
          ))}
        </div>
        <div className="hidden lg:block h-[calc(100vh-200px)] sticky top-24">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!isLoading && services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-500">
          Try adjusting your search or location to find more businesses
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold">Search Results</h2>
          <div className="flex items-center space-x-4">
            <SearchFilters 
              ratingFilter={ratingFilter}
              setRatingFilter={(value) => {
                setRatingFilter(value)
                setCurrentPage(1)
              }}
              availabilityFilter={availabilityFilter}
              setAvailabilityFilter={(value) => {
                setAvailabilityFilter(value)
                setCurrentPage(1)
              }}
              offersFilter={offersFilter}
              setOffersFilter={(value) => {
                setOffersFilter(value)
                setCurrentPage(1)
              }}
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="name">Business Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4" ref={listRef}>
          {paginatedServices.map((business) => (
            <Card
              key={business.id}
              id={`service-${business.id}`}
              className={`relative bg-white rounded-xl shadow-sm transition-all duration-300 ${
                hoveredBusinessId === (business.id || business._id) ? 'ring-2 ring-violet-500' : ''
              }`}
              onMouseEnter={() => business.id && handleHoverBusiness(business.id)}
              onMouseLeave={() => handleHoverBusiness(undefined)}
            >
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <Image
                      src={typeof business.images?.[0] === 'string' ? business.images[0] : business.images?.[0]?.url || '/placeholder-business.jpg'}
                      alt={business.business_name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {business.business_name || 'Unnamed Business'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <MapPin className="h-4 w-4" />
                          <span>{business.city}, {business.state}</span>
                          {business.distance && (
                            <span className="text-gray-400">
                              • {formatDistance(business.distance)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const id = getBusinessId(business);
                            if (id && id !== 'undefined') toggleFavorite(id);
                          }}
                          className="text-gray-500 hover:text-violet-600"
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              favorites.includes(getBusinessId(business))
                                ? 'fill-violet-600 text-violet-600'
                                : ''
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {business.description || 'No description available'}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {business.business_features?.slice(0, 3).map((feature, index) => (
                        <Badge key={`${getBusinessId(business)}-${feature}-${index}`} variant="secondary">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <Link 
                        href={`/${getBusinessId(business)}`}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100 h-10 px-4 py-2"
                      >
                        View Details
                      </Link>
                      {(() => {
                        const businessId = getBusinessMongoId(business);
                        // Check if we have any kind of ID (either MongoDB ObjectId or unique_id)
                        // Log what ID is being used for debugging
                        console.log(`Chat button ID for ${business.business_name}:`, {
                          id: businessId,
                          isValidObjectId: /^[0-9a-fA-F]{24}$/.test(businessId),
                          isUniqueId: businessId === business.unique_id,
                          business_name: business.business_name
                        });
                        
                        return businessId && (
                          <ChatButton
                            businessId={businessId}
                            variant="default"
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
                  </PaginationItem>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>

        {/* Map */}
        <div className="hidden lg:block h-[calc(100vh-200px)] sticky top-24">
          {mapError ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center p-4">
                <p className="text-red-500 mb-2">{mapError}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="mt-2"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          ) : (
            <Map
              locations={paginatedServices
                .filter((business: Business): business is Business & { latitude: number; longitude: number } => {
                  const hasValidCoords = 
                    typeof business.latitude === 'number' && 
                    typeof business.longitude === 'number' &&
                    !isNaN(business.latitude) &&
                    !isNaN(business.longitude) &&
                    business.latitude !== 0 &&
                    business.longitude !== 0 &&
                    business.latitude >= -90 &&
                    business.latitude <= 90 &&
                    business.longitude >= -180 &&
                    business.longitude <= 180;
                  
                  if (!hasValidCoords) {
                    console.warn('Business with invalid coordinates:', {
                      id: getBusinessId(business),
                      name: business.business_name,
                      latitude: business.latitude,
                      longitude: business.longitude
                    });
                  }
                  return hasValidCoords;
                })
                .map((business): MapLocation => ({
                  id: getBusinessId(business),
                  name: business.business_name || 'Unnamed Business',
                  lat: business.latitude,
                  lng: business.longitude
                }))}
              hoveredId={hoveredBusinessId || undefined}
              center={currentMapCenter || undefined}
              onViewportChange={onMapViewportChange}
            />
          )}
        </div>
      </div>

      <ServiceDetailsModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        service={selectedService}
      />

      <CompareServicesModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        services={services.filter(s => {
          const id = getBusinessId(s);
          return id && selectedForComparison.includes(id);
        })}
      />

      {selectedForComparison.length > 1 && (
        <Button
          className="fixed bottom-4 right-4 bg-violet-600 hover:bg-violet-700 text-white"
          onClick={() => setIsCompareModalOpen(true)}
        >
          Compare {selectedForComparison.length} Services
        </Button>
      )}
    </div>
  )
}

