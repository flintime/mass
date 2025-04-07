'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ReviewForm } from '@/app/components/reviews/ReviewForm';
import { ImageModal } from '@/app/components/reviews/ImageModal';
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
  Clock3,
  Tag,
  Award,
  Shield,
  Users,
  Sparkles,
  Gift,
  Percent,
  X,
  Check,
  Info,
  MessageSquare,
  Heart,
  Share2,
  Bookmark,
  ArrowRight,
  Menu,
  Home,
  Scissors,
  Brush,
  Cog,
  Minimize,
  Maximize,
  Battery,
  BatteryCharging,
  Thermometer,
  AirVent,
  CircuitBoard,
  ScanLine,
  KeyRound,
  Gauge,
  Tally3,
  Lightbulb,
  Fuel,
  Container,
  Droplet,
  Settings,
  Wind,
  Zap,
  PlugZap,
  SprayCan,
  Microscope,
  Fan,
  Droplets,
  Radio,
  Timer,
  Wrench,
  CarFront,
  Shirt,
  Utensils,
  Car,
  Tractor,
  Trash2,
  FlaskConical,
  Laptop,
  Briefcase,
  Stethoscope,
  Scale,
  Satellite,
  Accessibility,
  CalendarDays,
  Baby,
  Dog,
  Airplay,
  Truck,
  ShowerHead,
  Music,
  Cigarette,
  PiggyBank,
  Coffee,
  PartyPopper,
  Boxes,
  Trophy,
  GraduationCap,
  HelpingHand,
  UserPlus,
  Repeat,
  Building,
  Contact,
  BrainCircuit,
  ClipboardList,
  MessageCircleQuestion,
  HelpCircle,
  CornerDownRight,
  MessageSquarePlus,
  MessagesSquare,
  Loader2,
  Link2,
  Copy
} from 'lucide-react';
import { ChatButton } from '@/components/chat';
import { ReviewList } from '@/app/components/reviews';
import { geocodeAddress } from '@/lib/geocoding';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import React from 'react';
import { 
  getServiceGradient,
  getIconBackground,
  getTextColor,
  getFeatureGradient,
  getFeatureIconBg,
  getPromotionGradient,
  getPromotionIconBg,
  getPromotionTextColor
} from './violet-theme';
import { useToast } from "@/components/ui/use-toast";

// Add the import for the mobile page and useIsMobile hook
import MobileServiceDetailsPage from './mobile-page';
import { useIsMobile } from '@/hooks/use-mobile';

// Define a type for section names
type SectionName = 'overview' | 'services' | 'offers' | 'faqs' | 'reviews';

interface Service {
  name: string;
  description?: string;
  price?: number;
  duration?: number;
}

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

// Add ImagePreviewModal component
function ImagePreviewModal({ 
  image, 
  allImages,
  currentIndex,
  onClose
}: { 
  image: { url: string };
  allImages: { url: string }[];
  currentIndex: number;
  onClose: () => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);
  const currentImage = allImages[currentImageIndex];

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
      <div className="relative w-full max-w-5xl h-[90vh] flex flex-col">
        <div className="relative flex-1 min-h-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            <Image
              src={currentImage.url}
              alt={`Business image ${currentImageIndex + 1}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              priority
            />
          </div>
          {/* Navigation buttons */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-110 z-10"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-110 z-10"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {/* Image counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
              {currentImageIndex + 1} / {allImages.length}
            </div>
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all duration-300 transform hover:scale-110 z-10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Function to get appropriate icon for a service
const getServiceIcon = (serviceName: string) => {
  const name = serviceName.toLowerCase();
  
  // Map service names to appropriate icons
  if (name.includes('hair') || name.includes('cut') || name.includes('style') || name.includes('salon')) {
    return <Scissors className="h-5 w-5" />;
  } else if (name.includes('spa') || name.includes('massage') || name.includes('facial')) {
    return <Heart className="h-5 w-5" />;
  } else if (name.includes('nail') || name.includes('manicure') || name.includes('pedicure')) {
    return <Sparkles className="h-5 w-5" />;
  } else if (name.includes('makeup') || name.includes('beauty')) {
    return <Brush className="h-5 w-5" />;
  } 
  
  // Automotive and fuel service specialized cases - expanded
  else if (name.includes('transmission') || name.includes('gearbox')) {
    return <Cog className="h-5 w-5" />;
  } else if (name.includes('brake') || name.includes('rotor') || name.includes('caliper')) {
    return <Minimize className="h-5 w-5" />;
  } else if (name.includes('suspension') || name.includes('shock') || name.includes('strut')) {
    return <Maximize className="h-5 w-5" />;
  } else if (name.includes('battery') && name.includes('replac')) {
    return <Battery className="h-5 w-5" />;
  } else if (name.includes('battery') && (name.includes('charg') || name.includes('jump'))) {
    return <BatteryCharging className="h-5 w-5" />;
  } else if ((name.includes('ac') || name.includes('air conditioning') || name.includes('cooling')) && (name.includes('repair') || name.includes('service'))) {
    return <Thermometer className="h-5 w-5" />;
  } else if (name.includes('ventilation') || name.includes('vent') || name.includes('air flow')) {
    return <AirVent className="h-5 w-5" />;
  } else if (name.includes('heater') || name.includes('heat') || name.includes('warming')) {
    return <Thermometer className="h-5 w-5" />;
  } else if (name.includes('electrical') || name.includes('wiring') || name.includes('circuit')) {
    return <CircuitBoard className="h-5 w-5" />;
  } else if (name.includes('diagnostic') || name.includes('inspect') || name.includes('check')) {
    return <ScanLine className="h-5 w-5" />;
  } else if ((name.includes('key') || name.includes('unlock') || name.includes('ignition')) && (name.includes('replac') || name.includes('repair'))) {
    return <KeyRound className="h-5 w-5" />;
  } else if (name.includes('tire') || name.includes('wheel') || name.includes('alignment')) {
    return <Gauge className="h-5 w-5" />;
  } else if (name.includes('rotation') || name.includes('balance')) {
    return <Tally3 className="h-5 w-5" />;
  } else if ((name.includes('light') || name.includes('headlight') || name.includes('bulb')) && (name.includes('replac') || name.includes('repair'))) {
    return <Lightbulb className="h-5 w-5" />;
  } else if (name.includes('fuel') && (name.includes('tank') || name.includes('clean') || name.includes('service'))) {
    return <Fuel className="h-5 w-5" />;
  } else if (name.includes('tank') && name.includes('clean')) {
    return <Container className="h-5 w-5" />;
  } else if (name.includes('oil') && (name.includes('change') || name.includes('service'))) {
    return <Droplet className="h-5 w-5" />;
  } else if (name.includes('tune') || name.includes('performance')) {
    return <Settings className="h-5 w-5" />;
  } else if (name.includes('steering') || name.includes('wheel control')) {
    return <Cog className="h-5 w-5" />;
  } else if (name.includes('engine') && (name.includes('repair') || name.includes('service'))) {
    return <Cog className="h-5 w-5" />;
  } else if (name.includes('exhaust') || name.includes('muffler') || name.includes('catalytic')) {
    return <Wind className="h-5 w-5" />;
  } else if (name.includes('alternator') || name.includes('generator')) {
    return <Zap className="h-5 w-5" />;
  } else if (name.includes('radiator') || name.includes('coolant') || name.includes('antifreeze')) {
    return <Thermometer className="h-5 w-5" />;
  } else if (name.includes('spark plug') || name.includes('ignition')) {
    return <PlugZap className="h-5 w-5" />;
  } else if (name.includes('paint') && (name.includes('auto') || name.includes('car'))) {
    return <SprayCan className="h-5 w-5" />;
  } else if (name.includes('sensor') || name.includes('computer')) {
    return <Microscope className="h-5 w-5" />;
  } else if (name.includes('fan') || name.includes('belt')) {
    return <Fan className="h-5 w-5" />;
  } else if (name.includes('filter') && name.includes('oil')) {
    return <Droplet className="h-5 w-5" />;  
  } else if (name.includes('filter') && name.includes('air')) {
    return <AirVent className="h-5 w-5" />;
  } else if (name.includes('filter') && name.includes('fuel')) {
    return <Fuel className="h-5 w-5" />;
  } else if (name.includes('filter')) {
    return <CircuitBoard className="h-5 w-5" />;
  } else if (name.includes('radio') || name.includes('stereo') || name.includes('audio')) {
    return <Radio className="h-5 w-5" />;
  } else if (name.includes('schedule') || name.includes('appointment') || name.includes('book')) {
    return <Timer className="h-5 w-5" />;
  } else if (name.includes('tool') || name.includes('equipment')) {
    return <Wrench className="h-5 w-5" />;
  } else if (name.includes('warranty') || name.includes('guarantee')) {
    return <Shield className="h-5 w-5" />;
  } else if ((name.includes('car') || name.includes('auto') || name.includes('vehicle')) && name.includes('detail')) {
    return <CarFront className="h-5 w-5" />;
  } else if ((name.includes('fuel') || name.includes('tank') || name.includes('auto') || name.includes('car') || name.includes('vehicle')) 
    && name.includes('clean')) {
    return <Wrench className="h-5 w-5" />;
  } else if (name.includes('clean') || name.includes('laundry')) {
    return <Shirt className="h-5 w-5" />;
  } else if (name.includes('food') || name.includes('catering') || name.includes('restaurant')) {
    return <Utensils className="h-5 w-5" />;
  } else if (name.includes('home') || name.includes('house') || name.includes('interior')) {
    return <Home className="h-5 w-5" />;
  } else if (name.includes('car') || name.includes('auto') || name.includes('vehicle')) {
    return <Car className="h-5 w-5" />;
  } else if (name.includes('heavy') && (name.includes('equipment') || name.includes('machinery'))) {
    return <Tractor className="h-5 w-5" />;
  } else if (name.includes('waste') || name.includes('disposal') || name.includes('junk')) {
    return <Trash2 className="h-5 w-5" />;
  } else if (name.includes('fluid') || name.includes('liquid')) {
    return <Droplets className="h-5 w-5" />;
  } else if (name.includes('chemical') || name.includes('solution')) {
    return <FlaskConical className="h-5 w-5" />;
  } else if (name.includes('repair') || name.includes('fix') || name.includes('maintenance')) {
    return <Wrench className="h-5 w-5" />;
  } 
  
  // Add back some important categories
  else if (name.includes('tech') || name.includes('computer') || name.includes('it')) {
    return <Laptop className="h-5 w-5" />;
  } else if (name.includes('business') || name.includes('consult')) {
    return <Briefcase className="h-5 w-5" />;
  } else if (name.includes('health') || name.includes('medical') || name.includes('doctor')) {
    return <Stethoscope className="h-5 w-5" />;
  } else if (name.includes('legal') || name.includes('lawyer') || name.includes('attorney') || name.includes('law')) {
    return <Scale className="h-5 w-5" />;
  }
  
  // Default icon
  return <Star className="h-5 w-5" />;
};

// Function to generate a gradient color based on service name

// Function to get icon background color based on service name

// Function to get text color based on service name

// Function to get appropriate icon for a feature
const getFeatureIcon = (feature: string) => {
  const featureName = feature.toLowerCase();
  
  // Map features to appropriate icons
  if (featureName.includes('wifi') || featureName.includes('internet') || featureName.includes('online')) {
    return <Satellite className="h-5 w-5" />;
  } else if (featureName.includes('park') || featureName.includes('lot') || featureName.includes('garage')) {
    return <Car className="h-5 w-5" />;
  } else if (featureName.includes('card') || featureName.includes('payment') || featureName.includes('credit')) {
    return <DollarSign className="h-5 w-5" />;
  } else if (featureName.includes('wheelchair') || featureName.includes('access') || featureName.includes('handicap')) {
    return <Accessibility className="h-5 w-5" />;
  } else if (featureName.includes('appointment') || featureName.includes('book') || featureName.includes('schedule')) {
    return <CalendarDays className="h-5 w-5" />;
  } else if (featureName.includes('family') || featureName.includes('kid') || featureName.includes('child')) {
    return <Baby className="h-5 w-5" />;
  } else if (featureName.includes('air') || featureName.includes('conditioning') || featureName.includes('cool')) {
    return <Thermometer className="h-5 w-5" />;
  } else if (featureName.includes('pet') || featureName.includes('dog') || featureName.includes('animal')) {
    return <Dog className="h-5 w-5" />;
  } else if (featureName.includes('clean') || featureName.includes('sanitized') || featureName.includes('hygienic')) {
    return <Droplets className="h-5 w-5" />;
  } else if (featureName.includes('tv') || featureName.includes('television') || featureName.includes('screen')) {
    return <Airplay className="h-5 w-5" />;
  } else if (featureName.includes('hour') || featureName.includes('24/7') || featureName.includes('open')) {
    return <Clock className="h-5 w-5" />;
  } else if (featureName.includes('delivery') || featureName.includes('shipping') || featureName.includes('pickup')) {
    return <Truck className="h-5 w-5" />;
  } else if (featureName.includes('restroom') || featureName.includes('bathroom') || featureName.includes('toilet')) {
    return <ShowerHead className="h-5 w-5" />;
  } else if (featureName.includes('discount') || featureName.includes('offer') || featureName.includes('deal')) {
    return <DollarSign className="h-5 w-5" />;
  } else if (featureName.includes('music') || featureName.includes('sound') || featureName.includes('audio')) {
    return <Music className="h-5 w-5" />;
  } else if (featureName.includes('smoke') || featureName.includes('smoking') || featureName.includes('cigarette')) {
    return <Cigarette className="h-5 w-5" />;
  } else if (featureName.includes('security') || featureName.includes('safe') || featureName.includes('secure')) {
    return <Shield className="h-5 w-5" />;
  } else if (featureName.includes('refund') || featureName.includes('money back') || featureName.includes('guarantee')) {
    return <PiggyBank className="h-5 w-5" />;
  } else if (featureName.includes('coffee') || featureName.includes('tea') || featureName.includes('drink')) {
    return <Coffee className="h-5 w-5" />;
  } else if (featureName.includes('private') || featureName.includes('privacy') || featureName.includes('confidential')) {
    return <KeyRound className="h-5 w-5" />;
  }
  
  // Default icon
  return <Star className="h-5 w-5" />;
};

// Function to generate a gradient color based on feature

// Function to get icon background color based on feature

// Function to get feature icon background color

// Define a type for a single promotion
type Promotion = {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isFirstTimeOnly: boolean;
  validUntil: string;
  isActive: boolean;
};

// Function to get appropriate icon for a promotion
const getPromotionIcon = (promotion: Promotion | undefined) => {
  if (!promotion) return <DollarSign className="h-5 w-5" />;
  
  const name = promotion.name.toLowerCase();
  const description = promotion.description.toLowerCase();
  const combined = `${name} ${description}`.toLowerCase();
  
  // Map promotion to appropriate icons based on content
  if (combined.includes('holiday') || combined.includes('season') || combined.includes('christmas') || combined.includes('thanksgiving')) {
    return <PartyPopper className="h-5 w-5" />;
  } else if (combined.includes('bundle') || combined.includes('package') || combined.includes('combo')) {
    return <Boxes className="h-5 w-5" />;
  } else if (combined.includes('membership') || combined.includes('loyalty') || combined.includes('subscribe')) {
    return <Trophy className="h-5 w-5" />;
  } else if (combined.includes('student') || combined.includes('education') || combined.includes('school')) {
    return <GraduationCap className="h-5 w-5" />;
  } else if (combined.includes('senior') || combined.includes('elderly') || combined.includes('retire')) {
    return <HelpingHand className="h-5 w-5" />;
  } else if (combined.includes('military') || combined.includes('veteran') || combined.includes('service')) {
    return <Shield className="h-5 w-5" />;
  } else if (combined.includes('family') || combined.includes('kid') || combined.includes('child')) {
    return <Baby className="h-5 w-5" />;
  } else if (combined.includes('group') || combined.includes('team') || combined.includes('corporate')) {
    return <Users className="h-5 w-5" />;
  } else if (combined.includes('early') || combined.includes('book') || combined.includes('appointment')) {
    return <CalendarDays className="h-5 w-5" />;
  } else if (combined.includes('weekend') || combined.includes('weekday') || combined.includes('special day')) {
    return <Clock className="h-5 w-5" />;
  } else if (combined.includes('sale') || combined.includes('clearance') || combined.includes('limited time')) {
    return <Sparkles className="h-5 w-5" />;
  } else if (combined.includes('refer') || combined.includes('friend') || combined.includes('recommend')) {
    return <Users className="h-5 w-5" />;
  } else if (combined.includes('gift') || combined.includes('free') || combined.includes('complimentary')) {
    return <Gift className="h-5 w-5" />;
  } else if (combined.includes('new') || combined.includes('customer') || combined.includes('first')) {
    return <UserPlus className="h-5 w-5" />;
  } else if (combined.includes('renewal') || combined.includes('returning') || combined.includes('again')) {
    return <Repeat className="h-5 w-5" />;
  } else if ((combined.includes('percent') || combined.includes('%')) && promotion.discountType === 'percentage') {
    return <Percent className="h-5 w-5" />;
  } else if ((combined.includes('dollar') || combined.includes('$')) && promotion.discountType === 'fixed') {
    return <DollarSign className="h-5 w-5" />;
  }
  
  // Default icons based on discount type
  if (promotion.discountType === 'percentage') {
    return <Percent className="h-5 w-5" />;
  } else {
    return <DollarSign className="h-5 w-5" />;
  }
};

// Function to generate a gradient color based on promotion

// Function to get icon background color based on promotion

// Function to get appropriate text color for the promotion

// Function to format date in a more friendly way
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Calculate days remaining
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  // Add urgency indication
  if (diffDays <= 0) {
    return `Expired on ${formattedDate}`;
  } else if (diffDays <= 3) {
    return `Ending soon: ${formattedDate} (${diffDays} days left)`;
  } else if (diffDays <= 14) {
    return `${formattedDate} (${diffDays} days left)`;
  } else {
    return formattedDate;
  }
};

// Add a function to format business hours for display
const formatBusinessHours = (time: string) => {
  if (!time || time === "00:00") return "Closed";
  
  // Convert 24-hour format to 12-hour format with AM/PM
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

// Add a separate function to fetch data from feed-ai with wrapper
const fetchDataFromFeedAIWrapper = async (
  businessId: string, 
  setFeedAIBusinessHours: React.Dispatch<React.SetStateAction<any>>,
  setPromotions: React.Dispatch<React.SetStateAction<any>>,
  setIsLoadingPromotions: React.Dispatch<React.SetStateAction<boolean>>
) => {
  try {
    setIsLoadingPromotions(true);
    console.log('Fetching data from feed-ai for business:', businessId);
    
    // First try to get the auth token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Try first with authentication
    if (token) {
      console.log('Using authentication token for feed-ai request');
      const response = await fetch(`/api/business/feed-ai`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Feed AI data (authenticated):', data);
        
        // Set business hours
        if (data && data.businessHours) {
          console.log('Setting business hours from feed-ai:', data.businessHours);
          setFeedAIBusinessHours(data.businessHours);
        }
        
        if (data && Array.isArray(data.promotions)) {
          console.log('Setting promotions from feed-ai:', data.promotions);
          setPromotions(data.promotions);
          setIsLoadingPromotions(false);
          return;
        }
      } else {
        console.warn('Authenticated request failed, status:', response.status);
      }
    }
    
    // Fallback: Try with businessId as query parameter
    console.log('Trying fallback with businessId query parameter');
    const fallbackResponse = await fetch(`/api/business/feed-ai/public?businessId=${businessId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const fallbackData = await fallbackResponse.json();
    console.log('Feed AI data (public):', fallbackData);
    
    if (fallbackData && fallbackData.businessHours) {
      console.log('Setting business hours from feed-ai public endpoint:', fallbackData.businessHours);
      setFeedAIBusinessHours(fallbackData.businessHours);
    }
    
    if (fallbackData && Array.isArray(fallbackData.promotions)) {
      console.log('Setting promotions from feed-ai public endpoint:', fallbackData.promotions);
      setPromotions(fallbackData.promotions);
    } else {
      console.warn('No promotions found in feed-ai data');
    }
  } catch (error) {
    console.error('Error fetching data from feed-ai:', error);
  } finally {
    setIsLoadingPromotions(false);
  }
};

// Add this component after other helper components but before the main component
const BusinessHours = ({ business, feedAIBusinessHours }: { business: BusinessDetails, feedAIBusinessHours: any }) => {
  // Format hours from 24h to 12h format
  const formatHours = (time: string) => {
    if (!time) return "Closed";
    
    // Special case: Don't automatically treat "00:00" as closed
    // as it might be a 24/7 open business
    if (time === "00:00") return "12:00 AM";
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };
  
  // Helper function to determine if a day has special 24/7 hours
  const is24HourOpen = (dayData: any) => {
    return dayData.isOpen && dayData.open === "00:00" && dayData.close === "00:00";
  };
  
  // Helper function to check if all days are closed
  const isTemporarilyClosed = (hours: any) => {
    if (!hours || typeof hours !== 'object') return false;
    
    // Check if every day has isOpen set to false
    return Object.values(hours).every((dayData: any) => 
      dayData && typeof dayData === 'object' && dayData.isOpen === false
    );
  };
  
  // If we have feed AI business hours, display them in detail
  if (feedAIBusinessHours) {
    // Check if business is temporarily closed (all days are closed)
    if (isTemporarilyClosed(feedAIBusinessHours)) {
      return (
        <div className="p-4 bg-gray-100 rounded-md text-center">
          <span className="text-red-500 font-medium text-lg">Temporarily Closed</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        {Object.entries(feedAIBusinessHours).map(([day, data]: [string, any]) => (
          <div key={day} className="flex justify-between items-center">
            <span className="text-gray-600 capitalize">{day}</span>
            <span className="font-medium">
              {!data.isOpen 
                ? "Closed"
                : is24HourOpen(data)
                  ? "Open 24 hours"
                  : `${formatHours(data.open)} - ${formatHours(data.close)}`
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  // Otherwise fall back to the legacy format
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Monday - Friday</span>
        <span className="font-medium">{business.operatingHours || "9:00 AM - 5:00 PM"}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Saturday</span>
        <span className="font-medium">{business.weekendHours || "10:00 AM - 4:00 PM"}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Sunday</span>
        <span className="font-medium">{business.sundayHours || "Closed"}</span>
      </div>
    </div>
  );
};

// Wrapper component to handle mobile/desktop switch
export default function ServiceDetailsPage() {
  // Use ClientOnly wrapper to avoid hydration mismatch
  return (
    <ClientOnly>
      <ServiceDetailsPageContent />
    </ClientOnly>
  );
}

// Helper component to avoid hydration issues
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  return children;
}

// Component to handle the desktop/mobile switch
function ServiceDetailsPageContent() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileServiceDetailsPage />;
  }
  
  return <DesktopServiceDetails />;
}

// Original desktop implementation
function DesktopServiceDetails() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [promotions, setPromotions] = useState<BusinessDetails['promotions']>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionName>('overview');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    services: true,
    offers: true,
    faqs: true,
    reviews: true
  });
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [feedAIBusinessHours, setFeedAIBusinessHours] = useState<any>(null);
  const [showReviewImageModal, setShowReviewImageModal] = useState(false);
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewImageIndex, setReviewImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // References for each section for scrolling
  const overviewRef = React.useRef<HTMLDivElement>(null);
  const servicesRef = React.useRef<HTMLDivElement>(null);
  const offersRef = React.useRef<HTMLDivElement>(null);
  const faqsRef = React.useRef<HTMLDivElement>(null);
  const reviewsRef = React.useRef<HTMLDivElement>(null);

  // Toggle FAQ open/closed state
  const toggleFaq = (index: number) => {
    setOpenFaqs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Toggle section expansion
  const toggleSection = (section: SectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Scroll to section
  const scrollToSection = (section: SectionName) => {
    setActiveSection(section);
    
    const refs: Record<SectionName, React.RefObject<HTMLDivElement>> = {
      overview: overviewRef,
      services: servicesRef,
      offers: offersRef,
      faqs: faqsRef,
      reviews: reviewsRef
    };
    
    const ref = refs[section];
    if (ref && ref.current) {
      // Expand the section if it's collapsed
      if (!expandedSections[section]) {
        setExpandedSections(prev => ({
          ...prev,
          [section]: true
        }));
      }
      
      // Scroll with offset for the sticky header
      const yOffset = -80; 
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({top: y, behavior: 'smooth'});
    }
  };

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Add offset for the sticky header
      
      const sections: Array<{id: SectionName, ref: React.RefObject<HTMLDivElement>}> = [
        { id: 'overview', ref: overviewRef },
        { id: 'offers', ref: offersRef },
        { id: 'services', ref: servicesRef },
        { id: 'faqs', ref: faqsRef },
        { id: 'reviews', ref: reviewsRef }
      ];
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.ref.current && section.ref.current.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from bubbling up
    if (business?.images) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? business.images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from bubbling up
    if (business?.images) {
      setCurrentImageIndex((prev) => 
        prev === business.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  useEffect(() => {
    const fetchBusinessDetails = async () => {
      setIsLoading(true);
      try {
        console.log(`Fetching business details for id: ${params.id}`);
        const response = await fetch(`/api/business/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch business details');
        const data = await response.json();
        
        // Add more detailed logging for services
        console.log('Raw API Response:', data);
        console.log('Raw business data:', data.business);
        console.log('Raw services array:', data.business?.services);
        console.log('Services array length:', data.business?.services?.length || 0);
        
        // Extract business data and ensure services is an array
        const businessData = {
          ...data.business,
          id: data.business._id || params.id,
          unique_id: data.business.unique_id || params.id, // Ensure unique_id is available
          images: Array.isArray(data.business?.images) ? data.business.images : [],
          services: Array.isArray(data.business?.services) ? data.business.services : [],
          promotions: Array.isArray(data.business?.promotions) ? data.business.promotions : [],
          averageServiceQuality: data.business?.averageServiceQuality,
          averageValueForMoney: data.business?.averageValueForMoney
        };
        
        // Ensure faqs array exists (convert legacy format if needed)
        if (!businessData.faqs || businessData.faqs.length === 0) {
          if (businessData.faq_question && businessData.faq_answer) {
            // Convert legacy FAQ fields to faqs array
            console.log('Converting legacy FAQ fields to faqs array');
            businessData.faqs = [{
              question: businessData.faq_question,
              answer: businessData.faq_answer
            }];
          } else {
            businessData.faqs = [];
          }
        }
        
        console.log('Business data with processed FAQs:', businessData);
        console.log('Final processed businessData:', businessData);
        console.log('Final services array:', businessData.services);
        
        setBusiness(businessData);
        
        // Ensure we're getting all services from the business data
        if (Array.isArray(businessData.services)) {
          setServices(businessData.services);
          console.log('Setting services:', businessData.services);
        } else {
          console.warn('Services is not an array:', businessData.services);
          setServices([]);
        }

        // Set promotions from business data initially
        if (Array.isArray(businessData.promotions)) {
          setPromotions(businessData.promotions);
          console.log('Setting initial promotions from business data:', businessData.promotions);
        } else {
          console.warn('Promotions is not an array:', businessData.promotions);
          setPromotions([]);
        }

        // Fetch data from feed-ai for the most up-to-date data
        if (businessData.id) {
          fetchDataFromFeedAIWrapper(businessData.id, setFeedAIBusinessHours, setPromotions, setIsLoadingPromotions);
        }

        // Fetch reviews
        const reviewsResponse = await fetch(`/api/reviews/${params.id}`);
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData.reviews);
          // Update business rating and total reviews from the reviews endpoint
          setBusiness(prev => ({
            ...prev!,
            rating: reviewsData.averageRating,
            totalReviews: reviewsData.totalReviews,
            averageServiceQuality: reviewsData.averageServiceQuality,
            averageValueForMoney: reviewsData.averageValueForMoney
          }));
        }

        // Geocode the business address
        const address = `${businessData.address}, ${businessData.city}, ${businessData.state} ${businessData.zip_code}`;
        const coords = await geocodeAddress(address);
        setCoordinates(coords);

      } catch (error) {
        console.error('Error fetching business details:', error);
        setError(error instanceof Error ? error.message : 'An error occurred while fetching business details');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (params.id) {
      fetchBusinessDetails();
    }
  }, [params.id]);

  // Function to open the image modal
  const openImageModal = (images: string[], index: number) => {
    setSelectedImages(images);
    setSelectedImageIndex(index);
    setIsImageModalOpen(true);
  };

  // Function to open review image modal
  const openReviewImageModal = (images: string[], index: number) => {
    setReviewImages(images);
    setReviewImageIndex(index);
    setShowReviewImageModal(true);
  };

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (!business) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-500">Business not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 pt-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="mb-8 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="relative aspect-[16/9] w-full group">
                  {business?.images?.length > 0 ? (
                    <>
                      <div 
                        className="relative h-full w-full cursor-pointer"
                        onClick={() => {
                          console.log('Image clicked, current images:', business.images);
                          setShowImageModal(true);
                        }}
                      >
                        <Image
                          src={business.images[currentImageIndex].url}
                          alt={`${business.business_name} - Image ${currentImageIndex + 1}`}
                          fill
                          className="object-cover bg-gray-100"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                          priority
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center z-10">
                          <div className="opacity-0 group-hover:opacity-100 bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm transition-opacity font-medium">
                            Click to enlarge
                          </div>
                        </div>
                      </div>
                      {business.images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110 z-10 shadow-md backdrop-blur-sm"
                          >
                            <ChevronLeft className="h-7 w-7" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110 z-10 shadow-md backdrop-blur-sm"
                          >
                            <ChevronRight className="h-7 w-7" />
                          </button>
                          
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 backdrop-blur-sm bg-black/30 px-4 py-2 rounded-full z-10 shadow-md">
                            {business.images.map((_, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentImageIndex(index);
                                }}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                  index === currentImageIndex 
                                    ? 'bg-white w-6' 
                                    : 'bg-white/50 hover:bg-white/75'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center relative">
                      <p className="text-gray-500">No image available</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                      <div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 text-white drop-shadow-lg tracking-tight leading-tight">
                      {business.business_name}
                    </h1>
                    <div className="flex flex-col text-white/90 gap-2">
                          {business.unique_id && (
                            <span className="text-white/80 font-medium">@{business.unique_id}</span>
                          )}
                          {business.Business_Subcategories && business.Business_Subcategories.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {business.Business_Subcategories.map((subcategory, index) => (
                                <Badge key={index} variant="outline" className="bg-white/10 backdrop-blur-sm text-white border-white/20 text-xs rounded-full">
                                  {subcategory}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="bg-indigo-500/80 hover:bg-indigo-600/80 text-white transition-colors backdrop-blur-sm text-sm py-1 px-3 rounded-full border border-indigo-400/30">
                            {business.Business_Category}
                          </Badge>
                          {business.rating !== undefined && business.rating > 0 && (
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full">
                              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                              <span className="text-lg">{business.rating.toFixed(1)}</span>
                              <span className="text-white/80">
                                ({business.totalReviews} {business.totalReviews === 1 ? 'review' : 'reviews'})
                              </span>
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Always visible Flint to Book button */}
                      <div className="z-50">
                        <ChatButton 
                          businessId={business?.id || params.id as string}
                          variant="secondary"
                          className="backdrop-blur-sm bg-violet-500/90 hover:bg-violet-600 border-violet-400/30 text-white shadow-lg px-6 py-2 text-base font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
              </Card>
            </motion.div>

            {/* Sticky Navigation */}
            <div className="sticky top-0 z-30 py-3 bg-white/80 backdrop-blur-md shadow-md rounded-xl mb-8">
              <div className="flex overflow-x-auto hide-scrollbar gap-1 px-2">
                <Button 
                  variant={activeSection === 'overview' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => scrollToSection('overview')}
                  className={`whitespace-nowrap rounded-full ${activeSection === 'overview' ? 'bg-violet-600 hover:bg-violet-700' : 'text-violet-600 hover:bg-violet-100 hover:text-violet-700'}`}
                >
                  Overview
                </Button>
                <Button 
                  variant={activeSection === 'offers' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => scrollToSection('offers')}
                  className={`whitespace-nowrap rounded-full ${activeSection === 'offers' ? 'bg-violet-600 hover:bg-violet-700' : 'text-violet-600 hover:bg-violet-100 hover:text-violet-700'}`}
                >
                  Offers
                </Button>
                <Button 
                  variant={activeSection === 'services' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => scrollToSection('services')}
                  className={`whitespace-nowrap rounded-full ${activeSection === 'services' ? 'bg-violet-600 hover:bg-violet-700' : 'text-violet-600 hover:bg-violet-100 hover:text-violet-700'}`}
                >
                  Services
                </Button>
                <Button 
                  variant={activeSection === 'faqs' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => scrollToSection('faqs')}
                  className={`whitespace-nowrap rounded-full ${activeSection === 'faqs' ? 'bg-violet-600 hover:bg-violet-700' : 'text-violet-600 hover:bg-violet-100 hover:text-violet-700'}`}
                >
                  FAQs
                </Button>
                <Button 
                  variant={activeSection === 'reviews' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => scrollToSection('reviews')}
                  className={`whitespace-nowrap rounded-full ${activeSection === 'reviews' ? 'bg-violet-600 hover:bg-violet-700' : 'text-violet-600 hover:bg-violet-100 hover:text-violet-700'}`}
                >
                  Reviews
                </Button>
              </div>
            </div>

            {/* All Sections in a Single Page */}
            <div className="space-y-8">
              {/* Overview Section */}
                      <motion.div 
                ref={overviewRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
                id="overview-section"
              >
                <Card className="shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <div className="p-0">
                    {/* Section Header with gradient background */}
                    <div className="bg-gradient-to-r from-violet-500/10 via-violet-500/10 to-violet-500/5 p-6 border-b border-violet-100">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="bg-violet-100 text-violet-600 p-2.5 rounded-full shadow-sm">
                            <Building className="h-5 w-5" />
                        </div>
                          <div>
                            <h2 className="text-2xl font-semibold text-violet-900">About {business.business_name}</h2>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleSection('overview')}
                          className="rounded-full h-8 w-8 p-0 text-violet-600 hover:bg-violet-100 hover:text-violet-700"
                        >
                          {expandedSections.overview ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                        </div>
                    </div>
                    
                    {expandedSections.overview && (
                      <div className="p-6">
                        {/* Business description with stylized quote */}
                        <div className="relative mb-8 bg-gradient-to-r from-indigo-50 to-white rounded-xl p-6 border border-indigo-100/50">
                          <div className="absolute top-4 left-4 text-indigo-200 opacity-30">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 11H8V13H10V15H6V11C6 9.9 6.9 9 8 9H10V11ZM18 15H14V11C14 9.9 14.9 9 16 9H18V11H16V13H18V15Z" fill="currentColor"/>
                            </svg>
                          </div>
                          <div className="pl-5 border-l-4 border-indigo-300">
                            <p className="text-gray-700 text-lg leading-relaxed italic">
                              {business.description || "No business description available."}
                            </p>
                          </div>
                        </div>
                        
                        {/* Business quick facts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          {/* Business hours and location column */}
                          <div className="space-y-5">
                            {/* Business hours */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="bg-blue-50 text-blue-500 p-2 rounded-full">
                                  <Clock className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-lg">Business Hours</h3>
                              </div>
                              <div className="pl-11">
                                {/* Use our custom component */}
                                <BusinessHours 
                                  business={business} 
                                  feedAIBusinessHours={feedAIBusinessHours} 
                                />
                              </div>
                            </div>
                            
                            {/* Location */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="bg-emerald-50 text-emerald-500 p-2 rounded-full">
                                  <MapPin className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-lg">Location</h3>
                              </div>
                              <div className="pl-11">
                                <p className="text-gray-600">{business.address}</p>
                                <p className="text-gray-600">{business.city}, {business.state} {business.zip_code}</p>
                                <div className="mt-3">
                                  <Link 
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                      `${business.address}, ${business.city}, ${business.state} ${business.zip_code}`
                                    )}`}
                                    target="_blank"
                                    className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1"
                                  >
                                    <span>Get Directions</span>
                                    <ChevronRight className="h-4 w-4" />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Contact and business details column */}
                          <div className="space-y-5">
                            {/* Contact information */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="bg-violet-50 text-violet-500 p-2 rounded-full">
                                  <Contact className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-lg">Contact Information</h3>
                              </div>
                              <div className="space-y-3 pl-11">
                                {business.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <a href={`tel:${business.phone}`} className="text-gray-600 hover:text-violet-600 transition-colors">
                                      {business.phone}
                                    </a>
                                  </div>
                                )}
                                {business.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <a href={`mailto:${business.email}`} className="text-gray-600 hover:text-violet-600 transition-colors">
                                      {business.email}
                                    </a>
                                  </div>
                                )}
                        {business.Website && (
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-gray-400" />
                                    <a href={business.Website} target="_blank" className="text-gray-600 hover:text-violet-600 transition-colors">
                                      {business.Website.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]}
                            </a>
                          </div>
                        )}
                                
                                {business.unique_id && (
                                  <div className="flex items-start gap-2 pt-2 mt-2 border-t border-gray-100">
                                    <Link2 className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <div>
                                      <div className="text-gray-600 text-sm mb-1">Profile Link:</div>
                                      <div className="flex items-center">
                                        <code className="text-xs bg-gray-100 p-1.5 rounded flex-1 overflow-x-auto">
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
                                          className="ml-1"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Business stats */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="bg-amber-50 text-amber-500 p-2 rounded-full">
                                  <BrainCircuit className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-lg">Business Highlights</h3>
                              </div>
                              <div className="grid grid-cols-2 gap-4 pl-2">
                                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-white p-4 rounded-lg border border-amber-100 text-center">
                                  <span className="text-amber-600 font-bold text-xl mb-1">
                                    {business.years_in_business 
                                      ? (typeof business.years_in_business === 'string' && business.years_in_business.includes('(')
                                          ? business.years_in_business.split('(')[1].replace(')', '')
                                          : business.years_in_business + (typeof business.years_in_business === 'number' ? ' years' : ''))
                                      : "5+ years"}
                                  </span>
                                  <span className="text-gray-600 text-sm">Years in Business</span>
                                </div>
                                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 text-center">
                                  <span className="text-blue-600 font-bold text-xl mb-1">{business.totalReviews || 0}</span>
                                  <span className="text-gray-600 text-sm">Customer Reviews</span>
                                </div>
                                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-white p-4 rounded-lg border border-emerald-100 text-center">
                                  <span className="text-emerald-600 font-bold text-xl mb-1">{services?.length || 0}</span>
                                  <span className="text-gray-600 text-sm">Services Offered</span>
                                </div>
                                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-white p-4 rounded-lg border border-violet-100 text-center">
                                  <div className="flex items-center text-violet-600 font-bold text-xl mb-1">
                                    {business.rating ? business.rating.toFixed(1) : "-"}
                                    {business.rating && <Star className="h-4 w-4 ml-1 fill-amber-400 text-amber-400" />}
                                  </div>
                                  <span className="text-gray-600 text-sm">Average Rating</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Features & Amenities */}
                      {business.business_features && business.business_features.length > 0 && (
                          <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-5">
                              <div className="bg-indigo-100 text-indigo-600 p-2 rounded-full">
                                <Sparkles className="h-5 w-5" />
                              </div>
                              <h3 className="text-xl font-semibold">Features & Amenities</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {business.business_features.map((feature, index) => (
                    <motion.div 
                                key={index} 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                                >
                                  <div className={`p-2 rounded-full ${getFeatureIconBg(feature, index)}`}>
                                    {getFeatureIcon(feature)}
                                  </div>
                                  <span className="text-gray-700 font-medium">{feature}</span>
                    </motion.div>
                              ))}
                  </div>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </Card>
            </motion.div>

              {/* Offers & Promotions Section - Moved up */}
            <motion.div
                ref={offersRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                id="offers-section"
              >
                  <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-violet-100 text-violet-600 p-2.5 rounded-full shadow-sm">
                          <Gift className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-semibold text-violet-900">Special Offers & Promotions</h2>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSection('offers')}
                        className="rounded-full h-8 w-8 p-0 text-violet-600 hover:bg-violet-100 hover:text-violet-700"
                      >
                        {expandedSections.offers ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                    </div>
                    
                    {expandedSections.offers && (
                      <>
                        {/* Offers List */}
                        {isLoadingPromotions ? (
                          <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                            <span className="ml-3 text-amber-600">Loading latest offers...</span>
                          </div>
                        ) : Array.isArray(promotions) && promotions.length > 0 ? (
                          <div className="grid sm:grid-cols-2 gap-6">
                            {promotions.filter(promo => promo.isActive).map((promotion, index) => (
                              <motion.div
                                key={index} 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`bg-gradient-to-br ${getPromotionGradient(promotion, index)} rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 group border relative`}
                              >
                                {/* Special offer badge instead of highlight bar */}
                                {((promotion.discountType === 'percentage' && promotion.discountValue >= 30) || 
                                 (promotion.discountType === 'fixed' && promotion.discountValue >= 50)) && (
                                  <Badge 
                                    className={`absolute top-2 right-2 ${
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
                                
                                <div className="p-6">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2.5 rounded-full ${getPromotionIconBg(promotion, index)} transition-colors shadow-sm`}>
                                      {getPromotionIcon(promotion)}
                                    </div>
                                    <h3 className={`text-xl font-medium ${getPromotionTextColor(promotion, index)} transition-colors`}>
                                      {promotion.name}
                                    </h3>
                                  </div>
                                  
                                  <p className="text-gray-600 mb-5">{promotion.description}</p>
                                  
                                  <div className="flex flex-col gap-3">
                                    {/* Discount value with visual emphasis */}
                                    <div className="flex items-center gap-2">
                                      <div className={`px-4 py-3 rounded-lg font-bold text-lg ${
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
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">
                                          First-time customers
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Validity period with emphasis on urgency */}
                                    {promotion.validUntil && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <CalendarDays className="h-4 w-4 text-gray-400" />
                                        <p className={`text-sm font-medium ${
                                          new Date(promotion.validUntil).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000
                                            ? 'text-rose-600'
                                            : 'text-gray-500'
                                        }`}>
                                          {formatDate(promotion.validUntil)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-xl">
                            <PartyPopper className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500 text-lg font-medium">No promotions available at the moment</p>
                            <p className="text-gray-400 mt-2">Check back later for special deals and discounts</p>
                        </div>
                        )}
                      </>
                      )}
                    </div>
                  </Card>
              </motion.div>

              {/* Services Section */}
              <motion.div
                ref={servicesRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                id="services-section"
              >
                <div className="bg-gradient-to-r from-violet-50 to-white rounded-xl border border-violet-100/50 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-violet-100 text-violet-600 p-2 rounded-full shadow-sm">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-violet-900">Available Services</h3>
                    <div className="ml-auto">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSection('services')}
                        className="rounded-full h-8 w-8 p-0 text-violet-600 hover:bg-violet-100 hover:text-violet-700"
                      >
                        {expandedSections.services ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                  
                  {expandedSections.services && (
                    <>
                      {/* Services List */}
                      {Array.isArray(services) && services.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {services.map((service, index) => (
                            <motion.div
                              key={index}
                            initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-blue-200 hover:shadow-md transition-all duration-200"
                            >
                            <div className={`p-2 rounded-full ${getIconBackground(service, index)}`}>
                              {getServiceIcon(service)}
                                </div>
                            <span className="text-gray-700 font-medium">{service}</span>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                      <div className="text-center py-8">
                          <div className="h-12 w-12 text-gray-300 mx-auto mb-4">🛠️</div>
                          <p className="text-gray-500 text-lg">No services available</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>

              {/* FAQs Section */}
              <motion.div
                ref={faqsRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                id="faqs-section"
              >
                <Card className="shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-t-4 border-t-violet-500">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-violet-100 text-violet-600 p-2.5 rounded-full shadow-sm">
                          <MessageCircleQuestion className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-semibold text-violet-900">Frequently Asked Questions</h2>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSection('faqs')}
                        className="rounded-full h-8 w-8 p-0 text-violet-600 hover:bg-violet-100 hover:text-violet-700"
                      >
                        {expandedSections.faqs ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                    </div>
                    
                    {expandedSections.faqs && (
                      <>
                        {/* Check if FAQ data exists and is properly formatted */}
                        {(!business?.faqs || business.faqs.length === 0) ? (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-100"
                          >
                            <div className="bg-violet-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                              <MessageSquare className="h-10 w-10 text-violet-400" />
                            </div>
                            <h3 className="text-xl font-medium text-gray-700 mb-2">No FAQs Available</h3>
                            <p className="text-gray-500 max-w-md mx-auto">This business hasn't added any frequently asked questions yet. Check back later or contact them directly for any inquiries.</p>
                          </motion.div>
                        ) : (
                          <div className="grid gap-4">
                            {/* Display FAQs from the faqs array */}
                            {(() => {
                              console.log('Displaying FAQs from new faqs array:', business.faqs);
                              
                              // Return the mapped FAQ items from the faqs array
                              return business.faqs.map((faq, index) => {
                                const isOpen = openFaqs[index] || false;
                                
                                return (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                                      isOpen ? 'shadow-md border-violet-200' : 'shadow-sm hover:border-violet-100'
                                    }`}
                                  >
                                    <button
                                      onClick={() => toggleFaq(index)}
                                      className={`w-full text-left px-6 py-4 flex justify-between items-center ${
                                        isOpen ? 'bg-violet-50' : 'bg-white hover:bg-violet-50/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${isOpen ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'}`}>
                                          <HelpCircle className="h-4 w-4" />
                                        </div>
                                        <h3 className={`font-medium ${isOpen ? 'text-violet-900' : 'text-gray-700'}`}>{faq.question}</h3>
                                      </div>
                                      <div className={`${isOpen ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'} rounded-full p-1`}>
                                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                      </div>
                                    </button>
                                    
                                    <motion.div
                                      initial={false}
                                      animate={{ 
                                        height: isOpen ? 'auto' : 0,
                                        opacity: isOpen ? 1 : 0
                                      }}
                                      transition={{ duration: 0.3 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-6 py-4 bg-white border-t border-violet-100/50">
                                        <div className="pl-9">
                                          <div className="flex">
                                            <div className="shrink-0 mr-2 mt-1">
                                              <CornerDownRight className="h-3.5 w-3.5 text-violet-400" />
                                            </div>
                                            <p className="text-gray-600 leading-relaxed">
                                              {faq.answer}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  </motion.div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </>
                      )}
                    </div>
                  </Card>
              </motion.div>

              {/* Reviews Section */}
              <motion.div
                ref={reviewsRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                id="reviews-section"
              >
                <Card className="shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-t-4 border-t-amber-500">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-100 text-amber-600 p-2.5 rounded-full shadow-sm">
                          <Star className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-semibold text-amber-900">Reviews & Ratings</h2>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSection('reviews')}
                        className="rounded-full h-8 w-8 p-0 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                      >
                        {expandedSections.reviews ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                    </div>
                    
                    {expandedSections.reviews && (
                      <>
                        {/* Rating Summary */}
                        {business?.rating !== undefined && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 bg-gradient-to-r from-amber-50 to-white p-6 rounded-xl border border-amber-100/70 shadow-sm"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                              <div className="flex items-center gap-4">
                                <div className="bg-amber-100 rounded-full p-4 shadow-sm">
                                  <Star className="h-8 w-8 fill-amber-500 text-amber-500" />
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold text-amber-900">{business.rating?.toFixed(1)}</h3>
                                  <div className="flex items-center gap-1 mt-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                          i < Math.round(business.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-2 text-sm text-amber-700">
                                      ({business.totalReviews} {business.totalReviews === 1 ? 'review' : 'reviews'})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Rating Breakdown - can be expanded for detailed breakdown */}
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-700 font-medium">Service Quality</span>
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star 
                                          key={star} 
                                          className={`h-4 w-4 ${
                                            star <= (business.averageServiceQuality || 0)
                                              ? "fill-amber-400 text-amber-400" 
                                              : "text-gray-300"
                                          }`} 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-700 font-medium">Value for Money</span>
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star 
                                          key={star} 
                                          className={`h-4 w-4 ${
                                            star <= (business.averageValueForMoney || 0)
                                              ? "fill-amber-400 text-amber-400" 
                                              : "text-gray-300"
                                          }`} 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      
                      {/* Review Form */}
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="mb-6"
                        >
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-50 to-white px-4 py-3 border-b border-gray-100">
                              <h3 className="text-base font-semibold flex items-center gap-1.5">
                                <MessageSquarePlus className="h-4 w-4 text-amber-500" />
                                Write a Review
                              </h3>
                              <p className="text-gray-500 text-xs mt-0.5">Share your experience to help others make better decisions</p>
                            </div>
                            <div className="p-4">
                              <ReviewForm 
                                businessId={business?.id || params.id as string} 
                                onSubmit={() => {
                                  // Refetch reviews after submission
                                  const fetchReviews = async () => {
                                    try {
                                      const reviewsResponse = await fetch(`/api/reviews/${params.id}`);
                                      if (reviewsResponse.ok) {
                                        const reviewsData = await reviewsResponse.json();
                                        setReviews(reviewsData.reviews);
                                        // Update business rating and total reviews
                                        setBusiness(prev => ({
                                          ...prev!,
                                          rating: reviewsData.averageRating,
                                          totalReviews: reviewsData.totalReviews,
                                          averageServiceQuality: reviewsData.averageServiceQuality,
                                          averageValueForMoney: reviewsData.averageValueForMoney
                                        }));
                                      }
                                    } catch (error) {
                                      console.error('Error fetching reviews:', error);
                                    }
                                  };
                                  fetchReviews();
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>

                      {/* Reviews List */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-1.5">
                              <MessagesSquare className="h-4 w-4 text-amber-500" />
                              Customer Reviews
                            </h3>
                            
                            {reviews && reviews.length > 0 && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-2 py-0.5 text-xs">
                                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                              </Badge>
                            )}
                          </div>
                            
                          {reviews && reviews.length > 0 ? (
                            <div className="space-y-4">
                              {reviews.map((review, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.1 * index }}
                                  className="bg-white rounded-lg border border-amber-100 shadow-sm hover:shadow-md transition-shadow p-4 relative"
                                >
                                  {/* Removing Verified Visit badge */}
                                  
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                                      {review.customerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-baseline justify-between mb-1 gap-1">
                                        <h4 className="font-medium text-base text-amber-800">{review.customerName}</h4>
                                        <span className="text-amber-500 text-xs">
                                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short', 
                                            day: 'numeric'
                                          })}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center mb-2">
                                        {[...Array(5)].map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`h-3 w-3 ${
                                              i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-200'
                                            }`}
                                          />
                                        ))}
                                        <span className="ml-1.5 text-xs text-amber-700 font-medium">
                                          {review.rating.toFixed(1)}
                                        </span>
                                      </div>
                                      
                                      <div className="bg-amber-50 rounded-md p-3 border border-amber-100">
                                        {/* Review comment */}
                                        {review.comment ? (
                                          <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                                        ) : (
                                          <p className="text-gray-500 text-xs italic">No written review provided</p>
                                        )}

                                        {/* Review images */}
                                        {review.images && review.images.length > 0 && (
                                          <div className="mt-2">
                                            <div className="flex flex-wrap gap-1.5">
                                              {review.images.map((image, imageIndex) => (
                                                <div 
                                                  key={imageIndex} 
                                                  className="relative w-16 h-16 rounded-md overflow-hidden border border-amber-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                  onClick={() => openReviewImageModal(review.images || [], imageIndex)}
                                                >
                                                  <img 
                                                    src={image} 
                                                    alt={`Review image ${imageIndex + 1}`} 
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Business Reply - shown when a business has replied to the review */}
                                      {(review.reply || (review.businessReply?.text)) && (
                                        <div className="mt-2 ml-4 border-l-2 border-amber-200 pl-3">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <CornerDownRight className="h-3 w-3 text-amber-500" />
                                            <h5 className="font-medium text-sm text-amber-700">Response from {business.business_name}</h5>
                                            {(review.replyDate || review.businessReply?.createdAt) && (
                                              <span className="text-gray-500 text-xs">
                                                {new Date(review.replyDate || (review.businessReply?.createdAt || '')).toLocaleDateString('en-US', {
                                                  year: 'numeric',
                                                  month: 'short', 
                                                  day: 'numeric'
                                                })}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-gray-600 text-xs">{review.reply || (review.businessReply?.text || '')}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="bg-amber-50 h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-3">
                                <MessageSquare className="h-6 w-6 text-amber-300" />
                              </div>
                              <h3 className="text-base font-medium text-gray-700 mb-2">No Reviews Yet</h3>
                              <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">Be the first to share your experience with this business!</p>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Scroll to the review form
                                  const reviewForm = document.getElementById('reviews-section');
                                  if (reviewForm) {
                                    reviewForm.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }}
                                className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                              >
                                Write a Review
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      </>
                      )}
                    </div>
                  </Card>
            </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {showImageModal && business.images && (
        <ImagePreviewModal
          image={business.images[currentImageIndex]}
          allImages={business.images}
          currentIndex={currentImageIndex}
          onClose={() => setShowImageModal(false)}
        />
      )}
      
      {/* Image Modal */}
      {isImageModalOpen && (
        <ImageModal
          images={selectedImages}
          initialIndex={selectedImageIndex}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}
      
      {/* Review Image Modal */}
      {showReviewImageModal && (
        <ImageModal
          images={reviewImages}
          initialIndex={reviewImageIndex}
          onClose={() => setShowReviewImageModal(false)}
        />
      )}
    </>
  );
} 