'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, Check, X, CheckCircle, XCircle } from 'lucide-react'
import { businessAuth } from '@/lib/businessAuth'
import { AddressAutocomplete } from '@/app/components/address-autocomplete'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

declare global {
  interface Window {
    Stripe?: any;
  }
}

const PASSWORD_MIN_LENGTH = 8

// Business categories
const BUSINESS_CATEGORIES = [
  'Home Services',
  'Beauty & Personal Services',
  'Pet Care',
  'Auto Services'
] as const;

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
    'Eyelash Extensions',
    'Tattoo',
    'Piercing'
  ],
  'Pet Care': [
    'Grooming',
    'Boarding',
    'Daycare',
    'Walking',
    'Training',
    'Veterinary',
    'Pet Sitting'
  ],
  'Auto Services': [
    'Repair',
    'Maintenance',
    'Detailing',
    'Oil Change',
    'Tire Service',
    'Car Wash',
    'Paint & Body Work',
    'Window Tinting',
    'Mobile Mechanic'
  ]
};

// Add geocoding function
async function geocodeAddress(address: string, city: string, state: string, zip_code: string) {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is missing');
  }

  const fullAddress = `${address}, ${city}, ${state} ${zip_code}, USA`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'REQUEST_DENIED') {
    throw new Error('Geocoding request denied. Please check API key configuration.');
  }
  
  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry.location;
  
  return { latitude: lat, longitude: lng };
}

interface BusinessHours {
  monday: { open: string; close: string };
  tuesday: { open: string; close: string };
  wednesday: { open: string; close: string };
  thursday: { open: string; close: string };
  friday: { open: string; close: string };
  saturday: { open: string; close: string };
  sunday: { open: string; close: string };
}

// Add Stripe script dynamically
const StripeScript = () => {
  useEffect(() => {
    // Add Stripe.js script if it doesn't exist
    if (!window.Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return null;
};

export default function BusinessSignUp() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [acknowledgeAI, setAcknowledgeAI] = useState(false)
  const [formData, setFormData] = useState({
    business_name: '',
    unique_id: '',
    owner_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    Website: '',
    description: '',
    Business_Category: '',
    Business_Subcategories: [] as string[],
    latitude: 0,
    longitude: 0
  })

  // Password validation states
  const [passwordFocused, setPasswordFocused] = useState(false)
  const passwordValidation = {
    minLength: formData.password.length >= PASSWORD_MIN_LENGTH,
    hasNumber: /\d/.test(formData.password),
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  }

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)
  const passwordsMatch = formData.password === formData.confirmPassword

  // Add these state variables along with the other states
  const [uniqueIdFocused, setUniqueIdFocused] = useState(false)
  const uniqueIdValidation = {
    format: /^[a-z0-9_.]{3,30}$/.test(formData.unique_id),
    minLength: formData.unique_id.length >= 3,
    maxLength: formData.unique_id.length <= 30,
    validChars: /^[a-z0-9_.]*$/.test(formData.unique_id)
  }
  const isUniqueIdValid = Object.values(uniqueIdValidation).every(Boolean)

  // Add new state variables for unique ID checking
  const [checkingUniqueId, setCheckingUniqueId] = useState(false)
  const [uniqueIdAvailable, setUniqueIdAvailable] = useState<boolean | null>(null)
  const [uniqueIdChecked, setUniqueIdChecked] = useState(false)
  const uniqueIdTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add state for custom subcategory input
  const [newSubcategory, setNewSubcategory] = useState('')

  // Function to add a new subcategory
  const addSubcategory = (subcategory: string) => {
    if (!subcategory || formData.Business_Subcategories.includes(subcategory)) return;
    
    setFormData({
      ...formData,
      Business_Subcategories: [...formData.Business_Subcategories, subcategory]
    });
    setNewSubcategory('');
  }
  
  // Function to remove a subcategory
  const removeSubcategory = (subcategory: string) => {
    setFormData({
      ...formData,
      Business_Subcategories: formData.Business_Subcategories.filter(sub => sub !== subcategory)
    });
  }
  
  // Get available subcategories based on selected category
  const availableSubcategories = formData.Business_Category ? 
    BUSINESS_SUBCATEGORIES[formData.Business_Category] || [] : [];

  const handleAddressSelect = async (address: {
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
  }) => {
    try {
      // First update the address fields
      setFormData(prev => ({
        ...prev,
        address: address.street_address,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code
      }));

      // Then geocode the address
      const { latitude, longitude } = await geocodeAddress(
        address.street_address,
        address.city,
        address.state,
        address.zip_code
      );

      // Update the latitude and longitude fields
      setFormData(prev => ({
        ...prev,
        latitude: latitude,
        longitude: longitude
      }));
    } catch (error) {
      console.error('Error geocoding address:', error);
      setError('Failed to validate address. Please ensure the address is correct.');
    }
  }

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '')
    
    // Format the number as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value)
    setFormData(prev => ({ ...prev, phone: formattedPhone }))
  }

  // Add function to check unique ID availability with debouncing
  const checkUniqueIdAvailability = async (id: string) => {
    if (!id || id.length < 3 || !isUniqueIdValid) {
      setUniqueIdAvailable(null)
      setUniqueIdChecked(false)
      return
    }

    setCheckingUniqueId(true)
    
    try {
      const available = await businessAuth.checkUniqueIdAvailability(id)
      
      // Handle the case when the API returns null (error case)
      if (available === null) {
        setUniqueIdAvailable(null)
        setUniqueIdChecked(false)
        console.log("Username availability check failed, will try again on form submission")
        // Don't show an error to the user, just quietly fail and let form submission handle it
      } else {
        setUniqueIdAvailable(available)
        setUniqueIdChecked(true)
      }
    } catch (error) {
      console.error('Error checking unique ID availability:', error)
      // Don't block signup if the availability check fails
      // The server will still validate uniqueness during signup
      console.warn('Could not verify username availability due to an error, proceeding with signup');
    } finally {
      setCheckingUniqueId(false)
    }
  }

  // Debounce the unique ID check
  const handleUniqueIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase()
    setFormData({ ...formData, unique_id: value })
    
    // Clear any existing timeout
    if (uniqueIdTimeoutRef.current) {
      clearTimeout(uniqueIdTimeoutRef.current)
    }
    
    // If empty or too short, reset availability
    if (!value || value.length < 3) {
      setUniqueIdAvailable(null)
      setUniqueIdChecked(false)
      return
    }
    
    // Set a new timeout to check availability after typing stops
    uniqueIdTimeoutRef.current = setTimeout(() => {
      // Only check if format is valid
      if (/^[a-z0-9_.]{3,30}$/.test(value)) {
        checkUniqueIdAvailability(value)
      }
    }, 500) // 500ms debounce
  }

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (uniqueIdTimeoutRef.current) {
        clearTimeout(uniqueIdTimeoutRef.current)
      }
    }
  }, [])

  // Check if username is available and valid during form submission
  const validateUsernameForSubmission = async (username: string) => {
    try {
      setCheckingUniqueId(true);
      const response = await fetch(`/api/business/auth/check-unique-id?uniqueId=${encodeURIComponent(username.trim())}`, {
        method: 'GET',
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        setError('Could not verify username availability. Please try a different one.');
        setUniqueIdAvailable(false);
        setCheckingUniqueId(false);
        return false;
      }
      
      const data = await response.json();
      console.log('Username validation response:', data);
      
      // Handle temporary validation errors
      if (data.error && data.temporary) {
        setError(`${data.error} Please try a different username.`);
        setUniqueIdAvailable(false);
        setCheckingUniqueId(false);
        return false;
      }
      
      if (!data.available) {
        setError('This username is already taken. Please choose another one.');
        setUniqueIdAvailable(false);
        setCheckingUniqueId(false);
        return false;
      }
      
      setUniqueIdAvailable(true);
      setError('');
      setCheckingUniqueId(false);
      return true;
      
    } catch (error) {
      console.error('Error checking username availability:', error);
      setError('Could not verify username. Please try a different one.');
      setUniqueIdAvailable(false);
      setCheckingUniqueId(false);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate required fields before submission
      if (!formData.business_name) {
        throw new Error('Business name is required');
      }
      
      if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
        throw new Error('Valid email is required');
      }
      
      // Generate a unique_id if it's empty
      let uniqueId = formData.unique_id ? formData.unique_id.toLowerCase().trim() : '';
      if (!uniqueId) {
        // Generate a unique ID based on business name and timestamp
        const businessNameSlug = formData.business_name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 20);
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 10);
        uniqueId = `${businessNameSlug}-${timestamp}-${randomString}`;
        console.log('Generated unique_id from business name:', uniqueId);
      }
      
      // Prepare business data
      const businessData = {
        business_name: formData.business_name,
        unique_id: uniqueId,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        Website: formData.Website || '',
        description: formData.description || '',
        Business_Category: formData.Business_Category,
        Business_Subcategories: formData.Business_Subcategories,
        latitude: formData.latitude,
        longitude: formData.longitude,
        agreeToTerms: agreeToTerms,
        acknowledgeAI: acknowledgeAI
      };
      
      // Log the businessData for debugging
      console.log('Sending business data:', { 
        ...businessData, 
        password: '[REDACTED]' 
      });
      
      // Save form data to localStorage as backup
      localStorage.setItem('pendingBusinessData', JSON.stringify(businessData));

      // First register the business in the database
      const registerResponse = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessData),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Failed to register business');
      }

      const registerResult = await registerResponse.json();
      console.log('Business registration successful:', registerResult);
      
      // Now create checkout session with the businessId
      const checkoutResponse = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: registerResult.businessId,
          businessEmail: registerResult.businessEmail
        }),
      });

      if (!checkoutResponse.ok) {
        const error = await checkoutResponse.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await checkoutResponse.json();
      setIsSuccess(true);
      
      // Redirect to Stripe Checkout after a brief delay
      setTimeout(() => {
        window.location.href = url;
      }, 2000);

    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  // Add localStorage persistence check when component mounts
  useEffect(() => {
    // Check if we have pending business data that might need to be restored
    const pendingData = localStorage.getItem('pendingBusinessSignup');
    const backupData = localStorage.getItem('pendingBusinessSignupBackup');
    
    // If we have backup data but no primary data, restore from backup
    if (!pendingData && backupData) {
      try {
        console.log('Attempting to restore business data from backup');
        const parsedBackup = JSON.parse(backupData);
        
        // Check if backup is less than 24 hours old
        const backupTime = new Date(parsedBackup.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - backupTime.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          // Remove the timestamp field before saving
          const { timestamp, ...dataWithoutTimestamp } = parsedBackup;
          
          // Restore the primary data
          localStorage.setItem('pendingBusinessSignup', JSON.stringify(dataWithoutTimestamp));
          console.log('Restored business data from backup');
        } else {
          console.log('Backup data is too old (>24hrs), not restoring');
          localStorage.removeItem('pendingBusinessSignupBackup');
        }
      } catch (error) {
        console.error('Error restoring from backup:', error);
      }
    }
  }, []);

  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className="flex items-center space-x-2 text-sm">
      {isValid ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-gray-300" />
      )}
      <span className={isValid ? 'text-green-500' : 'text-gray-500'}>{text}</span>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-violet-50 via-white to-violet-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background AI Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-200 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e5,#7c3aed,#4f46e5)] opacity-10"></div>
      </div>

      <div className="w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
        {/* Left Side - Business Benefits */}
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-medium">
              Powered by AI
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent">
              Grow Your Business with Flintime
            </h1>
            <p className="text-gray-600 text-lg">
              Join thousands of businesses leveraging AI to reach more customers and boost revenue
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Customizable AI Assistant</h3>
                <p className="text-gray-600 mt-1">Let our AI handle customer inquiries 24/7, providing instant responses and booking assistance while you focus on your business.</p>
                <div className="mt-2 text-sm text-violet-600">
                  • Fully customizable to your business
                  <br />
                  • Easy service and pricing updates
                  <br />
                  • Multi-language support
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Search & Discovery</h3>
                <p className="text-gray-600 mt-1">Our AI-powered search helps customers find your services instantly, understanding natural language queries and matching them to your offerings.</p>
                <div className="mt-2 text-sm text-violet-600">
                  • Semantic search capabilities
                  <br />
                  • Personalized recommendations
                  <br />
                  • Location-based matching
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Intelligent Analytics</h3>
                <p className="text-gray-600 mt-1">Get insights into customer behavior, popular services, and booking patterns to optimize your business operations.</p>
                <div className="mt-2 text-sm text-violet-600">
                  • Real-time performance metrics
                  <br />
                  • Predictive analytics
                  <br />
                  • Customer sentiment analysis
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">24/7 Customer Support</h3>
                <p className="text-gray-600 mt-1">Our AI handles customer inquiries around the clock, ensuring you never miss a potential booking or customer question.</p>
                <div className="mt-2 text-sm text-violet-600">
                  • Instant response times
                  <br />
                  • Automated issue resolution
                  <br />
                  • Seamless handoff to human support
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Automated Booking</h3>
                <p className="text-gray-600 mt-1">Let our AI handle appointment scheduling, availability checks, and booking confirmations automatically.</p>
                <div className="mt-2 text-sm text-violet-600">
                  • Smart scheduling
                  <br />
                  • Automated reminders
                  <br />
                  • Real-time availability updates
                </div>
              </div>
            </div>
          </div>

          {/* AI Demo Section */}
          <div className="mt-8 bg-white rounded-xl shadow-lg border border-violet-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">See Our AI in Action</h3>
            </div>
            
            {/* Scrollable Chat Container */}
            <div className="h-[400px] overflow-y-auto p-4" style={{ scrollBehavior: 'smooth' }}>
              <div className="space-y-4">
                {/* Customer Message */}
                <div className="flex items-start justify-end space-x-3">
                  <div className="flex-1 bg-violet-500 rounded-lg p-3 ml-12">
                    <p className="text-sm text-white">Hi, my kitchen sink is leaking badly and water is spreading on the floor. How soon can someone come?</p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-violet-700">C</span>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-violet-600">AI</span>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3 mr-12">
                    <p className="text-sm text-gray-700">I understand this is an urgent situation. I can have a licensed plumber at your location within 1-2 hours. First, please confirm:</p>
                    <div className="mt-2 space-y-1 border-l-2 border-violet-200 pl-3">
                      <p className="text-sm text-gray-700">• Have you turned off the water supply under the sink?</p>
                      <p className="text-sm text-gray-700">• Is there any visible damage to the pipes?</p>
                      <p className="text-sm text-gray-700">• How long has it been leaking?</p>
                    </div>
                  </div>
                </div>

                {/* Customer Message */}
                <div className="flex items-start justify-end space-x-3">
                  <div className="flex-1 bg-violet-500 rounded-lg p-3 ml-12">
                    <p className="text-sm text-white">Yes, I've turned off the water. The pipe under the sink has a crack, and it started leaking about an hour ago. How much will it cost to fix?</p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-violet-700">C</span>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-violet-600">AI</span>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3 mr-12">
                    <p className="text-sm text-gray-700">Based on your description, here's an estimated breakdown:</p>
                    <div className="mt-2 space-y-1 border-l-2 border-violet-200 pl-3">
                      <p className="text-sm text-gray-700">• Emergency Service Call: $89</p>
                      <p className="text-sm text-gray-700">• Pipe Repair/Replacement: $150-$200</p>
                      <p className="text-sm text-gray-700">• Estimated Time: 1-2 hours</p>
                      <p className="text-sm text-gray-700">• Total Estimate: $239-$289</p>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">The final cost may vary depending on the extent of damage. Would you like me to schedule an emergency appointment now?</p>
                  </div>
                </div>

                {/* Customer Message */}
                <div className="flex items-start justify-end space-x-3">
                  <div className="flex-1 bg-violet-500 rounded-lg p-3 ml-12">
                    <p className="text-sm text-white">Yes, please send someone as soon as possible. Do you take credit cards?</p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-violet-700">C</span>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-violet-600">AI</span>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3 mr-12">
                    <p className="text-sm text-gray-700">I've scheduled an emergency service for you:</p>
                    <div className="mt-2 space-y-1 border-l-2 border-violet-200 pl-3">
                      <p className="text-sm text-gray-700">• Plumber: Mike Johnson (Licensed & Insured)</p>
                      <p className="text-sm text-gray-700">• Arrival Time: Within 1 hour (by 2:30 PM)</p>
                      <p className="text-sm text-gray-700">• Service: Emergency Pipe Repair</p>
                      <p className="text-sm text-gray-700">• Payment: We accept all major credit cards, cash, or digital payment</p>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">You'll receive a text with the plumber's details and tracking link. Mike will call you 10 minutes before arrival. Need anything else in the meantime?</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <p className="text-sm text-violet-600 font-medium text-center">Your AI assistant handles emergency services, estimates, and customer support 24/7</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-600">
                Join <span className="font-semibold text-violet-600">thousands of businesses</span> already growing with Flintime
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <CardContent className="p-6">
                {isSuccess ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-gray-900">Almost there!</h3>
                      <p className="text-gray-600">
                        You're being redirected to our payment page to complete your business account setup.
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Your account will be created once payment is successful.
                      </p>
                      <p className="text-sm text-violet-600 font-medium">
                        Please wait while we redirect you to our secure payment page...
                      </p>
                    </div>
                    <div className="animate-spin h-5 w-5 border-2 border-violet-600 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : (
                  <>
                  {error && (
                    <Alert variant="destructive" className="border-0 bg-red-50 text-red-700">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name" className="text-sm font-medium text-gray-700">
                        Business Name
                      </Label>
                      <Input
                        id="business_name"
                        placeholder="Your Business Name"
                        required
                        disabled={isLoading}
                        className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_name" className="text-sm font-medium text-gray-700">
                        Owner Name
                      </Label>
                      <Input
                        id="owner_name"
                        placeholder="Your Full Name"
                        required
                        disabled={isLoading}
                        className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                        value={formData.owner_name}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="unique_id" className="text-sm font-medium text-gray-700">
                        Business Username
                      </Label>
                      <span className="text-xs text-gray-500">This will be your unique handle (like Instagram)</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <Input
                        id="unique_id"
                        placeholder="your_business_name"
                        required
                        disabled={isLoading}
                        className={`h-11 pl-8 border-gray-200 focus:ring-violet-500 ${
                          formData.unique_id && !isUniqueIdValid 
                            ? 'border-red-300 focus:border-red-500'
                            : uniqueIdChecked && uniqueIdAvailable
                            ? 'border-green-300 focus:border-green-500'
                            : uniqueIdChecked && !uniqueIdAvailable
                            ? 'border-red-300 focus:border-red-500'
                            : 'focus:border-violet-500'
                        }`}
                        value={formData.unique_id}
                        onChange={handleUniqueIdChange}
                        onFocus={() => setUniqueIdFocused(true)}
                        onBlur={() => setUniqueIdFocused(false)}
                      />
                      {formData.unique_id && formData.unique_id.length >= 3 && isUniqueIdValid && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {checkingUniqueId ? (
                            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                          ) : uniqueIdChecked && uniqueIdAvailable ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : uniqueIdChecked && !uniqueIdAvailable ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="text-gray-500">
                        3-30 characters, lowercase letters, numbers, dots, and underscores only
                      </p>
                      {formData.unique_id && uniqueIdChecked && !uniqueIdAvailable && (
                        <p className="text-red-600 font-medium">
                          This username is already taken
                        </p>
                      )}
                      {formData.unique_id && uniqueIdChecked && uniqueIdAvailable && (
                        <p className="text-green-600 font-medium">
                          Username is available
                        </p>
                      )}
                    </div>
                    
                    {(uniqueIdFocused || formData.unique_id) && !isUniqueIdValid && (
                      <div className="space-y-1 text-sm bg-red-50 p-3 rounded-lg text-red-600">
                        {!uniqueIdValidation.minLength && <p>• Username must be at least 3 characters</p>}
                        {!uniqueIdValidation.maxLength && <p>• Username cannot exceed 30 characters</p>}
                        {!uniqueIdValidation.validChars && <p>• Only lowercase letters, numbers, dots, and underscores allowed</p>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        required
                        disabled={isLoading}
                        className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 555-5555"
                        required
                        disabled={isLoading}
                        className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="Business_Category" className="text-sm font-medium text-gray-700">
                      Business Category
                    </Label>
                    <Select
                      value={formData.Business_Category}
                      onValueChange={(value) => setFormData({ ...formData, Business_Category: value, Business_Subcategories: [] })}
                    >
                      <SelectTrigger className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500">
                        <SelectValue placeholder="Select your business category" />
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

                  {formData.Business_Category && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="Business_Subcategories" className="text-sm font-medium text-gray-700">
                          Business Subcategories (Optional)
                        </Label>
                        <span className="text-xs text-gray-500">Select or add your own</span>
                      </div>
                      
                      {/* Selected subcategories */}
                      {formData.Business_Subcategories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {formData.Business_Subcategories.map((subcategory) => (
                            <div 
                              key={subcategory} 
                              className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-sm flex items-center"
                            >
                              {subcategory}
                              <button 
                                type="button" 
                                onClick={() => removeSubcategory(subcategory)}
                                className="ml-2 text-violet-500 hover:text-violet-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Subcategory selector */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Select
                          onValueChange={(value) => {
                            if (value && !formData.Business_Subcategories.includes(value)) {
                              addSubcategory(value);
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
                                disabled={formData.Business_Subcategories.includes(subcategory)}
                              >
                                {subcategory}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Custom subcategory input */}
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add custom subcategory"
                            value={newSubcategory}
                            onChange={(e) => setNewSubcategory(e.target.value)}
                            className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newSubcategory.trim()) {
                                e.preventDefault();
                                addSubcategory(newSubcategory.trim());
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 px-3 border-gray-200 hover:bg-violet-50 hover:text-violet-700"
                            onClick={() => {
                              if (newSubcategory.trim()) {
                                addSubcategory(newSubcategory.trim());
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Help customers find your business by selecting relevant subcategories
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                      Business Address
                    </Label>
                    <AddressAutocomplete
                      onAddressSelect={handleAddressSelect}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="Website" className="text-sm font-medium text-gray-700">
                      Website (Optional)
                    </Label>
                    <Input
                      id="Website"
                      placeholder="www.example.com"
                      disabled={isLoading}
                      className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                      value={formData.Website}
                      onChange={(e) => setFormData({ ...formData, Website: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Business Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Tell us about your business..."
                      required
                      disabled={isLoading}
                      className="min-h-[100px] border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          disabled={isLoading}
                          className="h-11 pr-10 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-violet-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        disabled={isLoading}
                        className="h-11 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </div>

                    {(passwordFocused || formData.password) && (
                      <div className="space-y-2 text-sm bg-violet-50 p-4 rounded-lg">
                        <ValidationItem isValid={passwordValidation.minLength} text="At least 8 characters" />
                        <ValidationItem isValid={passwordValidation.hasNumber} text="Contains at least one number" />
                        <ValidationItem isValid={passwordValidation.hasUppercase} text="Contains at least one uppercase letter" />
                        <ValidationItem isValid={passwordValidation.hasLowercase} text="Contains at least one lowercase letter" />
                        <ValidationItem isValid={passwordValidation.hasSpecialChar} text="Contains at least one special character" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600">
                      I agree to the{' '}
                      <Link href="/terms" className="text-violet-600 hover:text-violet-700 hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-violet-600 hover:text-violet-700 hover:underline">
                        Privacy Policy
                      </Link>
                      {' '}and{' '}
                      <Link href="/refund-policy" className="text-violet-600 hover:text-violet-700 hover:underline">
                        Cancellation & Refund Policy
                      </Link>
                      {' '}and{' '}
                      <Link href="/cookie-policy" className="text-violet-600 hover:text-violet-700 hover:underline">
                        Cookie Policy
                      </Link>
                      {' '}and our{' '}
                      <Link href="/intellectual-property" className="text-violet-600 hover:text-violet-700 hover:underline">
                        Intellectual Property
                      </Link>
                      {' '}and{' '}
                      <Link href="/third-party-links" className="text-violet-600 hover:text-violet-700 hover:underline">
                        Third-Party Links
                      </Link>
                      {' '}and acknowledge Flintime's{' '}
                      <Link href="/disclaimer" className="text-violet-600 hover:text-violet-700 hover:underline">
                        Disclaimer and Limitation of Liability
                      </Link>
                      {' '}and our{' '}
                      <Link href="/accessibility" className="text-violet-600 hover:text-violet-700 hover:underline">
                        Accessibility
                      </Link> commitment
                    </Label>
                  </div>

                  {/* AI Acknowledgment */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="aiAcknowledgment"
                      checked={acknowledgeAI}
                      onChange={(e) => setAcknowledgeAI(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <Label htmlFor="aiAcknowledgment" className="text-sm text-gray-600">
                      I understand Flintime uses AI technology for interactions.{' '}
                      <Link href="/ai-transparency" className="text-violet-600 hover:text-violet-700 hover:underline" target="_blank">
                        Learn more.
                      </Link>
                    </Label>
                  </div>

                  {/* Subscription Card */}
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-6 border border-violet-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">Business Pro Plan</h3>
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-violet-600">$49.99</span>
                        <span className="text-gray-500 ml-1">/month</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-700">
                        <Check className="h-5 w-5 text-violet-600 mr-2" />
                        <div>
                          <span className="block">Customizable AI Assistant</span>
                          <span className="text-xs text-gray-500">Tailored to your business needs</span>
                        </div>
                      </div>
                      <div className="flex items-start text-gray-700">
                        <Check className="h-5 w-5 text-violet-600 mr-2 mt-0.5" />
                        <div>
                          <span className="block">Easy AI Configuration</span>
                          <span className="text-xs text-gray-500">Set your services, prices, and business rules</span>
                        </div>
                      </div>
                      <div className="flex items-start text-gray-700">
                        <Check className="h-5 w-5 text-violet-600 mr-2 mt-0.5" />
                        <div>
                          <span className="block">Smart Search & Discovery</span>
                          <span className="text-xs text-gray-500">Help customers find your services easily</span>
                        </div>
                      </div>
                      <div className="flex items-start text-gray-700">
                        <Check className="h-5 w-5 text-violet-600 mr-2 mt-0.5" />
                        <div>
                          <span className="block">Intelligent Analytics</span>
                          <span className="text-xs text-gray-500">Track and optimize your business performance</span>
                        </div>
                      </div>
                      <div className="flex items-start text-gray-700">
                        <Check className="h-5 w-5 text-violet-600 mr-2 mt-0.5" />
                        <div>
                          <span className="block">24/7 Customer Support</span>
                          <span className="text-xs text-gray-500">AI handles inquiries around the clock</span>
                        </div>
                      </div>
                      <div className="flex items-start text-gray-700">
                        <Check className="h-5 w-5 text-violet-600 mr-2 mt-0.5" />
                        <div>
                          <span className="block">Automated Booking System</span>
                          <span className="text-xs text-gray-500">Smart scheduling with real-time availability</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                        <p className="text-sm text-violet-700 font-medium">Your Business, Your AI</p>
                        <p className="text-xs text-violet-600 mt-1">Customize how the AI interacts with your customers. Update services, prices, policies, and business rules anytime through our easy-to-use dashboard.</p>
                      </div>
                      <p className="text-sm text-gray-600">Start your subscription today.</p>
                      <p className="text-xs text-gray-500">Credit card required. You'll be billed $49.99/month immediately.</p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-medium shadow-lg shadow-violet-500/20 transition-all duration-200"
                    disabled={isLoading || !agreeToTerms || !acknowledgeAI}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                  </>
                )}
              </CardContent>
            </form>
          </Card>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/business/signin" className="text-violet-600 hover:text-violet-700 hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

