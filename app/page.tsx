'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Navigation2, MapPin, Heart, X, Loader2, ArrowUp, CheckCircle, Bot, Zap, Target, Clock, Rocket, Sparkles } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import Image from 'next/image';
import { LocationSearch } from '@/components/LocationSearch';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatButton } from '@/components/chat';
import Link from 'next/link';
import Map from '@/components/Map';
import { Business } from '@/app/types/business';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AIWaveform } from '@/components/ui/ai-waveform';
import { AIChatMockup } from '@/components/ui/ai-chat-mockup';
import { GlowingButton } from '@/components/ui/glowing-button';
import { motion } from 'framer-motion';
import { CursorParticles } from '@/components/ui/cursor-particles';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { AIBackground } from '@/components/ui/ai-background';
import { SmartSort } from '@/components/ui/smart-sort';
import { SmartRecommendations } from '@/components/ui/smart-recommendations';
import { SearchResults } from '@/components/ui/search-results';
import { cn } from '@/lib/utils';
import { InteractiveSteps } from '@/components/ui/interactive-steps';
import { ViewMode, SortOption } from '@/app/types';
import GoogleMapsScript from '@/components/GoogleMapsScript';
import ImageCarousel from '@/app/components/ImageCarousel';

const HERO_HEADLINES = [
  {
    title: "Book Any Service in Seconds",
    subtitle: "AI-Powered, Hassle-Free Booking for All Your Needs"
  },
  {
    title: "Smart Matching, Instant Booking",
    subtitle: "Let AI Find Your Perfect Service Provider"
  },
  {
    title: "Tell Us What You Need",
    subtitle: "Our AI Matches You with Trusted Local Professionals"
  },
  {
    title: "Predictive Booking Made Simple",
    subtitle: "AI-Powered Service Matching in Your Area"
  }
];

const HERO_BACKGROUNDS = [
  {
    type: 'image',
    poster: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80',
    alt: 'Professional house cleaning service'
  },
  {
    type: 'image',
    poster: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80',
    alt: 'Professional plumbing repair'
  },
  {
    type: 'image',
    poster: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80',
    alt: 'Electrician working on wiring'
  },
  {
    type: 'image',
    poster: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?auto=format&fit=crop&q=80',
    alt: 'Professional moving service with truck'
  },
  {
    type: 'image',
    poster: 'https://images.unsplash.com/photo-1503434396599-58ba8a18d932?auto=format&fit=crop&q=80',
    alt: 'Auto repair service'
  }
];

const SERVICE_CATEGORIES = [
  { id: 'home', name: 'Home Services', icon: '🏠', examples: ['Plumbing', 'HVAC', 'Cleaning'], description: 'Maintenance & repairs' },
  { id: 'auto', name: 'Auto Repair', icon: '🚗', examples: ['Oil Change', 'Brake Service', 'Tire Rotation'], description: 'Car care & repair' },
  { id: 'beauty', name: 'Beauty & Wellness', icon: '💇‍♂️', examples: ['Hair Styling', 'Massage', 'Nail Care'], description: 'Beauty & wellness' },
  { id: 'education', name: 'Tutoring', icon: '📚', examples: ['Math', 'Science', 'Languages'], description: 'Educational services' },
  { id: 'health', name: 'Health & Fitness', icon: '💪', examples: ['Personal Training', 'Yoga', 'Nutrition'], description: 'Health & fitness' },
  { id: 'tech', name: 'Tech Support', icon: '💻', examples: ['Computer Repair', 'Phone Fix', 'IT Help'], description: 'Tech solutions' },
  { id: 'events', name: 'Events', icon: '🎉', examples: ['Photography', 'Catering', 'Planning'], description: 'Event services' },
  { id: 'pets', name: 'Pet Care', icon: '🐾', examples: ['Dog Walking', 'Grooming', 'Vet Services'], description: 'Pet services' }
];

const EXAMPLE_SEARCHES = [
  "I need a plumber for a leaking pipe",
  "Looking for a personal trainer near me",
  "Need urgent AC repair service",
  "Book a house cleaning service",
  "Find a math tutor for my kid",
  "Car won't start, need mechanic"
];

const PLACEHOLDER_TEXTS = [
  "Tell me what you need – AI will find the perfect expert",
  "Need a plumber? An electrician? Just type, and AI finds the best",
  "Flintime AI is here – Describe your need & get instant results",
  "Let AI match you with the perfect service provider"
];

// Define the Location type to match the Map component's interface
interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// Add this new function at the top level, before the HomePage component
function createLocationChangeEvent(address: string, coords: { lat: number; lng: number }) {
  return new CustomEvent('locationChange', {
    detail: { address, coords }
  });
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [currentHeadlineIndex, setCurrentHeadlineIndex] = useState(0);
  const [services, setServices] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 6;
  const [sortOption, setSortOption] = useState<SortOption>('distance');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [hasSearched, setHasSearched] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [isTypingEffect, setIsTypingEffect] = useState(false);
  const searchInputRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [particleIntensity, setParticleIntensity] = useState(0);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [showMapOnMobile, setShowMapOnMobile] = useState(false);

  // Update the dispatchLocationChange function
  const dispatchLocationChange = (address: string, coords: { lat: number; lng: number }) => {
    console.log('Dispatching location change:', { address, coords });
    
    // Update localStorage first
    localStorage.setItem('userLocation', address);
    localStorage.setItem('userLocationCoords', JSON.stringify(coords));
    
    // Create and dispatch the event
    const event = createLocationChangeEvent(address, coords);
    window.dispatchEvent(event);
    
    // Dispatch again after a short delay
    setTimeout(() => {
      window.dispatchEvent(createLocationChangeEvent(address, coords));
    }, 100);
    
    // And again using requestAnimationFrame
    requestAnimationFrame(() => {
      window.dispatchEvent(createLocationChangeEvent(address, coords));
    });
  };

  // Listen for location changes from the header
  useEffect(() => {
    const handleLocationChange = (event: CustomEvent<{ address: string; coords: { lat: number; lng: number } }>) => {
      const { address, coords } = event.detail;
      console.log('Location change event received:', { address, coords });
      
      // Update local storage
      localStorage.setItem('userLocation', address);
      localStorage.setItem('userLocationCoords', JSON.stringify(coords));
      
      // Update map and fetch businesses
      setMapCenter(coords);
      fetchNearbyBusinesses(coords.lat, coords.lng);
    };

    // Add event listener
    window.addEventListener('locationChange', handleLocationChange as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('locationChange', handleLocationChange as EventListener);
    };
  }, []); // Empty dependency array means this only runs once on mount

  // Update the main location initialization useEffect
  useEffect(() => {
    let mounted = true;

    const initializeLocation = async () => {
      // Try to get saved location first
      const savedCoords = localStorage.getItem('userLocationCoords');
      const savedLocation = localStorage.getItem('userLocation');

      if (savedCoords && savedLocation) {
        const coords = JSON.parse(savedCoords);
        if (mounted) {
          setMapCenter(coords);
          // Dispatch multiple times to ensure it's caught
          dispatchLocationChange(savedLocation, coords);
          fetchNearbyBusinesses(coords.lat, coords.lng);
        }
        return; // Exit early if we have saved location
      }

      // If no saved location, try geolocation
      if (navigator.geolocation) {
        toast({
          title: "Detecting your location",
          description: "Please allow location access for better results",
        });

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (!mounted) return;

            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
              );
              const data = await response.json();
              
              if (data.results && data.results[0] && mounted) {
                const address = data.results[0].formatted_address;
                dispatchLocationChange(address, coords);
                setMapCenter(coords);
                fetchNearbyBusinesses(coords.lat, coords.lng);

                toast({
                  title: "Location detected",
                  description: `Your location: ${address}`,
                });
              }
            } catch (error) {
              if (!mounted) return;
              handleLocationError();
            }
          },
          (error) => {
            if (!mounted) return;
            handleLocationError();
          }
        );
      } else {
        if (!mounted) return;
        handleLocationError();
      }
    };

    // Helper function to handle location errors
    const handleLocationError = () => {
      const defaultCoords = { lat: 40.7128, lng: -74.0060 };
      const defaultAddress = 'New York, NY, USA';
      
      dispatchLocationChange(defaultAddress, defaultCoords);
      setMapCenter(defaultCoords);
      fetchNearbyBusinesses(defaultCoords.lat, defaultCoords.lng);
      
      toast({
        title: "Location access unavailable",
        description: "Using default location: New York City",
        variant: "destructive",
      });
    };

    // Start initialization
    initializeLocation();

    // Cleanup
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeadlineIndex((prev) => (prev + 1) % HERO_HEADLINES.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Typing effect for search examples
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % EXAMPLE_SEARCHES.length);
      setIsTypingEffect(true);
      setTimeout(() => setIsTypingEffect(false), 2000);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Add placeholder text rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchNearbyBusinesses = async (lat: number, lng: number, searchQuery?: string) => {
    try {
      console.log('Fetching nearby businesses:', { lat, lng, searchQuery });
      setIsLoading(true);
      setHasSearched(true);
      
      const requestBody = {
        latitude: lat,
        longitude: lng,
        query: searchQuery || '',
        radius: 50
      };
      console.log('Request body:', requestBody);

      const response = await fetch(`/api/search/businesses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch businesses');
      }

      const data = await response.json();
      console.log('Received businesses with location data:', data.map((b: any) => ({
        id: b.id,
        _id: b._id,
        name: b.business_name,
        unique_id: b.unique_id || 'missing',
        latitude: b.latitude,
        longitude: b.longitude
      })));
      
      // Check if any businesses are missing unique_id
      const missingUniqueId = data.filter((b: any) => !b.unique_id);
      if (missingUniqueId.length > 0) {
        console.warn(`${missingUniqueId.length} businesses missing unique_id:`, 
          missingUniqueId.map((b: any) => b.business_name));
      }
      
      // Save search results to localStorage
      localStorage.setItem('lastSearch', JSON.stringify({
        query: searchQuery,
        services: data,
        timestamp: Date.now()
      }));
      
      setServices(data);
      setMapCenter({ lat, lng });
      console.log('Updated map center:', { lat, lng });
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch nearby businesses. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast({
        title: "Please enter a search term",
        description: "Tell us what service you're looking for",
        variant: "destructive",
      });
      return;
    }

    // Set loading state and scroll to results immediately
    setIsLoading(true);
    setHasSearched(true);
    setServices([]); // Clear previous results

    // Scroll to results section immediately
    const resultsSection = document.getElementById('ai-matching-section');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Get user's location
    const savedCoords = localStorage.getItem('userLocationCoords');
    const coords = savedCoords 
      ? JSON.parse(savedCoords)
      : { lat: 40.7128, lng: -74.0060 }; // Default to NYC

    // Clear previous search results before new search
    localStorage.removeItem('lastSearch');
    
    // Fetch businesses
    await fetchNearbyBusinesses(coords.lat, coords.lng, query);
  };

  const handleCategoryClick = (categoryName: string) => {
    router.push(`/search?category=${encodeURIComponent(categoryName)}`);
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

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(id) 
        ? prev.filter(fid => fid !== id)
        : [...prev, id];
      
      toast({
        title: prev.includes(id) ? "Removed from favorites" : "Added to favorites",
        description: "You can view your favorites in your profile.",
      });
      
      return newFavorites;
    });
  };

  const formatDistance = (distance: number) => {
    if (distance < 0.1) return 'Less than 0.1 miles';
    return `${distance.toFixed(1)} miles`;
  };

  // Calculate the range of items to display
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = services.slice(startIndex, startIndex + itemsPerPage);

  // Function to sort businesses based on selected option
  const sortBusinesses = (businesses: Business[], option: SortOption): Business[] => {
    switch (option) {
      case 'rating':
        return [...businesses].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'reviews':
        return [...businesses].sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
      case 'response':
        return [...businesses].sort((a, b) => {
          if (a.availability === 'available' && b.availability !== 'available') return -1;
          if (b.availability === 'available' && a.availability !== 'available') return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
      case 'distance':
        return [...businesses].sort((a, b) => {
          // If either business has no location, put it at the end
          if (!a.distance && a.distance !== 0) return 1;
          if (!b.distance && b.distance !== 0) return -1;
          return (a.distance || 0) - (b.distance || 0);
        });
      case 'ai':
        return [...businesses].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      default:
        return [...businesses].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    }
  };

  // Get sorted businesses
  const sortedServices = sortBusinesses(services, sortOption);

  // Map business data to location format
  const getMapLocations = (businesses: Business[]): Location[] => {
    return businesses
      .filter(b => typeof b.latitude === 'number' && typeof b.longitude === 'number')
      .map(b => ({
        id: getBusinessId(b),
        name: b.business_name,
        latitude: b.latitude!,
        longitude: b.longitude!
      }));
  };

  // AI suggestions as user types
  const handleSearchInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Simulate AI suggestions
    if (value.length > 2) {
      const matchingServices = SERVICE_CATEGORIES.flatMap(category => 
        category.examples.filter(example => 
          example.toLowerCase().includes(value.toLowerCase())
        )
      );
      setSuggestions(matchingServices);
    } else {
      setSuggestions([]);
    }
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMapViewportChange = async (center: { lat: number; lng: number }, bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }) => {
    setMapCenter(center);
    await fetchNearbyBusinesses(center.lat, center.lng, query);
  };

  // Update particle intensity based on input
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Increase particle intensity when typing - makes the AI feel more responsive
    setParticleIntensity(Math.min(value.length * 0.15, 1));
    
    // Auto-resize textarea to fit content
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
    
    // Simulate AI suggestions
    if (value.length > 2) {
      const matchingServices = SERVICE_CATEGORIES.flatMap(category => 
        category.examples.filter(example => 
          example.toLowerCase().includes(value.toLowerCase())
        )
      );
      setSuggestions(matchingServices);
      
      // Generate AI suggestion
      if (matchingServices.length > 0) {
        const randomSuggestion = matchingServices[Math.floor(Math.random() * matchingServices.length)];
        setAiSuggestion(randomSuggestion);
        setShowAiSuggestion(true);
        
        // Hide suggestion after 3 seconds
        setTimeout(() => {
          setShowAiSuggestion(false);
        }, 3000);
      }
    } else {
      setSuggestions([]);
      setShowAiSuggestion(false);
    }
  };

  // Debug logging
  useEffect(() => {
    if (mapCenter && services.length > 0) {
      console.log('Map data:', {
        mapCenter,
        locationsCount: services.length,
        sampleLocation: services[0] ? {
          id: getBusinessId(services[0]),
          name: services[0].business_name,
          latitude: services[0].latitude,
          longitude: services[0].longitude
        } : null
      });
    }
  }, [mapCenter, services]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#F2F2F2] to-white font-inter">
      <GoogleMapsScript />
      <CursorParticles />
      
      {/* Hero Section */}
      <div className="relative min-h-[500px] sm:min-h-[600px] md:min-h-[800px] flex items-center justify-center overflow-hidden py-4 sm:py-12 md:py-0">
        {/* Enhanced AI Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-[#F2F2F2] to-[#F8F8F8] animate-gradient-xy">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(106,13,173,0.1),rgba(255,255,255,0))]" />
            <div className="absolute inset-0 bg-[url('/neural-network.svg')] opacity-5 animate-pulse" />
          </div>
          
          <AIBackground intensity={particleIntensity} />
          
          {/* Dynamic AI Wave Animation */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,50 Q25,45 50,50 T100,50" className="stroke-[#6A0DAD] fill-none animate-wave-1" />
                <path d="M0,50 Q25,55 50,50 T100,50" className="stroke-[#8A2BE2] fill-none animate-wave-2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 pt-8 sm:pt-10 md:pt-0 mt-4 sm:mt-0">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute -inset-20 -inset-y-10 bg-gradient-to-r from-[#6A0DAD]/10 to-[#8A2BE2]/10 blur-3xl" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-[#6A0DAD] mb-2 sm:mb-3 md:mb-6 leading-tight relative px-2 md:px-0">
                Find Any Service with AI
              </h1>
            </motion.div>
            <motion.p 
              className="text-base sm:text-lg md:text-2xl text-gray-600 mb-5 sm:mb-8 md:mb-12 px-3 md:px-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Let our AI find the perfect business for your needs
            </motion.p>

            {/* Enhanced AI Search Bar - Mobile Optimized */}
            <div 
              className="relative mb-4 sm:mb-8 transition-all duration-300 max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto px-3 sm:px-0"
              onMouseEnter={() => setParticleIntensity(40)}
              onMouseLeave={() => setParticleIntensity(0)}
              onClick={() => {
                searchInputRef.current?.focus();
                setParticleIntensity(40);
              }}
            >
              <div 
                className="relative flex flex-col sm:flex-row items-center bg-white/90 backdrop-blur-sm border border-violet-100 focus-within:border-violet-300 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group h-auto"
              >
                {/* Neural network pattern background */}
                <div className="absolute inset-0 bg-[url('/neural-network.svg')] opacity-[0.015] pointer-events-none"></div>
                <div className="absolute left-0 top-0 h-full w-1 sm:w-1.5 bg-gradient-to-b from-[#6A0DAD] to-[#8A2BE2]"></div>
                <div className="absolute left-0 top-0 h-full w-full overflow-hidden pointer-events-none">
                  <div className={`absolute left-0 bottom-0 h-[2px] sm:h-[3px] bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700 ease-out ${query.length > 0 ? 'w-full' : 'w-0'}`}></div>
                </div>
                <div className="absolute left-0 top-3 sm:top-4 pl-4 sm:pl-5 flex items-start pointer-events-none z-10">
                  <div className="relative">
                    <Search className="h-5 w-5 sm:h-6 sm:w-6 text-violet-500" />
                    <div className={`absolute -inset-1 bg-violet-400/30 rounded-full blur-sm animate-pulse ${query.length > 0 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}></div>
                  </div>
                </div>
                <div className="relative flex-1 w-full">
                  {query === '' && (
                    <div className="absolute inset-0 py-3.5 sm:py-5 px-12 sm:px-16 sm:pr-20 text-[15px] sm:text-lg text-gray-500 pointer-events-none leading-5 sm:leading-relaxed whitespace-pre-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="text-violet-500 font-medium">AI</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 opacity-75 animate-pulse"></span>
                        {PLACEHOLDER_TEXTS[currentPlaceholderIndex]}
                      </span>
                    </div>
                  )}
                  <textarea
                    ref={searchInputRef}
                    className="w-full h-auto py-3.5 sm:py-5 pl-12 sm:pl-16 pr-10 sm:pr-16 text-[15px] sm:text-lg text-gray-700 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none leading-5 sm:leading-relaxed z-10 min-h-[48px] sm:min-h-[65px] overflow-hidden"
                    value={query}
                    onChange={handleSearchInputChange}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch(e as any);
                      }
                    }}
                  />
                  {query.length > 0 && (
                    <div className="absolute right-12 sm:right-16 top-3.5 sm:top-5 flex space-x-1 sm:space-x-1.5">
                      <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-violet-500 animate-pulse"></div>
                      <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-violet-500 animate-pulse delay-100"></div>
                      <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-violet-500 animate-pulse delay-200"></div>
                    </div>
                  )}
                </div>
                <div 
                  onClick={(e) => !isLoading && query.trim() ? handleSearch(e as any) : null}
                  className={`flex items-center justify-center h-[50px] sm:h-[70px] px-4 sm:px-6 py-2 sm:py-3 transition-all duration-200 ${!isLoading && query.trim() ? 'cursor-pointer text-violet-600 hover:text-violet-800 active:scale-95' : 'text-gray-300'}`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center relative">
                      <div className="absolute -inset-3 sm:-inset-4 bg-violet-400/20 rounded-full blur-sm animate-pulse"></div>
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-violet-600" />
                    </div>
                  ) : (
                    <div className="relative transition-all duration-300 group-hover:scale-110">
                      <div className={`absolute -inset-3 sm:-inset-4 rounded-full bg-violet-400/30 blur-sm ${query.trim() ? 'opacity-70 group-hover:opacity-100' : 'opacity-0'} transition-opacity duration-300`}></div>
                      <ArrowUp className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent via-violet-300/50 to-transparent"></div>
              </div>
              {/* AI Badge */}
              <div className="absolute -top-3 sm:-top-4 left-6 sm:left-6 bg-gradient-to-r from-[#6A0DAD] to-[#8A2BE2] text-white text-xs sm:text-sm font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>AI</span>
                </div>
              </div>
              
              {/* AI Suggestion Popup */}
              {showAiSuggestion && aiSuggestion && (
                <div className="absolute -bottom-10 sm:-bottom-12 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-lg border border-violet-200 max-w-[90%] sm:max-w-xs z-20 animate-fade-in">
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-violet-500" />
                    <span>AI thinks you might be looking for <span className="font-medium text-violet-700">{aiSuggestion}</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Trending Services - Mobile Optimized */}
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 md:mb-8 px-2 sm:px-4">
              <span className="text-xs sm:text-sm md:text-base text-gray-600 mb-1.5 sm:mb-2 w-full text-center font-medium">Trending Services</span>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-md mx-auto">
                {[
                  { emoji: "🔧", text: "Book a Plumber" },
                  { emoji: "💇‍♀️", text: "Salon Appointment" },
                  { emoji: "🐶", text: "Pet Grooming" },
                  { emoji: "🧹", text: "House Cleaning" }
                ].map((trend, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(trend.text)}
                    className="text-xs sm:text-sm text-[#6A0DAD] hover:text-[#8A2BE2] transition-colors duration-150 flex items-center gap-1 bg-white/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm active:scale-95 active:bg-white/80 flex-grow sm:flex-grow-0"
                  >
                    <span className="text-sm sm:text-base">{trend.emoji}</span>
                    <span className="truncate">{trend.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Stats with Animation - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-8 max-w-3xl mx-auto mt-8 sm:mt-12 md:mt-16">
              {[
                { 
                  icon: <Target className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-[#6A0DAD] stroke-[1.5]" />, 
                  label: "Find the Perfect Business in Seconds" 
                },
                { 
                  icon: <Bot className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-[#6A0DAD] stroke-[1.5]" />, 
                  label: "AI-Powered, Human-Approved Support 24/7" 
                },
                { 
                  icon: <Rocket className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-[#6A0DAD] stroke-[1.5]" />, 
                  label: "More Businesses, More Choices – Growing Daily!" 
                }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-center group px-2 py-2 sm:py-3 md:py-0 bg-white/50 backdrop-blur-sm sm:bg-transparent rounded-xl border border-violet-50 sm:border-0"
                >
                  <div className="mb-1.5 sm:mb-2 md:mb-3 relative flex justify-center">
                    <div className="absolute -inset-2 bg-[#6A0DAD]/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative">{stat.icon}</span>
                  </div>
                  <div className="text-xs sm:text-sm md:text-base text-gray-600 px-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI-Generated Business Recommendations */}
      <section id="ai-matching-section" className="py-6 sm:py-10 md:py-24 bg-gradient-to-b from-[#F2F2F2] via-white to-[#F2F2F2] relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,50 Q25,45 50,50 T100,50" className="stroke-[#6A0DAD] fill-none animate-wave-1" />
              <path d="M0,50 Q25,55 50,50 T100,50" className="stroke-[#8A2BE2] fill-none animate-wave-2" />
            </svg>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 relative">
          <div className="text-center mb-6 sm:mb-10 md:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative inline-block"
            >
              <div className="absolute -inset-x-10 -inset-y-4 bg-gradient-to-r from-[#6A0DAD]/10 to-[#8A2BE2]/10 blur-2xl" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#6A0DAD] mb-2 sm:mb-3 md:mb-4 relative px-2 md:px-0 leading-tight">
                {isLoading ? "Finding Best Matches..." : "Top AI Recommendations"}
              </h2>
            </motion.div>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 px-2 sm:px-4 md:px-0">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span>Our AI is analyzing your request</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#6A0DAD] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-[#6A0DAD] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-[#6A0DAD] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </span>
              ) : hasSearched && services.length > 0 ? (
                <span>Found <span className="font-semibold text-[#6A0DAD]">{services.length}</span> businesses matched to your needs</span>
              ) : (
                "Businesses matched to your needs by our AI"
              )}
            </p>
          </div>

          {/* Smart Sorting Controls - Mobile Optimized */}
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-4 mb-4 sm:mb-6 md:mb-8 px-1 sm:px-2 md:px-0">
            <Button
              variant="outline"
              className={`border-[#6A0DAD] hover:bg-[#6A0DAD]/5 ${sortOption === 'ai' ? 'bg-[#6A0DAD]/10 font-semibold' : 'text-[#6A0DAD]'} text-xs sm:text-sm md:text-base py-1 sm:py-1.5 h-auto px-2 sm:px-3 active:scale-95`}
              onClick={() => setSortOption('ai')}
            >
              Sort by AI Match
            </Button>
            <Button
              variant="outline"
              className={`border-[#6A0DAD] hover:bg-[#6A0DAD]/5 ${sortOption === 'reviews' ? 'bg-[#6A0DAD]/10 font-semibold' : 'text-[#6A0DAD]'} text-xs sm:text-sm md:text-base py-1 sm:py-1.5 h-auto px-2 sm:px-3 active:scale-95`}
              onClick={() => setSortOption('reviews')}
            >
              Sort by Reviews
            </Button>
          </div>

          {/* Map Toggle for Mobile */}
          <div className="lg:hidden flex justify-center mb-3">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-violet-300 text-violet-700 flex items-center gap-1.5 shadow-sm hover:bg-violet-50"
              onClick={() => setShowMapOnMobile(!showMapOnMobile)}
            >
              {!showMapOnMobile ? (
                <>
                  <MapPin className="h-3.5 w-3.5" /> View Map
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" /> View List
                </>
              )}
            </Button>
          </div>

          {/* Split View: Business Grid and Map - Mobile Optimized */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8">
            {/* Business Cards Grid */}
            <div className={`${showMapOnMobile ? 'hidden lg:block' : ''} lg:w-1/2`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-md animate-pulse">
                      {/* Image skeleton */}
                      <div className="h-36 xs:h-40 sm:h-44 md:h-52 bg-gray-200 rounded-t-lg relative">
                        {/* Category badge skeleton */}
                        <div className="absolute top-2 left-2 h-4 w-16 bg-gray-100 rounded-full"></div>
                        {/* Title skeleton for small screens */}
                        <div className="absolute bottom-2 left-2 right-2 sm:hidden">
                          <div className="h-3 w-2/3 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                      
                      {/* Content skeleton */}
                      <div className="p-3 xs:p-3.5 sm:p-4 md:p-5">
                        {/* Title skeleton - hidden on mobile */}
                        <div className="hidden sm:block h-4 sm:h-5 md:h-6 bg-gray-200 rounded w-3/4 mb-2 sm:mb-3"></div>
                        
                        {/* Rating skeleton for desktop */}
                        <div className="hidden sm:flex items-center space-x-1 mb-2">
                          <div className="flex space-x-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div key={i} className="w-3 h-3 bg-gray-200 rounded-full"></div>
                            ))}
                          </div>
                          <div className="h-3 w-8 bg-gray-200 rounded"></div>
                        </div>
                        
                        {/* Enhanced mobile rating skeleton */}
                        <div className="flex sm:hidden items-center mb-3">
                          <div className="flex space-x-1 mr-1.5">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div key={i} className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div>
                            ))}
                          </div>
                          <div className="h-2.5 w-6 bg-gray-200 rounded mr-1"></div>
                          <div className="h-2.5 w-12 bg-gray-200 rounded"></div>
                        </div>
                        
                        {/* Description lines */}
                        <div className="space-y-1.5 mb-3.5 sm:mb-4">
                          <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                          <div className="h-2.5 bg-gray-200 rounded w-5/6"></div>
                          <div className="h-2.5 bg-gray-200 rounded w-4/5 sm:hidden"></div>
                        </div>
                        
                        {/* Mobile buttons side by side */}
                        <div className="flex gap-1.5 xs:hidden">
                          <div className="h-8 bg-gray-200 rounded w-2/3"></div>
                          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        
                        {/* Desktop buttons stacked */}
                        <div className="hidden xs:block space-y-2">
                          <div className="h-8 sm:h-9 md:h-10 bg-gray-200 rounded w-full"></div>
                          <div className="h-8 sm:h-9 md:h-10 bg-gray-200 rounded w-full"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : paginatedServices.length > 0 ? (
                  // Actual business cards
                  paginatedServices.map((business) => (
                    <div
                      key={getBusinessId(business)}
                      id={`business-${getBusinessId(business)}`}
                      className="relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                      onMouseEnter={() => setHoveredBusinessId(getBusinessId(business))}
                      onMouseLeave={() => setHoveredBusinessId(null)}
                    >
                      {/* Card glowing effect on active/hover */}
                      <div className="absolute inset-0 border border-transparent group-hover:border-violet-200 group-active:border-violet-300 rounded-xl z-0"></div>
                      <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-200 to-blue-100 rounded-xl opacity-0 group-hover:opacity-30 group-active:opacity-40 blur transition duration-300"></div>
                      
                      {/* Business Image with overlay gradient */}
                      <div className="relative h-36 xs:h-40 sm:h-44 md:h-52 w-full overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/60 z-10"></div>
                        {(business.images && business.images.length > 0) ? (
                          <ImageCarousel 
                            images={business.images.map(img => img.url || '/placeholder-business.jpg')} 
                          />
                        ) : (
                          <img
                            src="/placeholder-business.jpg"
                            alt={business.business_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        )}
                        
                        {/* Business name overlay for very small screens */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 sm:hidden z-20">
                          <h3 className="text-sm font-semibold text-white line-clamp-1 tracking-tight leading-tight">
                            {business.business_name}
                          </h3>
                        </div>
                        
                        {/* Category badge positioned on image */}
                        <Badge className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-800 font-medium shadow-sm">
                          {business.category || 'Service'}
                        </Badge>
                      </div>
                      
                      {/* Business details */}
                      <div className="p-3 xs:p-3.5 sm:p-4 md:p-5 flex-grow flex flex-col relative z-10">
                        {/* Business name - hidden on very small screens as it appears on the image */}
                        <h3 className="hidden sm:block text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 line-clamp-1 tracking-tight leading-tight group-hover:text-violet-700 transition-colors duration-200">
                          {business.business_name}
                        </h3>
                        
                        {/* Rating display - hidden on very small screens */}
                        {business.rating && (
                          <div className="hidden sm:flex items-center mb-2 sm:mb-3 text-xs sm:text-sm">
                            <div className="flex text-yellow-400 mr-1.5">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={i < Math.round(business.rating || 0) ? "text-yellow-400" : "text-gray-300"}>★</span>
                              ))}
                            </div>
                            <span className="font-medium text-gray-800 mr-1">
                              {business.rating.toFixed(1)}
                            </span>
                            <span className="text-gray-600">
                              {business.reviews_count 
                                ? `(${business.reviews_count})`
                                : '(No reviews)'}
                            </span>
                          </div>
                        )}
                        
                        {/* Enhanced rating for mobile screens */}
                        {business.rating && (
                          <div className="flex sm:hidden items-center mb-3 text-xs">
                            <div className="flex text-yellow-400 mr-1.5">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={i < Math.round(business.rating || 0) ? "text-yellow-400" : "text-gray-300"}>★</span>
                              ))}
                            </div>
                            <span className="font-medium text-gray-800 mr-1">
                              {business.rating.toFixed(1)}
                            </span>
                            <span className="text-gray-600 text-[10px]">
                              {business.reviews_count 
                                ? `(${business.reviews_count} reviews)`
                                : '(No reviews)'}
                            </span>
                          </div>
                        )}
                        
                        {/* Description - tighter on mobile */}
                        <p className="text-xs sm:text-sm text-gray-600 mb-3.5 sm:mb-3 md:mb-4 line-clamp-3 xs:line-clamp-2 flex-grow">
                          {business.description || 'No description available'}
                        </p>
                        
                        {/* Action buttons */}
                        <div className="flex xs:flex-col gap-1.5 sm:gap-2 mt-auto">
                          {/* Mobile layout: side-by-side buttons with ChatButton taking 2/3 of space */}
                          <div className="flex gap-1.5 xs:hidden w-full">
                            <div className="w-2/3">
                              <ChatButton 
                                businessId={getBusinessId(business)}
                                variant="default"
                                className="w-full h-8 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
                              />
                            </div>
                            <Link 
                              href={`/${getBusinessId(business)}`}
                              className="w-1/3"
                              aria-label={`View details for ${business.business_name}`}
                              title={`View details for ${business.business_name}`}
                            >
                              <Button 
                                variant="outline"
                                className="w-full h-8 border-violet-600 text-violet-600 hover:bg-violet-50 text-xs font-medium rounded-lg transition-colors"
                              >
                                Details
                              </Button>
                            </Link>
                          </div>
                          
                          {/* Tablet/Desktop layout: stacked buttons */}
                          <div className="hidden xs:block w-full">
                            <ChatButton 
                              businessId={getBusinessId(business)}
                              variant="default"
                              className="w-full h-8 sm:h-9 md:h-10 bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
                            />
                            <div className="h-1.5 sm:h-2"></div>
                            <Link 
                              href={`/${getBusinessId(business)}`}
                              className="block w-full"
                              aria-label={`View details for ${business.business_name}`}
                              title={`View details for ${business.business_name}`}
                            >
                              <Button 
                                variant="outline"
                                className="w-full h-8 sm:h-9 md:h-10 border-violet-600 text-violet-600 hover:bg-violet-50 text-xs sm:text-sm font-medium rounded-lg transition-colors"
                              >
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Empty state
                  <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-xl shadow-md">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4">
                      <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">No businesses found</h3>
                    <p className="text-sm text-gray-500 text-center">Try a different search query or check back later</p>
                    
                    {/* Suggest popular categories */}
                    <div className="mt-4 sm:mt-6">
                      <p className="text-xs sm:text-sm text-gray-500 mb-2 text-center">Popular categories:</p>
                      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                        {["Plumbing", "Cleaning", "Salon", "Auto Repair"].map((category) => (
                          <button
                            key={category}
                            onClick={() => setQuery(category)}
                            className="text-xs sm:text-sm text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-full transition-colors"
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination Controls - Mobile Optimized */}
              {!isLoading && paginatedServices.length > 0 && (
                <div className="flex justify-center mb-6 sm:mb-8">
                  <Pagination>
                    <PaginationContent className="gap-1 sm:gap-2">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="text-[10px] sm:text-xs py-0.5 sm:py-1 px-1.5 sm:px-2 h-7 sm:h-8"
                        />
                      </PaginationItem>
                      {[...Array(Math.min(3, Math.ceil(services.length / itemsPerPage)))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <PaginationItem key={i}>
                            <PaginationLink
                              isActive={currentPage === pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className="text-[10px] sm:text-xs h-7 sm:h-8 w-7 sm:w-8 p-0"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      {Math.ceil(services.length / itemsPerPage) > 3 && (
                        <PaginationItem>
                          <div className="flex items-center justify-center h-7 sm:h-8 w-7 sm:w-8">
                            <span className="text-[10px] sm:text-xs text-gray-500">...</span>
                          </div>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(services.length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(services.length / itemsPerPage)}
                          className="text-[10px] sm:text-xs py-0.5 sm:py-1 px-1.5 sm:px-2 h-7 sm:h-8"
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>

            {/* Map Section */}
            <div className={`${!showMapOnMobile ? 'hidden lg:block' : ''} lg:w-1/2 relative h-[200px] sm:h-[250px] md:h-auto`}>
              <div className="sticky top-16 sm:top-20 md:top-24 rounded-xl overflow-hidden shadow-lg bg-white h-full">
                <div className="h-full md:h-[calc(100vh-200px)] md:min-h-[500px]">
                  {isLoading ? (
                    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
                      <div className="text-gray-400 flex flex-col items-center gap-1 sm:gap-2 px-4 text-center">
                        <span className="text-sm">Loading map</span>
                        <div className="flex gap-1">
                          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  ) : mapCenter ? (
                    <Map
                      center={mapCenter}
                      locations={paginatedServices
                        .filter((business): business is Business & { latitude: number; longitude: number } => {
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
                        .map(business => ({
                          id: getBusinessId(business),
                          name: business.business_name,
                          latitude: business.latitude,
                          longitude: business.longitude,
                          isHighlighted: hoveredBusinessId === getBusinessId(business),
                          images: business.images || [],
                          rating: business.rating,
                          totalReviews: business.reviews_count
                        }))}
                      onMarkerClick={(businessId) => {
                        const business = paginatedServices.find(b => getBusinessId(b) === businessId);
                        if (business) {
                          setHoveredBusinessId(businessId);
                          // On mobile, scroll to the card more aggressively and switch to list view
                          if (window.innerWidth < 1024) { // Mobile or tablet
                            setShowMapOnMobile(false);
                            setTimeout(() => {
                              const element = document.getElementById(`business-${businessId}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          } else {
                            const element = document.getElementById(`business-${businessId}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }
                        }
                      }}
                      zoom={12}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
                      <p className="text-gray-500 text-xs sm:text-sm md:text-base px-4 text-center">Select a location to view the map</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section with AI Animation */}
      <section className="py-10 md:py-24 bg-gradient-to-b from-[#F2F2F2] via-white to-[#F2F2F2] relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 sm:mb-8 md:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative inline-block"
            >
              <div className="absolute -inset-x-10 -inset-y-4 bg-gradient-to-r from-[#6A0DAD]/10 to-[#8A2BE2]/10 blur-2xl" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#6A0DAD] mb-2 sm:mb-3 md:mb-4 relative px-2 md:px-0 leading-tight">
                How Flintime AI Works
              </h2>
            </motion.div>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 px-3 md:px-0">Find and book services in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-8 max-w-5xl mx-auto relative">
            {[
              {
                step: 1,
                title: "Describe Your Problem",
                description: "Tell us what you need - our AI understands and analyzes your requirements",
                icon: "🎯",
                color: "from-violet-500 to-violet-700",
                bgColor: "bg-violet-100",
                textColor: "text-violet-600"
              },
              {
                step: 2,
                title: "AI Matches Best Options",
                description: "Our AI ranks and suggests the most suitable businesses for your needs",
                icon: "🤖",
                color: "from-indigo-500 to-indigo-700",
                bgColor: "bg-indigo-100",
                textColor: "text-indigo-600"
              },
              {
                step: 3,
                title: "Chat and Book Instantly",
                description: "Use our AI-powered chat to effortlessly communicate with businesses, get quick answers, and confirm your booking directly through conversation.",
                icon: "✅",
                color: "from-purple-500 to-purple-700",
                bgColor: "bg-purple-100",
                textColor: "text-purple-600"
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                className="relative bg-white rounded-xl p-4 sm:p-5 md:p-6 shadow-md group hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${step.color} rounded-xl opacity-0 group-hover:opacity-10 blur transition duration-300`} />
                
                <div className="relative">
                  {/* Mobile layout with enhanced step indicator */}
                  <div className="md:hidden flex items-start mb-3">
                    {/* Step circle with icon */}
                    <div className={`flex-shrink-0 bg-gradient-to-br ${step.color} rounded-full w-12 h-12 flex items-center justify-center text-white text-2xl shadow-md z-10 relative`}>
                      {step.icon}
                      
                      {/* Pulsing effect */}
                      <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-20"></span>
                      
                    </div>
                    
                    {/* Step title */}
                    <div className="ml-3 flex-1">
                      <h3 className="text-lg font-semibold text-[#6A0DAD] leading-tight">
                        {step.title}
                      </h3>
                      <div className="text-xs font-semibold text-violet-500 mt-0.5 flex items-center">
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full ${step.bgColor} text-[10px] font-bold ${step.textColor} mr-1.5`}>{step.step}</span>
                        <span>of 3</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Desktop layout */}
                  <div className="hidden md:block">
                    <div className="text-3xl sm:text-4xl mb-3">{step.icon}</div>
                    <div className="absolute top-4 right-4 text-[#6A0DAD]/20 font-bold text-3xl md:text-4xl">
                      {step.step}
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-[#6A0DAD] mb-2">{step.title}</h3>
                  </div>
                  
                  {/* Description - same for both layouts */}
                  <p className="text-sm sm:text-base text-gray-600 ml-0 md:ml-0">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section with Enhanced AI Effects */}
      <section className="py-10 md:py-24 bg-gradient-to-b from-[#F2F2F2] to-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,50 Q25,45 50,50 T100,50" className="stroke-[#6A0DAD] fill-none animate-wave-1" />
              <path d="M0,50 Q25,55 50,50 T100,50" className="stroke-[#8A2BE2] fill-none animate-wave-2" />
            </svg>
          </div>
        </div>

        <div className="container mx-auto px-4 text-center relative">
          <div className="relative z-10 max-w-3xl mx-auto py-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative inline-block"
            >
              <div className="absolute -inset-x-10 -inset-y-4 bg-gradient-to-r from-[#6A0DAD]/10 to-[#8A2BE2]/10 blur-2xl" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#6A0DAD] mb-3 md:mb-6 relative px-2 md:px-0 leading-tight">
                Ready to Find the Perfect Service?
              </h2>
            </motion.div>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-5 md:mb-8 px-4 md:px-2">
              Let our AI match you with the best businesses in your area
            </p>
            <Button 
              className="group bg-gradient-to-r from-[#6A0DAD] to-[#8A2BE2] text-white px-5 sm:px-6 md:px-12 py-3 md:py-6 text-base md:text-xl rounded-full hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 relative w-full sm:w-auto max-w-xs mx-auto"
              onClick={() => {
                if (searchInputRef.current) {
                  searchInputRef.current.focus();
                  searchInputRef.current.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <span className="flex items-center justify-center gap-2">
                Start Searching Now
                <div className="w-2 h-2 bg-white rounded-full group-hover:animate-ping" />
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#6A0DAD] to-[#8A2BE2] opacity-0 group-hover:opacity-20 blur transition-opacity duration-300" />
            </Button>
          </div>
        </div>
      </section>

      <CursorParticles />
    </main>
  );
}

