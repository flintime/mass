'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Building2, Mail, Phone, Globe, MapPin, FileText, 
  Tags, ListChecks, AlertCircle, HelpCircle, Plus, X, ImageIcon,
  ZoomIn, Download, Calendar, Clock, Shield
} from 'lucide-react';
import { businessAuth } from '@/lib/businessAuth';
import { AddressAutocomplete } from '@/app/components/address-autocomplete';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { debounce } from 'lodash';
import useMobileDetect from '@/hooks/useMobileDetect';
import useResponsiveHeader from '../../../hooks/useResponsiveHeader';
import '../mobile.css'; // Import dashboard global mobile styles first
import './mobile.css';
import './desktop-tabs.css';

interface FAQ {
  question: string;
  answer: string;
}

interface BusinessImage {
  access: string;
  path: string;
  name: string;
  type: string;
  size: number;
  mime: string;
  meta: {
    width: number;
    height: number;
  };
  url: string;
}

interface BusinessProfile {
  business_name: string;
  email: string;
  phone: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  Website?: string;
  description: string;
  Business_Category: string;
  Business_Subcategories: string[];
  business_features?: string[];
  services?: string[];
  faqs: FAQ[];
  images: BusinessImage[];
  latitude?: number;
  longitude?: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  years_in_business?: string;
  unique_id: string;
}

interface BusinessUpdateData {
  business_name: string;
  email: string;
  phone: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  Website?: string;
  description?: string;
  Business_Category: string;
  Business_Subcategories: string[];
  images?: { url: string };
  business_features?: string[];
  faq_question?: string;
  faq_answer?: string;
  latitude?: number;
  longitude?: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  services?: string[];
  faqs: FAQ[];
  years_in_business?: string;
  unique_id: string;
}

const BUSINESS_CATEGORIES = [
  'Home Services',
  'Beauty & Personal Services',
  'Pet Care',
  'Auto Services'
];

// Add subcategories by business category
const BUSINESS_SUBCATEGORIES: Record<string, string[]> = {
  'Home Services': [
    'Plumbing',
    'Electrical',
    'HVAC',
    'Cleaning',
    'Lawn Care',
    'Landscaping',
    'Pest Control',
    'Handyman',
    'Painting',
    'Roofing',
    'Flooring',
    'Carpet Cleaning',
    'Window Cleaning'
  ],
  'Beauty & Personal Services': [
    'Hair Salon',
    'Barbershop',
    'Nail Salon',
    'Spa',
    'Massage',
    'Facial',
    'Makeup Artist',
    'Waxing',
    'Tanning',
    'Eyelash Extensions'
  ],
  'Pet Care': [
    'Veterinarian',
    'Pet Grooming',
    'Dog Walking',
    'Pet Sitting',
    'Pet Training',
    'Pet Boarding',
    'Pet Daycare'
  ],
  'Auto Services': [
    'Auto Repair',
    'Oil Change',
    'Car Wash',
    'Detailing',
    'Tire Shop',
    'Body Shop',
    'Towing',
    'Glass Repair'
  ]
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Update ImagePreviewModal component
function ImagePreviewModal({ 
  image, 
  onRemove,
  allImages,
  currentIndex
}: { 
  image: BusinessImage;
  onRemove: (url: string) => Promise<void>;
  allImages: BusinessImage[];
  currentIndex: number;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);
  const currentImage = allImages[currentImageIndex];
  const { isMobile } = useMobileDetect();

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full h-48 relative group">
          <img
            src={image.url}
            alt={image.name}
            className="w-full h-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="w-8 h-8 text-white" />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className={`max-w-4xl ${isMobile ? 'h-[85vh] p-0 w-[95vw] rounded-xl' : 'h-[90vh]'} flex flex-col p-0`}>
        <div className="relative flex-1 min-h-0 bg-gray-50">
          <img
            src={currentImage.url}
            alt={currentImage.name}
            className="w-full h-full object-contain"
          />
          {/* Navigation buttons */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          {/* Action buttons */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(currentImage.url, '_blank')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(currentImage.url);
              }}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          </div>
          {/* Image counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {allImages.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Function to check if unique ID is available
const checkUniqueIdAvailability = async (uniqueId: string, originalUniqueId?: string) => {
  if (!uniqueId || uniqueId.trim() === '') {
    return { available: false, error: 'Username cannot be empty' };
  }
  
  // If checking the same ID as the original, it's always available to the same business
  if (originalUniqueId && uniqueId.trim() === originalUniqueId.trim()) {
    return { available: true, uniqueId };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
    
    console.log(`Checking availability for username: ${uniqueId}`);
    const response = await fetch(`/api/business/auth/check-unique-id?uniqueId=${encodeURIComponent(uniqueId.trim())}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store', // Prevent caching
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`API error (${response.status}): ${response.statusText}`);
      return { 
        available: false, 
        error: 'Could not verify username availability. Please try again.',
        temporary: true
      };
    }
    
    const data = await response.json();
    console.log('Username availability response:', data);
    
    // Handle potential error cases from the API
    if (data.error && data.temporary) {
      return {
        available: false,
        error: data.error,
        temporary: true
      };
    }
    
    return {
      available: !!data.available,
      uniqueId: data.uniqueId,
      similarUsernames: data.similarUsernames || [],
      error: data.available ? null : 'This username is already taken'
    };
  } catch (error: any) {
    console.error('Error checking username availability:', error);
    
    if (error.name === 'AbortError') {
      return {
        available: false,
        error: 'Username validation timed out. Please try again.',
        temporary: true
      };
    }
    
    return {
      available: false,
      error: 'Could not verify username. Try a different one or try again later.',
      temporary: true
    };
  }
};

export default function BusinessProfilePage() {
  const router = useRouter();
  const { isMobile } = useResponsiveHeader(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [newFeature, setNewFeature] = useState('');
  const [newService, setNewService] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });
  const [error, setError] = useState<string | null>(null);
  const [isUniqueIdValid, setIsUniqueIdValid] = useState(true);
  const [uniqueIdAvailable, setUniqueIdAvailable] = useState(true);
  const [checkingUniqueId, setCheckingUniqueId] = useState(false);
  const [originalUniqueId, setOriginalUniqueId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [similarUsernames, setSimilarUsernames] = useState<string[]>([]);
  const [tempValidationError, setTempValidationError] = useState(false);
  // Add a ref to track if we should show the scroll position
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFloatingSave, setShowFloatingSave] = useState(false);

  // Monitor scroll position to show/hide floating save button
  useEffect(() => {
    if (!isMobile || !hasChanges) return;
    
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const scrollPosition = window.scrollY;
      // Show floating button when scrolled down 100px
      setShowFloatingSave(scrollPosition > 100);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, hasChanges]);

  // Get subcategories based on selected business category
  const availableSubcategories = useMemo(() => {
    if (!profile) return [];
    return profile.Business_Category ? BUSINESS_SUBCATEGORIES[profile.Business_Category] || [] : [];
  }, [profile?.Business_Category]);

  // Update the business auth service implementation
  const businessAuthService = {
    checkUniqueIdAvailability: async (uniqueId: string): Promise<boolean> => {
      // Use AbortController for client-side timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      try {
        const response = await fetch(`/api/business/auth/check-unique-id?uniqueId=${encodeURIComponent(uniqueId.trim())}`, {
          signal: controller.signal,
          // Cache: 'no-store' prevents caching of username availability responses
          cache: 'no-store'
        });
        clearTimeout(timeoutId);
        
        if (!response.ok && response.status !== 200) {
          console.warn(`Username validation API returned status ${response.status}`);
          throw new Error(`API returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if this is a temporary error response
        if (data.temporary) {
          console.log(`Temporary validation issue for username '${uniqueId}'`, data);
          throw new Error(data.error || 'Temporary validation error');
        }
        
        console.log(`Username '${uniqueId}' availability result:`, data.available);
        return !!data.available;
      } catch (error) {
        console.error('Error checking username availability:', error);
        throw error;
      }
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!businessAuth.isAuthenticated()) {
          router.push('/business/signin');
          return;
        }

        const user = await businessAuth.getCurrentUser();
        
        console.log('Full user data from API including faqs:', JSON.stringify({
          faqs: user.faqs,
          faq_question: user.faq_question,
          faq_answer: user.faq_answer
        }, null, 2));
        
        // Helper function to ensure image has url property
        const formatImageData = (img: any): BusinessImage => {
          if (typeof img === 'string') {
            return {
              access: 'public',
              path: img,
              name: 'image',
              type: 'image/jpeg',
              size: 0,
              mime: 'image/jpeg',
              meta: {
                width: 0,
                height: 0
              },
              url: img
            };
          }
          if (img && typeof img === 'object' && 'url' in img) {
            return {
              access: img.access || 'public',
              path: img.path || img.url,
              name: img.name || 'image',
              type: img.type || 'image/jpeg',
              size: img.size || 0,
              mime: img.mime || 'image/jpeg',
              meta: {
                width: img.meta?.width || 0,
                height: img.meta?.height || 0
              },
              url: img.url
            };
          }
          return {
            access: 'public',
            path: '',
            name: 'image',
            type: 'image/jpeg',
            size: 0,
            mime: 'image/jpeg',
            meta: {
              width: 0,
              height: 0
            },
            url: ''
          };
        };

        // Ensure images are in the correct format
        const formattedImages = user.images 
          ? (Array.isArray(user.images) 
              ? user.images.map(formatImageData)
              : [formatImageData(user.images)])
          : [];

        console.log('Received user data from API:', user);
        
        setProfile({
          business_name: user.business_name,
          email: user.email,
          phone: user.phone || 0,
          address: user.address,
          city: user.city,
          state: user.state,
          zip_code: user.zip_code,
          Website: user.Website,
          description: user.description,
          Business_Category: user.Business_Category,
          Business_Subcategories: user.Business_Subcategories || [],
          business_features: user.business_features || [],
          services: user.services || [],
          faqs: user.faqs || [],
          images: formattedImages,
          latitude: user.latitude,
          longitude: user.longitude,
          location: user.location,
          years_in_business: user.years_in_business,
          unique_id: user.unique_id
        });
        
        setOriginalUniqueId(user.unique_id);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  // Update the useEffect for validation
  useEffect(() => {
    if (!profile) return;
    
    const uniqueId = profile.unique_id;
    const isValid = /^[a-z0-9_.]{3,30}$/.test(uniqueId);
    setIsUniqueIdValid(isValid);
    setValidationError(null);
    
    // Skip availability check if format is invalid or it's the original ID
    if (!isValid || uniqueId === originalUniqueId) {
      setUniqueIdAvailable(uniqueId === originalUniqueId);
      return;
    }
    
    // Reset the attempts counter if the ID changes
    if (uniqueId !== originalUniqueId) {
      setCheckAttempts(0);
    }
    
    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(async () => {
      // If we've already tried 3 times, don't hammer the server
      if (checkAttempts >= 3) {
        setValidationError("Validation service is experiencing issues. You can still save changes and we'll verify later.");
        // Consider the username available after multiple failed attempts
        setUniqueIdAvailable(true);
        return;
      }
      
      try {
        setCheckingUniqueId(true);
        
        // Use our business auth service implementation
        const available = await businessAuthService.checkUniqueIdAvailability(uniqueId);
        setUniqueIdAvailable(available);
        setValidationError(null);
      } catch (error: any) {
        console.error('Error checking unique ID availability:', error);
        setCheckAttempts(prev => prev + 1);
        
        // If this is our 3rd attempt, show a different message
        if (checkAttempts >= 2) {
          setValidationError("Username validation service is temporarily unavailable. You can still save changes.");
          // Assume username is available to let the user proceed
          setUniqueIdAvailable(true);
        } else {
          setValidationError(`Couldn't verify username availability (${checkAttempts + 1}/3 attempts)`);
          setUniqueIdAvailable(false);
        }
      } finally {
        setCheckingUniqueId(false);
      }
    }, 800); // Increased debounce to prevent too many rapid calls
    
    return () => clearTimeout(timeoutId);
  }, [profile?.unique_id, originalUniqueId, checkAttempts]);

  // Add debounced function for unique_id validation
  const debouncedCheckUniqueId = useCallback(
    debounce(async (value: string) => {
      if (!value || value.trim().length < 3) {
        setIsUniqueIdValid(false);
        setUniqueIdAvailable(false);
        setValidationError('Username must be at least 3 characters');
        setCheckingUniqueId(false);
        return;
      }
      
      // Check format first with regex (3-30 characters, letters, numbers, dots, underscores)
      const validFormat = /^[a-zA-Z0-9._]{3,30}$/.test(value);
      if (!validFormat) {
        setIsUniqueIdValid(false);
        setUniqueIdAvailable(false);
        setValidationError('Username can only contain letters, numbers, dots, and underscores (3-30 characters)');
        setCheckingUniqueId(false);
        return;
      }
      
      setIsUniqueIdValid(true);
      setValidationError(null);
      
      // If it's the original ID, no need to check availability
      if (value.trim() === originalUniqueId) {
        setUniqueIdAvailable(true);
        setCheckingUniqueId(false);
        return;
      }
      
      try {
        const result = await checkUniqueIdAvailability(value, originalUniqueId);
        console.log('Username validation result:', result);
        
        setUniqueIdAvailable(!!result.available);
        setSimilarUsernames(result.similarUsernames || []);
        setTempValidationError(!!result.temporary);
        
        if (result.error) {
          setValidationError(result.error);
        } else {
          setValidationError(null);
        }
      } catch (error) {
        console.error('Error in debounced unique ID check:', error);
        setUniqueIdAvailable(false);
        setValidationError('Could not verify username. Please try again.');
        setTempValidationError(true);
      } finally {
        setCheckingUniqueId(false);
      }
    }, 500),
    [originalUniqueId]
  );
  
  const handleUniqueIdChange = (value: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      return { ...prev, unique_id: value };
    });
    setCheckingUniqueId(true);
    debouncedCheckUniqueId(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault();
    
    if (!profile) return;
    setIsSaving(true);
    
    try {
      // Validate unique_id format (always required)
      if (!isUniqueIdValid) {
        toast({
          title: "Invalid Username",
          description: "Username must be 3-30 characters and can only contain letters, numbers, dots, and underscores.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      // Only block submission if we're certain the username is taken
      // If there's a validation error but we've tried multiple times, allow the submission
      if (!uniqueIdAvailable && profile.unique_id !== originalUniqueId && !validationError) {
        toast({
          title: "Username Unavailable",
          description: "This username is already taken. Please choose another one.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // If we're proceeding with a username change despite validation issues
      if (profile.unique_id !== originalUniqueId && validationError) {
        // We'll still allow the save but warn the user
        toast({
          title: "Username Validation Notice",
          description: "We couldn't fully verify your username availability. If it's already taken, you'll be notified later.",
          variant: "destructive",
        });
      }

      // Include services and faqs in the data object
      const data: BusinessUpdateData = {
        business_name: profile.business_name,
        email: profile.email,
        phone: Number(profile.phone),
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zip_code,
        Website: profile.Website || undefined,
        description: profile.description,
        Business_Category: profile.Business_Category,
        Business_Subcategories: profile.Business_Subcategories || [],
        business_features: profile.business_features || [],
        services: profile.services || [], // Make sure services is included
        faqs: profile.faqs || [], // Include faqs directly in the update
        latitude: profile.latitude,
        longitude: profile.longitude,
        location: profile.location,
        years_in_business: profile.years_in_business,
        unique_id: profile.unique_id
      };
      
      console.log('Submitting profile update with services:', profile.services);
      console.log('Submitting profile update with faqs:', profile.faqs);
      console.log('Full update data:', data);
      
      // Update the business profile with everything including FAQs
      const result = await businessAuth.updateProfile(data);
      console.log('Profile update result:', result);
      console.log('Updated FAQs:', result.faqs);
      
      setHasChanges(false);
      toast({
        title: 'Profile updated',
        description: 'Your business profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to update profile');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof BusinessProfile, value: BusinessProfile[keyof BusinessProfile]) => {
    if (!profile) return;

    let formattedValue = value;

    // Log FAQs changes specifically
    if (field === 'faqs') {
      console.log('FAQs updated via handleInputChange:', value);
    }

    // Handle years_in_business calculation when a year is entered
    if (field === 'years_in_business' && typeof value === 'string') {
      // Check if the value is a valid year (4 digits and not in the future)
      const currentYear = new Date().getFullYear();
      const yearPattern = /^\d{4}$/;
      
      if (yearPattern.test(value) && parseInt(value) <= currentYear) {
        const yearEstablished = parseInt(value);
        const yearsInBusiness = currentYear - yearEstablished;
        
        // Store both the year established and the calculated years in business
        formattedValue = `${value} (${yearsInBusiness} years)`;
        console.log(`Year established: ${value}, Years in business: ${yearsInBusiness}`);
      }
    }

    // Handle ZIP code formatting
    if (field === 'zip_code' && typeof value === 'string') {
      // Remove non-digits and limit to 5 characters
      formattedValue = value.replace(/\D/g, '').slice(0, 5);
    }

    // Handle phone number formatting
    if (field === 'phone' && (typeof value === 'string' || typeof value === 'number')) {
      // Remove non-digits
      formattedValue = value.toString().replace(/\D/g, '');
      // Convert to number for the API
      formattedValue = formattedValue ? Number(formattedValue) : '';
    }

    const updatedProfile = {
      ...profile,
      [field]: formattedValue
    };
    setProfile(updatedProfile);
    setHasChanges(true);

    // Auto-save if address fields are changed
    if (['address', 'city', 'state', 'zip_code'].includes(field)) {
      // Clear any existing timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      // Check if all address fields are filled
      const hasAllAddressFields = 
        updatedProfile.address?.trim() && 
        updatedProfile.city?.trim() && 
        updatedProfile.state?.trim() && 
        updatedProfile.zip_code?.trim()?.length === 5;

      if (hasAllAddressFields) {
        // Set a new timeout to save after 1 second of no changes
        const timeout = setTimeout(async () => {
          try {
            setIsSaving(true);
            console.log('Auto-saving address update:', {
              address: updatedProfile.address,
              city: updatedProfile.city,
              state: updatedProfile.state,
              zip_code: updatedProfile.zip_code
            });

            // Get coordinates from Google Maps API
            const geocodeResponse = await fetch(`/api/geocode?address=${encodeURIComponent(
              `${updatedProfile.address}, ${updatedProfile.city}, ${updatedProfile.state} ${updatedProfile.zip_code}`
            )}`);

            if (!geocodeResponse.ok) {
              throw new Error('Failed to geocode address');
            }

            const { latitude, longitude } = await geocodeResponse.json();
            console.log('Geocoding result:', { latitude, longitude });

            // Create the update data with new coordinates
            const updateData: BusinessUpdateData = {
              business_name: updatedProfile.business_name,
              email: updatedProfile.email,
              phone: Number(updatedProfile.phone),
              address: updatedProfile.address,
              city: updatedProfile.city,
              state: updatedProfile.state,
              zip_code: updatedProfile.zip_code,
              Website: updatedProfile.Website,
              description: updatedProfile.description,
              Business_Category: updatedProfile.Business_Category,
              Business_Subcategories: updatedProfile.Business_Subcategories,
              business_features: updatedProfile.business_features,
              services: profile.services || [], // Include the services array
              faqs: profile.faqs || [], // Include faqs directly in the update
              latitude: latitude,
              longitude: longitude,
              location: {
                type: 'Point',
                coordinates: [longitude, latitude]
              },
              years_in_business: updatedProfile.years_in_business,
              unique_id: updatedProfile.unique_id
            };

            console.log('Auto-save update data with services:', profile.services);
            
            // Update the business profile
            const updateResponse = await businessAuth.updateProfile(updateData);
            console.log('Address update response:', updateResponse);

            // Update the local state with new coordinates
            setProfile(prev => {
              if (!prev) return null;
              return {
                ...prev,
                latitude: latitude,
                longitude: longitude,
                location: {
                  type: 'Point',
                  coordinates: [longitude, latitude]
                },
                years_in_business: updatedProfile.years_in_business
              };
            });

            setHasChanges(false);
            toast({
              title: '📍 Address Updated',
              description: 'Your business location has been updated.',
              duration: 3000,
            });

          } catch (error) {
            console.error('Error auto-saving profile:', error);
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to update business location.',
              variant: 'destructive',
            });
          } finally {
            setIsSaving(false);
          }
        }, 1000);

        setAutoSaveTimeout(timeout);
      }
    }
  };

  const handleAddFeature = () => {
    if (!profile || !newFeature.trim()) return;
    const newFeatures = [...(profile.business_features || []), newFeature.trim()];
    handleInputChange('business_features', newFeatures);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!profile) return;
    const newFeatures = profile.business_features?.filter((_, i) => i !== index) || [];
    handleInputChange('business_features', newFeatures);
  };

  const handleAddService = () => {
    if (!profile || !newService.trim()) return;
    
    // Create a new services array, handling the case where it might be undefined
    const existingServices = Array.isArray(profile.services) ? profile.services : [];
    const newServices = [...existingServices, newService.trim()];
    
    console.log('Adding service:', newService.trim());
    console.log('New services array:', newServices);
    
    handleInputChange('services', newServices);
    setNewService('');
  };

  const handleRemoveService = (index: number) => {
    if (!profile) return;
    
    // Handle the case where services might be undefined
    const existingServices = Array.isArray(profile.services) ? profile.services : [];
    const newServices = existingServices.filter((_, i) => i !== index);
    
    console.log('Removing service at index:', index);
    console.log('New services array after removal:', newServices);
    
    handleInputChange('services', newServices);
  };

  const handleAddSubcategory = (subcategory: string) => {
    if (!profile || !subcategory.trim()) return;
    
    // Create a new subcategories array, handling the case where it might be undefined
    const existingSubcategories = Array.isArray(profile.Business_Subcategories) ? profile.Business_Subcategories : [];
    
    // Check if subcategory already exists
    if (existingSubcategories.includes(subcategory.trim())) return;
    
    const newSubcategories = [...existingSubcategories, subcategory.trim()];
    
    console.log('Adding subcategory:', subcategory.trim());
    console.log('New subcategories array:', newSubcategories);
    
    handleInputChange('Business_Subcategories', newSubcategories);
    setNewSubcategory('');
  };

  const handleRemoveSubcategory = (index: number) => {
    if (!profile) return;
    
    // Handle the case where subcategories might be undefined
    const existingSubcategories = Array.isArray(profile.Business_Subcategories) ? profile.Business_Subcategories : [];
    const newSubcategories = existingSubcategories.filter((_, i) => i !== index);
    
    console.log('Removing subcategory at index:', index);
    console.log('New subcategories array after removal:', newSubcategories);
    
    handleInputChange('Business_Subcategories', newSubcategories);
  };

  const handleAddFAQ = () => {
    if (!profile || !newFAQ.question.trim() || !newFAQ.answer.trim()) return;
    
    console.log('Adding new FAQ:', newFAQ);
    console.log('Current FAQs:', profile.faqs);
    
    const newFAQs = [...(profile.faqs || []), { 
      question: newFAQ.question.trim(), 
      answer: newFAQ.answer.trim() 
    }];
    
    console.log('Updated FAQs array:', newFAQs);
    handleInputChange('faqs', newFAQs);
    setNewFAQ({ question: '', answer: '' });
  };

  const handleRemoveFAQ = (index: number) => {
    if (!profile) return;
    
    console.log('Removing FAQ at index:', index);
    console.log('Current FAQs before removal:', profile.faqs);
    
    const newFAQs = profile.faqs?.filter((_, i) => i !== index) || [];
    
    console.log('Updated FAQs array after removal:', newFAQs);
    handleInputChange('faqs', newFAQs);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !profile) return;

    const file = files[0];
    console.log('Selected file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingImage(true);
      console.log('Creating FormData...');
      const formData = new FormData();
      formData.append('image', file);

      // Fetch CSRF token
      const csrfResponse = await fetch('/api/csrf');
      const { csrfToken } = await csrfResponse.json();

      console.log('Sending request to upload image...');
      const response = await fetch('/api/business/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${businessAuth.getToken()}`,
          'X-CSRF-Token': csrfToken
        },
        body: formData
      });

      console.log('Upload response status:', response.status);
      const data = await response.json();
      console.log('Upload response data:', data);

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to upload image');
      }

      // Update the profile state directly
      setProfile(prevProfile => {
        if (!prevProfile) return null;
        const newImage: BusinessImage = {
          access: 'public',
          path: data.url,
          name: file.name,
          type: file.type,
          size: file.size,
          mime: file.type,
          meta: {
            width: 0,
            height: 0
          },
          url: data.url
        };
        return {
          ...prevProfile,
          images: [...prevProfile.images, newImage]
        };
      });
      setHasChanges(true);

      toast({
        title: '✨ Image Uploaded',
        description: 'Your business image has been uploaded successfully.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
      // Clear the input value to allow uploading the same file again
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    if (!profile) return;

    try {
      // Fetch CSRF token
      const csrfResponse = await fetch('/api/csrf');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/business/remove-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessAuth.getToken()}`,
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ imageUrl })
      });

      console.log('Remove image response:', await response.json());

      if (!response.ok) {
        throw new Error('Failed to remove image');
      }

      // Update the profile state directly
      setProfile(prevProfile => {
        if (!prevProfile) return null;
        return {
          ...prevProfile,
          images: prevProfile.images.filter(img => img.url !== imageUrl)
        };
      });
      setHasChanges(true);

      toast({
        title: 'Image Removed',
        description: 'The image has been removed successfully.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddressSelect = async (address: {
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
  }) => {
    if (!profile) return;

    try {
      setIsSaving(true);
      console.log('Address selected:', address);

      // First update the profile state
      const updatedProfile = {
        ...profile,
        address: address.street_address,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code.padStart(5, '0')
      };
      setProfile(updatedProfile);

      // Get coordinates from Google Maps API
      const geocodeResponse = await fetch(`/api/geocode?address=${encodeURIComponent(
        `${address.street_address}, ${address.city}, ${address.state} ${address.zip_code}`
      )}`);

      if (!geocodeResponse.ok) {
        throw new Error('Failed to geocode address');
      }

      const { latitude, longitude } = await geocodeResponse.json();
      console.log('Geocoding result:', { latitude, longitude });

      // Create the update data with new coordinates
      const updateData: BusinessUpdateData = {
        business_name: updatedProfile.business_name,
        email: updatedProfile.email,
        phone: Number(updatedProfile.phone),
        address: updatedProfile.address,
        city: updatedProfile.city,
        state: updatedProfile.state,
        zip_code: updatedProfile.zip_code,
        Website: updatedProfile.Website,
        description: updatedProfile.description,
        Business_Category: updatedProfile.Business_Category,
        Business_Subcategories: updatedProfile.Business_Subcategories,
        business_features: updatedProfile.business_features,
        services: profile.services || [], // Include the services array
        faqs: profile.faqs || [], // Include faqs directly in the update
        latitude: latitude,
        longitude: longitude,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        years_in_business: updatedProfile.years_in_business,
        unique_id: updatedProfile.unique_id
      };

      console.log('Address select update data with services:', profile.services);
      
      // Update the business profile
      const updateResponse = await businessAuth.updateProfile(updateData);
      console.log('Address update response:', updateResponse);

      // Update the local state with new coordinates
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          latitude: latitude,
          longitude: longitude,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          years_in_business: updatedProfile.years_in_business
        };
      });

      setHasChanges(false);
      toast({
        title: '📍 Address Updated',
        description: 'Your business location has been updated.',
        duration: 3000,
      });

    } catch (error) {
      console.error('Error updating address:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update business location.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle browser back navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">Failed to load profile. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="container max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500 mobile-container">
      {/* Floating Save Button for Mobile */}
      {isMobile && hasChanges && showFloatingSave && (
        <Button 
          onClick={handleSubmit} 
          disabled={isSaving}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all duration-300 mobile-floating-save"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      )}
      
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-violet-50 opacity-70 rounded-xl -z-10"></div>
        <div className={`px-8 py-10 flex flex-col md:flex-row items-start md:items-center gap-6 ${isMobile ? 'mobile-header' : ''}`}>
          <div className="p-4 bg-white rounded-full shadow-sm">
            <Building2 className="w-10 h-10 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className={`flex items-center gap-3 ${isMobile ? 'flex-col' : ''}`}>
              <h1 className="text-3xl font-bold tracking-tight">{profile.business_name}</h1>
              {hasChanges && (
                <div className={`flex-shrink-0 ${isMobile ? 'mobile-save-button' : ''}`}>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all duration-300"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Manage your business profile information. Your profile helps customers find and learn about your business.
            </p>
          </div>
        </div>
      </div>

      <Tabs 
        defaultValue="basic" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className={`space-y-6 ${!isMobile ? 'profile-tabs' : ''}`}
        data-state={activeTab}
      >
        <TabsList className={`grid w-full grid-cols-4 ${isMobile ? 'mobile-tabs-list' : 'profile-tabs-list'}`}>
          <TabsTrigger 
            value="basic" 
            className={`${isMobile ? 'mobile-tabs-list-item' : 'profile-tab-trigger'}`}
          >
            <div className={`flex ${isMobile ? '' : 'items-center'} gap-1.5`}>
              <Building2 className="h-4 w-4" />
              <span className="text-xs md:text-sm">Basic Info</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="location" 
            className={`${isMobile ? 'mobile-tabs-list-item' : 'profile-tab-trigger'}`}
          >
            <div className={`flex ${isMobile ? '' : 'items-center'} gap-1.5`}>
              <MapPin className="h-4 w-4" />
              <span className="text-xs md:text-sm">Location</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="additional" 
            className={`${isMobile ? 'mobile-tabs-list-item' : 'profile-tab-trigger'}`}
          >
            <div className={`flex ${isMobile ? '' : 'items-center'} gap-1.5`}>
              <FileText className="h-4 w-4" />
              <span className="text-xs md:text-sm">Details</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="images" 
            className={`${isMobile ? 'mobile-tabs-list-item' : 'profile-tab-trigger'}`}
          >
            <div className={`flex ${isMobile ? '' : 'items-center'} gap-1.5`}>
              <ImageIcon className="h-4 w-4" />
              <span className="text-xs md:text-sm">Images</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className={isMobile ? 'mobile-tab-content' : 'profile-tab-content'}>
          <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className={`p-6 space-y-6 ${isMobile ? 'mobile-card-content' : ''}`}>
              <div className={`grid gap-6 sm:grid-cols-2 ${isMobile ? 'mobile-form-grid' : ''}`}>
                <div className="space-y-2">
                  <Label htmlFor="business_name" className={`text-sm font-medium ${isMobile ? 'mobile-label' : ''}`}>Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                    <Input
                      id="business_name"
                      value={profile.business_name}
                      onChange={(e) => handleInputChange('business_name', e.target.value)}
                      className={`pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors ${isMobile ? 'mobile-input' : ''}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unique_id" className={`text-sm font-medium flex items-center gap-1 ${isMobile ? 'mobile-label' : ''}`}>
                    Username
                    <span className="text-xs text-gray-500">(used in your profile URL)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-blue-500 font-medium text-sm">@</span>
                    <Input
                      id="unique_id"
                      value={profile.unique_id || ''}
                      onChange={(e) => handleUniqueIdChange(e.target.value)}
                      className={`pl-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors ${
                        !isUniqueIdValid || (!uniqueIdAvailable && !checkingUniqueId)
                          ? 'border-red-500'
                          : checkingUniqueId
                          ? 'border-yellow-300 focus:ring-yellow-200'
                          : isUniqueIdValid && uniqueIdAvailable
                          ? 'border-green-500 focus:ring-green-200'
                          : 'border-gray-300'
                      } ${isMobile ? 'mobile-input' : ''}`}
                      placeholder="your-business-name"
                    />
                    {checkingUniqueId && (
                      <div className="absolute right-3 top-3">
                        <svg className="animate-spin h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  {validationError && (
                    <p className="text-xs text-red-500">{validationError}</p>
                  )}
                  {profile.unique_id && isUniqueIdValid && uniqueIdAvailable && !checkingUniqueId && (
                    <p className="text-xs text-green-600">
                      <span className="font-semibold">Available!</span> Your business page will be accessible at: <br/>
                      <span className="text-blue-600 font-medium">http://flintime.com/{profile.unique_id}</span>
                    </p>
                  )}
                  {similarUsernames && similarUsernames.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Similar usernames already taken:</p>
                      <ul className="text-sm text-gray-500 mt-1">
                        {similarUsernames.map((name, index) => (
                          <li key={index}>• {name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    This username will be used in your public profile URL. Choose something simple and memorable.
                    <br />
                    <span className="font-medium text-violet-600">Note:</span> Changing your username will update your profile URL.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className={`grid gap-6 sm:grid-cols-2 ${isMobile ? 'mobile-form-grid' : ''}`}>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', Number(e.target.value))}
                      className="pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Website" className="text-sm font-medium">Website (Optional)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                    <Input
                      id="Website"
                      type="url"
                      value={profile.Website || ''}
                      onChange={(e) => handleInputChange('Website', e.target.value)}
                      className="pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                      placeholder="https://"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className={`text-sm font-medium ${isMobile ? 'mobile-label' : ''}`}>Business Description</Label>
                <Textarea
                  id="description"
                  value={profile.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`min-h-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors ${isMobile ? 'mobile-textarea' : ''}`}
                  placeholder="Describe your business, services, and what makes you unique..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  A compelling description helps customers understand what your business offers and why they should choose you.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="location" className={isMobile ? 'mobile-tab-content' : 'profile-tab-content'}>
          <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className={`p-6 space-y-6 ${isMobile ? 'mobile-card-content' : ''}`}>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-green-500" />
                    <h3 className="font-medium">Business Location</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Your business address will be displayed to customers and used for mapping services.
                  </p>
                  <div className={isMobile ? 'mobile-address-autocomplete' : ''}>
                    <AddressAutocomplete
                      onAddressSelect={handleAddressSelect}
                      defaultValue={profile.address}
                    />
                  </div>
                </div>

                <div className={`grid gap-6 sm:grid-cols-3 ${isMobile ? 'mobile-form-grid' : ''}`}>
                  <div className="space-y-2">
                    <Label htmlFor="city" className={`text-sm font-medium ${isMobile ? 'mobile-label' : ''}`}>City</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors ${isMobile ? 'mobile-input' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className={`text-sm font-medium ${isMobile ? 'mobile-label' : ''}`}>State</Label>
                    <Select
                      value={profile.state}
                      onValueChange={(value) => handleInputChange('state', value)}
                    >
                      <SelectTrigger className={`border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors ${isMobile ? 'mobile-select' : ''}`}>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip_code" className={`text-sm font-medium ${isMobile ? 'mobile-label' : ''}`}>ZIP Code</Label>
                    <Input
                      id="zip_code"
                      value={profile.zip_code.padStart(5, '0')}
                      onChange={(e) => handleInputChange('zip_code', e.target.value)}
                      maxLength={5}
                      placeholder="Enter 5-digit ZIP code"
                      className={`border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors ${isMobile ? 'mobile-input' : ''}`}
                    />
                  </div>
                </div>
                
                {profile.latitude && profile.longitude && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100 mt-2">
                    <p className="text-sm text-green-800 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" /> 
                      Location coordinates saved: {profile.latitude.toFixed(6)}, {profile.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="additional" className={isMobile ? 'mobile-tab-content' : 'profile-tab-content'}>
          <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className={`p-6 space-y-8 ${isMobile ? 'mobile-card-content mobile-bottom-spacing' : ''}`}>
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-700 pb-2 border-b">
                <FileText className="h-5 w-5 text-violet-500" />
                <h2>Business Details</h2>
              </div>

              <div className="grid gap-8">
                <div className="space-y-3">
                  <Label htmlFor="category" className={`text-base font-medium flex items-center gap-1.5 ${isMobile ? 'mobile-label' : ''}`}>
                    <Tags className="h-4 w-4 text-violet-500" />
                    Business Category
                  </Label>
                  <Select
                    value={profile.Business_Category}
                    onValueChange={(value) => handleInputChange('Business_Category', value)}
                  >
                    <SelectTrigger id="category" className={`border-gray-300 focus:border-violet-500 focus:ring-violet-500 transition-colors ${isMobile ? 'mobile-select' : ''}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {profile.Business_Category && (
                  <div className="space-y-3">
                    <Label htmlFor="subcategories" className="text-base font-medium flex items-center gap-1.5">
                      <Tags className="h-4 w-4 text-violet-500" />
                      Business Subcategories
                    </Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.Business_Subcategories?.map((subcategory, index) => (
                          <div 
                            key={index} 
                            className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-sm flex items-center"
                          >
                            {subcategory}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveSubcategory(index)}
                              className="ml-2 text-violet-500 hover:text-violet-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {!profile.Business_Subcategories?.length && (
                          <p className="text-sm text-gray-500">No subcategories selected. Add subcategories to help customers find your business.</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Select
                          onValueChange={(value) => {
                            if (value) {
                              handleAddSubcategory(value);
                            }
                          }}
                        >
                          <SelectTrigger className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500">
                            <SelectValue placeholder="Select subcategories" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubcategories.map((subcategory) => (
                              <SelectItem 
                                key={subcategory} 
                                value={subcategory}
                                disabled={profile.Business_Subcategories?.includes(subcategory)}
                              >
                                {subcategory}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add custom subcategory"
                            value={newSubcategory}
                            onChange={(e) => setNewSubcategory(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubcategory(newSubcategory);
                              }
                            }}
                            className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleAddSubcategory(newSubcategory)}
                            className="border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                            disabled={!newSubcategory.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Select predefined subcategories or add your own custom ones to better describe your business services.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label htmlFor="years_in_business" className="text-base font-medium flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-violet-500" />
                    Year Established
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="years_in_business"
                      placeholder="Enter year (e.g., 2015)"
                      value={profile.years_in_business?.split(' (')?.[0] || ''}
                      onChange={(e) => handleInputChange('years_in_business', e.target.value)}
                      className="border-gray-300 focus:border-violet-500 focus:ring-violet-500 transition-colors"
                    />
                    
                    {profile.years_in_business && profile.years_in_business.includes('(') && (
                      <div className="bg-violet-50 border border-violet-100 rounded-md p-2">
                        <p className="text-sm text-violet-700 flex items-center">
                          <Clock className="h-4 w-4 mr-1.5" />
                          In business for {profile.years_in_business.split('(')[1].replace(')', '')}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter the year your business was established. The years in business will be calculated automatically.
                  </p>
                </div>

                {/* Business features section */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <Label htmlFor="features" className={`text-base font-medium flex items-center gap-1.5 ${isMobile ? 'mobile-label' : ''}`}>
                    <ListChecks className="h-4 w-4 text-violet-500" />
                    Business Features
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="features"
                      placeholder="e.g. Eco-friendly"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      className={`border-gray-300 focus:border-violet-500 focus:ring-violet-500 transition-colors ${isMobile ? 'mobile-input' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddFeature}
                      className={`border-violet-200 hover:bg-violet-50 hover:text-violet-700 ${isMobile ? 'mobile-add-button mobile-add-button-violet' : ''}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'mobile-features-section' : ''}`}>
                    {profile.business_features?.map((feature, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-1 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full transition-colors hover:bg-violet-100 ${isMobile ? 'mobile-feature-tag' : ''}`}
                      >
                        <span>{feature}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(index)}
                          className="hover:text-violet-900 h-4 w-4 rounded-full flex items-center justify-center"
                          aria-label={`Remove ${feature}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {!profile.business_features?.length && (
                      <p className="text-sm text-gray-500">No features added yet. Add what makes your business special.</p>
                    )}
                  </div>
                </div>

                {/* Services section */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <Label htmlFor="services" className={`text-base font-medium flex items-center gap-1.5 ${isMobile ? 'mobile-label' : ''}`}>
                    <Tags className="h-4 w-4 text-violet-500" />
                    Services Offered
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="services"
                      placeholder="e.g. Hair Styling"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddService();
                        }
                      }}
                      className={`border-gray-300 focus:border-violet-500 focus:ring-violet-500 transition-colors ${isMobile ? 'mobile-input' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddService}
                      className={`border-violet-200 hover:bg-violet-50 hover:text-violet-700 ${isMobile ? 'mobile-add-button mobile-add-button-violet' : ''}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className={`flex flex-wrap gap-2 mt-2 ${isMobile ? 'mobile-services-section' : ''}`}>
                    {profile.services?.map((service, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-1 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full transition-colors hover:bg-violet-100 ${isMobile ? 'mobile-service-tag' : ''}`}
                      >
                        <span>{service}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveService(index)}
                          className="hover:text-violet-900 h-4 w-4 rounded-full flex items-center justify-center"
                          aria-label={`Remove ${service}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {!profile.services?.length && (
                      <p className="text-sm text-gray-500">No services added yet. List the specific services your business offers.</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Adding specific services helps customers find your business when searching for those services.
                  </p>
                </div>

                {/* FAQs section */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <Label className="text-base font-medium flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                    Frequently Asked Questions
                  </Label>
                  
                  <div className={`space-y-4 bg-amber-50/50 p-4 rounded-lg border border-amber-100 ${isMobile ? 'mobile-faq-container' : ''}`}>
                    <div className="space-y-2">
                      <Label htmlFor="faq-question" className={`text-sm font-medium ${isMobile ? 'mobile-label' : ''}`}>Question</Label>
                      <Input
                        id="faq-question"
                        placeholder="e.g. What are your business hours?"
                        value={newFAQ.question}
                        onChange={(e) => setNewFAQ({...newFAQ, question: e.target.value})}
                        className={`border-gray-300 focus:border-amber-500 focus:ring-amber-500 transition-colors ${isMobile ? 'mobile-input' : ''}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faq-answer" className={`text-sm font-medium ${isMobile ? 'mobile-label' : ''}`}>Answer</Label>
                      <Textarea
                        id="faq-answer"
                        placeholder="e.g. We are open Monday to Friday from 9am to 5pm."
                        value={newFAQ.answer}
                        onChange={(e) => setNewFAQ({...newFAQ, answer: e.target.value})}
                        className={`min-h-[80px] border-gray-300 focus:border-amber-500 focus:ring-amber-500 transition-colors ${isMobile ? 'mobile-textarea' : ''}`}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddFAQ}
                      disabled={!newFAQ.question.trim() || !newFAQ.answer.trim()}
                      className={`bg-amber-500 hover:bg-amber-600 text-white ${isMobile ? 'mobile-full-width-button' : ''}`}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add FAQ
                    </Button>
                  </div>
                  
                  {profile.faqs && profile.faqs.length > 0 ? (
                    (() => {
                      console.log('Rendering FAQs from profile.faqs:', profile.faqs);
                      return (
                        <div className="space-y-4 mt-4">
                          {profile.faqs.map((faq, index) => (
                            <div key={index} className={`bg-white rounded-lg border border-amber-200 p-4 hover:shadow-sm transition-shadow ${isMobile ? 'mobile-faq-item' : ''}`}>
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-gray-900">{faq.question}</h4>
                                  <p className="text-gray-600">{faq.answer}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFAQ(index)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-gray-500">No FAQs added yet. Address common questions your customers might have.</p>
                  )}
                  <p className="text-xs text-gray-500">
                    FAQs can help reduce customer inquiries and provide important information upfront.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="images" className={isMobile ? 'mobile-tab-content' : 'profile-tab-content'}>
          <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className={`p-6 space-y-6 ${isMobile ? 'mobile-card-content mobile-bottom-spacing' : ''}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'mobile-image-upload' : ''}`}>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-amber-600" />
                  <h2 className="text-lg font-semibold">Business Images</h2>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImage}
                    variant="outline"
                    className={`border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors ${isMobile ? 'mobile-full-width-button' : ''}`}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Image
                      </>
                    )}
                  </Button>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {profile.images.length > 0 ? (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${isMobile ? 'mobile-image-grid' : ''}`}>
                  {profile.images.map((image, index) => (
                    <div key={index} className={`relative group overflow-hidden rounded-lg shadow-sm transition-all duration-300 hover:shadow-md ${isMobile ? 'mobile-image-container' : ''}`}>
                      <ImagePreviewModal 
                        image={image} 
                        onRemove={handleRemoveImage}
                        allImages={profile.images}
                        currentIndex={index}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveImage(image.url)}
                          className="bg-red-500/90 hover:bg-red-500"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <ImageIcon className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-700">No images uploaded yet</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                    Upload photos of your business to attract customers. High-quality images of your storefront, products, or services help customers know what to expect.
                  </p>
                  <Button
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="mt-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition-all duration-300"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Your First Image
                  </Button>
                  
                  <div className="bg-violet-50 p-3 rounded-lg border border-violet-100 flex items-center gap-2 mt-4 mx-auto max-w-md">
                    <div className="p-1 bg-violet-100 rounded-full">
                      <Shield className="h-4 w-4 text-violet-600" />
                    </div>
                    <p className="text-sm text-violet-800">
                      By uploading content, you acknowledge Flintime's <a href="/intellectual-property" className="text-violet-600 font-semibold hover:underline" target="_blank" rel="noopener noreferrer">Intellectual Property Disclosure</a>.
                    </p>
                  </div>
                </div>
              )}
              
              {profile.images.length > 0 && (
                <div className="space-y-2">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
                    <div className="p-1 bg-amber-100 rounded-full">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="text-sm text-amber-800">
                      Images should be high quality and represent your business professionally. Maximum file size is 5MB per image.
                    </p>
                  </div>
                  
                  <div className="bg-violet-50 p-3 rounded-lg border border-violet-100 flex items-center gap-2">
                    <div className="p-1 bg-violet-100 rounded-full">
                      <Shield className="h-4 w-4 text-violet-600" />
                    </div>
                    <p className="text-sm text-violet-800">
                      By uploading content, you acknowledge Flintime's <a href="/intellectual-property" className="text-violet-600 font-semibold hover:underline" target="_blank" rel="noopener noreferrer">Intellectual Property Disclosure</a>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}