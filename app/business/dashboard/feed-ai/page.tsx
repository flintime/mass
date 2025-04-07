'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Upload,
  CheckCircle,
  Brain,
  Edit3,
  RotateCcw,
  Zap,
  Trash2,
  Tag,
  HelpCircle,
  Wallet,
  Banknote,
  CreditCard,
  Globe,
  Store,
  Clock,
  Loader2
} from 'lucide-react';
import { businessAuth } from '@/lib/businessAuth';
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import useMobileDetect from '@/hooks/useMobileDetect';
import './mobile.css';
import { fetchCsrfToken } from "@/lib/client/csrf";

interface BusinessData {
  services: Service[];
  promotions: Promotion[];
  faqs: FAQ[];
  paymentMethods: PaymentMethod[];
  customResponses: CustomResponse[];
  businessHours?: BusinessHours;
}

interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

interface Service {
  name: string;
  description?: string;
  price?: number;
  duration?: number;
}

interface Promotion {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isFirstTimeOnly: boolean;
  validUntil: string;
  isActive: boolean;
}

interface FAQ {
  question: string;
  answer: string;
}

interface PaymentMethod {
  type: 'cash' | 'card' | 'online';
  enabled: boolean;
  details: string;
}

interface CustomResponse {
  trigger: string;
  response: string;
  isActive: boolean;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { type: 'cash', enabled: true, details: 'Cash payments accepted' },
  { type: 'card', enabled: true, details: 'All major credit/debit cards accepted' },
  { type: 'online', enabled: true, details: 'Secure online payments available' }
];

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: '09:00', close: '17:00', isOpen: true },
  tuesday: { open: '09:00', close: '17:00', isOpen: true },
  wednesday: { open: '09:00', close: '17:00', isOpen: true },
  thursday: { open: '09:00', close: '17:00', isOpen: true },
  friday: { open: '09:00', close: '17:00', isOpen: true },
  saturday: { open: '10:00', close: '15:00', isOpen: true },
  sunday: { open: '00:00', close: '00:00', isOpen: false },
};

export default function FeedAIPage() {
  const { isMobile } = useMobileDetect();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAttempts, setSaveAttempts] = useState(0);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const MAX_SAVE_ATTEMPTS = 3;
  const [businessData, setBusinessData] = useState<BusinessData>({
    services: [],
    promotions: [],
    faqs: [],
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    customResponses: [],
    businessHours: DEFAULT_BUSINESS_HOURS
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [newService, setNewService] = useState<Service>({
    name: '',
    description: undefined,
    price: undefined,
    duration: undefined
  });
  const [newPromotion, setNewPromotion] = useState<Promotion>({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    isFirstTimeOnly: false,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true
  });
  const [newCustomResponse, setNewCustomResponse] = useState<CustomResponse>({
    trigger: '',
    response: '',
    isActive: true
  });
  const [activeTab, setActiveTab] = useState<string>("services");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<BusinessData | null>(null);
  const lastSaveTime = useRef<number>(0);
  const MIN_SAVE_INTERVAL = 5000; // Minimum 5 seconds between saves

  const handleSyncData = async (forcedState?: BusinessData) => {
    try {
      setIsLoading(true);
      
      // Reset save errors on new attempt
      setSaveErrors({});
      
      // Increment save attempts counter for retry logic
      setSaveAttempts(prev => prev + 1);
      
      const token = businessAuth.getToken();
      if (!token) {
        console.error('No auth token available');
        toast({
          title: "Authentication Error",
          description: "Please sign in to sync data.",
          variant: "destructive",
        });
        return;
      }
      
      // Fetch CSRF token
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) {
        console.error('Failed to fetch CSRF token');
        toast({
          title: "Session Error",
          description: "Could not validate your session. Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      // Use forced state if provided, otherwise use current state
      const stateToSync = forcedState || businessData;

      // Log the current state before preparing data
      console.log('Current state before sync:', {
        stateToSync,
        serviceCount: stateToSync.services.length,
        services: stateToSync.services
      });

      // Deep clone and clean data before sending
      const dataToSend = {
        services: stateToSync.services
          .filter(service => service.name?.trim()) // Only require name
          .map(service => {
            // Create base object with only name
            const processedService: Service = {
              name: String(service.name).trim()
            };
            
            // Only add optional fields if they exist and are not empty
            if (service.description !== undefined && service.description !== null && service.description.trim() !== '') {
              processedService.description = String(service.description).trim();
            }
            
            if (service.price !== undefined && service.price !== null) {
              processedService.price = Number(service.price);
            }
            
            // Only add duration if explicitly set, with no minimum value enforced
            if (service.duration !== undefined && service.duration !== null) {
              processedService.duration = Number(service.duration);
            }
            
            return processedService;
          }),
        promotions: stateToSync.promotions
          .filter(promo => promo.name?.trim() && promo.description?.trim())
          .map(promo => ({
            name: String(promo.name).trim(),
            description: String(promo.description).trim(),
            discountType: ['percentage', 'fixed'].includes(promo.discountType) ? promo.discountType : 'fixed',
            discountValue: Math.max(0, Number(promo.discountValue) || 0),
            isFirstTimeOnly: Boolean(promo.isFirstTimeOnly),
            validUntil: String(promo.validUntil || new Date().toISOString().split('T')[0]),
            isActive: Boolean(promo.isActive)
          })),
        faqs: stateToSync.faqs
          .filter(faq => faq.question?.trim() && faq.answer?.trim())
          .map(faq => ({
            question: String(faq.question).trim(),
            answer: String(faq.answer).trim()
          })),
        paymentMethods: (stateToSync.paymentMethods || DEFAULT_PAYMENT_METHODS)
          .map(method => ({
            type: ['cash', 'card', 'online'].includes(method.type) ? method.type : 'cash',
            enabled: Boolean(method.enabled),
            details: String(method.details || '').trim()
          })),
        customResponses: stateToSync.customResponses
          .filter(response => response.trigger?.trim() && response.response?.trim())
          .map(response => ({
            trigger: String(response.trigger).trim(),
            response: String(response.response).trim(),
            isActive: Boolean(response.isActive)
          })),
        businessHours: stateToSync.businessHours || undefined
      };

      // Add retry timeout for network issues (increases with each attempt)
      const timeoutMs = 10000 + (saveAttempts * 5000); // 10s base + 5s per attempt

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch('/api/business/feed-ai', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify(dataToSend),
          signal: controller.signal
        });
        
        // Clear timeout since request completed
        clearTimeout(timeoutId);

        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please sign in again.",
            variant: "destructive",
          });
          businessAuth.signout();
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          
          // Check if we received field validation errors
          if (errorData.fieldValidation) {
            // Store field-specific errors
            const newErrors: Record<string, string> = {};
            Object.entries(errorData.fieldValidation).forEach(([field, info]: [string, any]) => {
              if (info.message) {
                newErrors[field] = info.message;
              }
            });
            setSaveErrors(newErrors);
            
            // Show field-specific error messages to the user
            const errorMessages = Object.values(newErrors);
            if (errorMessages.length > 0) {
              toast({
                title: "Some fields could not be saved",
                description: errorMessages.join('. '),
                variant: "destructive",
                duration: 5000,
              });
            }
          }
          
          throw new Error(errorData.error || 'Failed to sync data');
        }
        
        // Reset save attempts counter on success
        setSaveAttempts(0);
        
        const updatedData = await response.json();

        // Ensure all arrays are initialized and valid
        const cleanData = {
          services: Array.isArray(updatedData.services) ? updatedData.services : [],
          promotions: Array.isArray(updatedData.promotions) ? updatedData.promotions : [],
          faqs: Array.isArray(updatedData.faqs) ? updatedData.faqs : [],
          paymentMethods: Array.isArray(updatedData.paymentMethods) && updatedData.paymentMethods.length > 0 
            ? updatedData.paymentMethods 
            : DEFAULT_PAYMENT_METHODS,
          customResponses: Array.isArray(updatedData.customResponses) ? updatedData.customResponses : [],
          businessHours: updatedData.businessHours || undefined
        };

        // Update state with validated data
        setBusinessData(cleanData);
        
        // Save this as our last saved data point
        setLastSavedData(cleanData);
        
        // Clear unsaved changes flag
        setHasUnsavedChanges(false);
        
        toast({
          title: "Settings Updated",
          description: "Your business settings have been updated successfully.",
          duration: 3000,
        });
      } catch (fetchError) {
        // Clear timeout if fetch failed
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error in handleSyncData:', error);
      
      // Implement retry logic for network errors or timeouts
      const isNetworkError = 
        error instanceof TypeError || 
        (error instanceof DOMException && error.name === 'AbortError');
      
      if (isNetworkError && saveAttempts < MAX_SAVE_ATTEMPTS) {
        const retryDelay = saveAttempts * 2000; // Exponential backoff
        
        toast({
          title: "Connection issue",
          description: `Retrying in ${retryDelay/1000} seconds...`,
          duration: retryDelay - 500,
        });
        
        // Retry after delay with exponential backoff
        setTimeout(() => {
          handleSyncData(forcedState);
        }, retryDelay);
        return;
      }
      
      toast({
        title: "Error Saving Data",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
      setIsSaving(false);
    }
  };

  const handleManualSave = () => {
    setIsSaving(true);
    try {
      // Call the sync function to show feedback to the user
      handleSyncData();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error Saving",
        description: "There was a problem saving your changes. Please try again.",
        variant: "destructive"
      });
      setIsSaving(false);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = businessAuth.getToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to access this page.",
          variant: "destructive",
        });
        return;
      }

      // Fetch CSRF token
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) {
        console.error('Failed to fetch CSRF token');
        toast({
          title: "Session Error",
          description: "Could not validate your session. Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/business/feed-ai', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      });

      if (response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        });
        businessAuth.signout();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const data = await response.json();
      console.log('Fetched data:', {
        dataFields: Object.keys(data),
        counts: {
          services: data.services?.length || 0,
          promotions: data.promotions?.length || 0,
          faqs: data.faqs?.length || 0,
          customResponses: data.customResponses?.length || 0,
          paymentMethods: data.paymentMethods?.length || 0
        }
      });
      
      // Ensure all arrays are initialized and valid
      const cleanData = {
        services: Array.isArray(data.services) ? data.services : [],
        promotions: Array.isArray(data.promotions) ? data.promotions : [],
        faqs: Array.isArray(data.faqs) ? data.faqs : [],
        paymentMethods: Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0 
          ? data.paymentMethods 
          : DEFAULT_PAYMENT_METHODS,
        customResponses: Array.isArray(data.customResponses) ? data.customResponses : [],
        businessHours: data.businessHours || undefined
      };

      setBusinessData(cleanData);
      setLastSavedData(cleanData);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error fetching Feed AI data:', error);
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Could not load your business data. Please try again later.",
        variant: "destructive",
      });
      // Initialize with default values on error
      setBusinessData({
        services: [],
        promotions: [],
        faqs: [],
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        customResponses: [],
        businessHours: undefined
      });
      setIsDataLoaded(true); // Still mark as loaded even on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setBusinessData(prev => ({ ...prev, customTraining: newValue }));
    setHasUnsavedChanges(true);
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset your AI training? This cannot be undone.')) {
      setBusinessData({ 
        services: [], 
        promotions: [], 
        faqs: [], 
        paymentMethods: DEFAULT_PAYMENT_METHODS, 
        customResponses: [], 
        businessHours: DEFAULT_BUSINESS_HOURS 
      });
      setHasUnsavedChanges(true);
      toast({
        title: "AI Training Reset",
        description: "Your AI training has been reset. Don't forget to click Save Changes to apply these changes.",
        duration: 5000,
      });
    }
  };

  const handleStartEditing = () => {
    // Implementation of handleStartEditing
  };

  const handleCancelEditing = () => {
    // Implementation of handleCancelEditing
  };

  const validateService = (service: Service) => {
    return !!service.name && service.name.trim() !== '';
  };

  const validatePromotion = (promotion: Promotion): boolean => {
    return !!(
      promotion.name?.trim() &&
      promotion.description?.trim() &&
      ['percentage', 'fixed'].includes(promotion.discountType) &&
      typeof promotion.discountValue === 'number' && promotion.discountValue >= 0 &&
      promotion.validUntil
    );
  };

  const validatePaymentMethod = (method: PaymentMethod): boolean => {
    return !!(
      ['cash', 'card', 'online'].includes(method.type) &&
      typeof method.enabled === 'boolean'
    );
  };

  const validateCustomResponse = (response: CustomResponse): boolean => {
    return !!(response.trigger?.trim() && response.response?.trim());
  };

  const updateBusinessHours = (day: keyof BusinessHours, field: 'open' | 'close' | 'isOpen', value: string | boolean) => {
    // Clone the current business hours
    const updatedHours = { ...(businessData.businessHours || DEFAULT_BUSINESS_HOURS) };
    
    // Update the specific field for the day
    updatedHours[day] = {
      ...updatedHours[day],
      [field]: value
    };
    
    // Update the business data with new hours
    setBusinessData(prevData => {
      const newData = {
        ...prevData,
        businessHours: updatedHours
      };
      
      // Mark as having unsaved changes
      setHasUnsavedChanges(true);
      
      return newData;
    });
  };

  // Add function to check if data has changed
  const checkForChanges = useCallback((newData: BusinessData) => {
    if (!lastSavedData) {
      setHasUnsavedChanges(true);
      return;
    }
    
    // Compare key by key for changes
    const hasServiceChanges = JSON.stringify(newData.services) !== JSON.stringify(lastSavedData.services);
    const hasPromotionChanges = JSON.stringify(newData.promotions) !== JSON.stringify(lastSavedData.promotions);
    const hasFaqChanges = JSON.stringify(newData.faqs) !== JSON.stringify(lastSavedData.faqs);
    const hasPaymentMethodChanges = JSON.stringify(newData.paymentMethods) !== JSON.stringify(lastSavedData.paymentMethods);
    const hasCustomResponseChanges = JSON.stringify(newData.customResponses) !== JSON.stringify(lastSavedData.customResponses);
    const hasBusinessHourChanges = JSON.stringify(newData.businessHours) !== JSON.stringify(lastSavedData.businessHours);
    
    const changes = hasServiceChanges || hasPromotionChanges || hasFaqChanges || 
                    hasPaymentMethodChanges || hasCustomResponseChanges || hasBusinessHourChanges;
    
    setHasUnsavedChanges(changes);
  }, [lastSavedData]);

  // Update this to use our enhanced change detection
  const updateBusinessData = useCallback((updater: (prev: BusinessData) => BusinessData) => {
    setBusinessData(prev => {
      const updated = updater(prev);
      // Check if the data has changed
      checkForChanges(updated);
      return updated;
    });
  }, [checkForChanges]);

  // Add beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
    <div className={`container mx-auto px-4 py-8 max-w-6xl ${isMobile ? 'mobile-container' : ''}`}>
      <div className={`flex justify-between items-center mb-6 ${isMobile ? 'mobile-header' : ''}`}>
        <div className={isMobile ? 'mobile-header-title' : ''}>
          <h1 className="text-3xl font-bold">AI Data Management</h1>
          <p className="text-muted-foreground">
            Manage the information your business AI uses to respond to customers
          </p>
        </div>
        <div className={`flex gap-2 items-center ${isMobile ? 'mobile-header-actions' : ''}`}>
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 flex items-center">
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              Unsaved changes
            </span>
          )}
          <Button
            onClick={handleManualSave}
            disabled={isLoading || isSaving || !hasUnsavedChanges}
            className={`ml-2 ${isMobile ? 'mobile-button' : ''}`}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin"></div>
            <p className="text-violet-600 font-medium">Loading your business data...</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab} className={`${isMobile ? 'space-y-8' : 'space-y-6'}`}>
          <div className={isMobile ? "tabs-wrapper" : ""}>
            <TabsList className={isMobile ? 'mobile-tabs-list single-line-tabs' : 'grid w-full grid-cols-5 p-1 bg-gray-100 rounded-lg'}>
              <TabsTrigger 
                value="services" 
                className="data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Services & Pricing</span>
                  <span className="sm:hidden">Services</span>
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="hours" 
                className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Business Hours</span>
                  <span className="sm:hidden">Hours</span>
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="promotions" 
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Special Promotions</span>
                  <span className="sm:hidden">Promos</span>
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="payment" 
                className="data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Payment Methods</span>
                  <span className="sm:hidden">Payment</span>
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="custom" 
                className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-md transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">Custom Responses</span>
                  <span className="sm:hidden">Custom</span>
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Services & Pricing Tab */}
          <TabsContent value="services" className={`${isMobile ? 'mobile-tab-content pt-2' : ''}`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className={`relative shadow-md border-0 overflow-hidden ${isMobile ? 'mobile-card' : ''}`}>
                <CardHeader className={isMobile ? 'mobile-card-header' : 'pb-2'}>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Tag className="h-5 w-5 text-violet-600" />
                    Services & Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'mobile-card-content' : ''}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="serviceName" className={isMobile ? 'mobile-label' : ''}>Service Name</Label>
                        <Input
                          id="serviceName"
                          value={newService.name}
                          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                          placeholder="e.g., Basic Hair Cut"
                          className={isMobile ? 'mobile-input' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serviceDescription" className={isMobile ? 'mobile-label' : ''}>Description (Optional)</Label>
                        <Input
                          id="serviceDescription"
                          value={newService.description || ''}
                          onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                          placeholder="e.g., Classic haircut with styling"
                          className={isMobile ? 'mobile-input' : ''}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="servicePrice" className={isMobile ? 'mobile-label' : ''}>Price (Optional)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                          <Input
                            id="servicePrice"
                            type="number"
                            value={newService.price !== undefined ? newService.price : ''}
                            onChange={(e) => setNewService({ ...newService, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`pl-7 ${isMobile ? 'mobile-input' : ''}`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serviceDuration" className={isMobile ? 'mobile-label' : ''}>Duration in Minutes (Optional)</Label>
                        <Input
                          id="serviceDuration"
                          type="number"
                          value={newService.duration !== undefined ? newService.duration : ''}
                          onChange={(e) => setNewService({ ...newService, duration: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="e.g., 60"
                          min="1"
                          step="1"
                          className={isMobile ? 'mobile-input' : ''}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        const updatedServices = [...businessData.services, newService];
                        setBusinessData({ ...businessData, services: updatedServices });
                        setHasUnsavedChanges(true);
                        setNewService({
                          name: '',
                          description: undefined,
                          price: undefined,
                          duration: undefined
                        });
                        toast({
                          title: "Service Added",
                          description: "Remember to click Save Changes to save your updates.",
                          duration: 3000,
                        });
                      }}
                      disabled={!validateService(newService)}
                      className={isMobile ? 'mobile-button' : ''}
                    >
                      Add Service
                    </Button>

                    {businessData.services.length > 0 && (
                      <div className={`mt-6 ${isMobile ? 'mobile-mt-6' : ''}`}>
                        <h3 className="text-lg font-semibold mb-4">Current Services</h3>
                        <div className={`grid gap-4 ${isMobile ? 'mobile-service-grid' : ''}`}>
                          {businessData.services.map((service, index) => (
                            <Card key={`service-${index}`} className={isMobile ? 'mobile-service-card' : 'p-4'}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{service.name}</h4>
                                  <p className="text-sm text-gray-600">{service.description}</p>
                                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                    {service.price !== undefined && (
                                      <span>${service.price.toFixed(2)}</span>
                                    )}
                                    {service.duration !== undefined && (
                                      <span>{service.duration} minutes</span>
                                    )}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    const newState = {
                                      ...businessData,
                                      services: businessData.services.filter((_, i) => i !== index)
                                    };
                                    setBusinessData(newState);
                                    setHasUnsavedChanges(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className={`bg-gradient-to-br from-blue-50 to-violet-50 p-6 rounded-xl border border-blue-100 mt-8 ${isMobile ? 'mobile-info-card' : ''}`}>
                      <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        How Services Help Your AI Assistant
                      </h4>
                      <ul className={`space-y-3 text-gray-700 ${isMobile ? 'mobile-info-list' : ''}`}>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span>AI provides accurate service descriptions to customers</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Shares pricing information to set proper expectations</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Helps customers understand service duration</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Suggests relevant services based on customer needs</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Business Hours Tab */}
          <TabsContent value="hours" className={`${isMobile ? 'mobile-tab-content pt-2' : ''}`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className={`relative shadow-md border-0 overflow-hidden ${isMobile ? 'mobile-card' : ''}`}>
                <CardHeader className={isMobile ? 'mobile-card-header' : 'pb-2'}>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-600" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'mobile-card-content' : ''}>
                  <div className={`grid gap-6 md:grid-cols-2 ${isMobile ? 'mobile-hours-grid' : ''}`}>
                    {/* Days of the week */}
                    <div className="col-span-1">
                      {
                        Object.entries(businessData.businessHours || DEFAULT_BUSINESS_HOURS).map(([day, hours]) => (
                          <div key={day} className={`mb-4 ${isMobile ? 'mobile-day-row' : ''}`}>
                            <div className="flex items-center justify-between">
                              <p className="font-medium capitalize">{day}</p>
                              <div className="flex items-center">
                                <Switch
                                  checked={hours.isOpen}
                                  onCheckedChange={(checked) => {
                                    updateBusinessHours(day as keyof BusinessHours, 'isOpen', checked);
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-600">{hours.isOpen ? 'Open' : 'Closed'}</span>
                              </div>
                            </div>
                            {hours.isOpen && (
                              <div className={`mt-2 grid grid-cols-2 gap-2 ${isMobile ? '' : ''}`}>
                                <div>
                                  <Label className={`text-xs text-gray-500 ${isMobile ? 'mobile-label' : ''}`}>Open</Label>
                                  <Select
                                    value={hours.open}
                                    onValueChange={(value) => {
                                      updateBusinessHours(day as keyof BusinessHours, 'open', value);
                                    }}
                                  >
                                    <SelectTrigger className={isMobile ? 'mobile-select' : ''}>
                                      <SelectValue placeholder="Open time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {generateTimeOptions().map((time) => (
                                        <SelectItem key={`open-${day}-${time}`} value={time}>
                                          {time}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className={`text-xs text-gray-500 ${isMobile ? 'mobile-label' : ''}`}>Close</Label>
                                  <Select
                                    value={hours.close}
                                    onValueChange={(value) => {
                                      updateBusinessHours(day as keyof BusinessHours, 'close', value);
                                    }}
                                  >
                                    <SelectTrigger className={isMobile ? 'mobile-select' : ''}>
                                      <SelectValue placeholder="Close time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {generateTimeOptions().map((time) => (
                                        <SelectItem key={`close-${day}-${time}`} value={time}>
                                          {time}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      }
                    </div>

                    {/* Info box */}
                    <div className={`col-span-1 bg-gradient-to-br from-sky-50 to-blue-50 p-6 rounded-xl border border-sky-100 h-fit ${isMobile ? 'mobile-info-card' : ''}`}>
                      <h4 className="text-lg font-semibold text-sky-800 mb-4 flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        How Business Hours Help Your AI
                      </h4>
                      <ul className={`space-y-3 text-gray-700 ${isMobile ? 'mobile-info-list' : ''}`}>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-sky-500 mt-1 flex-shrink-0" />
                          <span>AI accurately informs customers when you're open</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-sky-500 mt-1 flex-shrink-0" />
                          <span>Prevents confusion about availability</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-sky-500 mt-1 flex-shrink-0" />
                          <span>Helps set correct customer expectations</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Special Promotions Tab */}
          <TabsContent value="promotions" className={`${isMobile ? 'mobile-tab-content pt-2' : ''}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card className={`relative shadow-md border-0 overflow-hidden ${isMobile ? 'mobile-card' : ''}`}>
                <CardHeader className={isMobile ? 'mobile-card-header' : 'pb-2'}>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Special Promotions
                  </CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'mobile-card-content' : ''}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="promotionName" className={isMobile ? 'mobile-label' : ''}>Promotion Name</Label>
                        <Input
                          id="promotionName"
                          value={newPromotion.name}
                          onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
                          placeholder="e.g., First Visit Special"
                          className={isMobile ? 'mobile-input' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="promotionDescription" className={isMobile ? 'mobile-label' : ''}>Description</Label>
                        <Input
                          id="promotionDescription"
                          value={newPromotion.description}
                          onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                          placeholder="e.g., 20% off your first service"
                          className={isMobile ? 'mobile-input' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discountType" className={isMobile ? 'mobile-label' : ''}>Discount Type</Label>
                        <Select
                          value={newPromotion.discountType}
                          onValueChange={(value: 'percentage' | 'fixed') => 
                            setNewPromotion({ ...newPromotion, discountType: value })}
                        >
                          <SelectTrigger id="discountType" className={isMobile ? 'mobile-select' : ''}>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discountValue" className={isMobile ? 'mobile-label' : ''}>
                          {newPromotion.discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount ($)'}
                        </Label>
                        <Input
                          id="discountValue"
                          type="number"
                          min="0"
                          step={newPromotion.discountType === 'percentage' ? '1' : '0.01'}
                          max={newPromotion.discountType === 'percentage' ? '100' : undefined}
                          value={newPromotion.discountValue}
                          onChange={(e) => setNewPromotion({ 
                            ...newPromotion, 
                            discountValue: parseFloat(e.target.value) 
                          })}
                          placeholder={newPromotion.discountType === 'percentage' ? '20' : '10.00'}
                          className={isMobile ? 'mobile-input' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validUntil" className={isMobile ? 'mobile-label' : ''}>Valid Until</Label>
                        <Input
                          id="validUntil"
                          type="date"
                          value={newPromotion.validUntil}
                          onChange={(e) => setNewPromotion({ ...newPromotion, validUntil: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          className={isMobile ? 'mobile-input' : ''}
                        />
                      </div>
                      <div className="space-y-2 flex items-center">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isFirstTimeOnly"
                            checked={newPromotion.isFirstTimeOnly}
                            onCheckedChange={(checked: boolean) => 
                              setNewPromotion({ ...newPromotion, isFirstTimeOnly: checked })}
                          />
                          <Label htmlFor="isFirstTimeOnly" className={isMobile ? 'mobile-label' : ''}>First-time customers only</Label>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        const newState = {
                          ...businessData,
                          promotions: [...businessData.promotions, newPromotion]
                        };
                        setBusinessData(newState);
                        setHasUnsavedChanges(true);
                        setNewPromotion({
                          name: '',
                          description: '',
                          discountType: 'percentage',
                          discountValue: 0,
                          isFirstTimeOnly: false,
                          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          isActive: true
                        });
                        toast({
                          title: "Promotion Added",
                          description: "Remember to click Save Changes to save your updates.",
                          duration: 3000,
                        });
                      }}
                      disabled={!validatePromotion(newPromotion)}
                      className={isMobile ? 'mobile-button' : ''}
                    >
                      Add Promotion
                    </Button>

                    {businessData.promotions.length > 0 && (
                      <div className={`mt-6 ${isMobile ? 'mobile-mt-6' : ''}`}>
                        <h3 className="text-lg font-semibold mb-4">Current Promotions</h3>
                        <div className={`grid gap-4 ${isMobile ? 'mobile-promotion-grid' : ''}`}>
                          {businessData.promotions.map((promotion, index) => (
                            <Card key={`promotion-${index}`} className={isMobile ? 'mobile-promotion-card' : 'p-4'}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium">{promotion.name}</h4>
                                    {promotion.isFirstTimeOnly && (
                                      <Badge variant="secondary" className="text-xs">
                                        First-time only
                                      </Badge>
                                    )}
                                    <Badge 
                                      variant={new Date(promotion.validUntil) > new Date() ? "default" : "destructive"}
                                      className={`text-xs ${new Date(promotion.validUntil) > new Date() ? 'bg-green-100 text-green-800' : ''}`}
                                    >
                                      {new Date(promotion.validUntil) > new Date() ? 'Active' : 'Expired'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{promotion.description}</p>
                                  <div className="flex gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                                    <span>
                                      {promotion.discountType === 'percentage' 
                                        ? `${promotion.discountValue}% off`
                                        : `$${promotion.discountValue.toFixed(2)} off`
                                      }
                                    </span>
                                    <span>Valid until: {new Date(promotion.validUntil).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    const newState = {
                                      ...businessData,
                                      promotions: businessData.promotions.filter((_, i) => i !== index)
                                    };
                                    setBusinessData(newState);
                                    setHasUnsavedChanges(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 mt-8 ${isMobile ? 'mobile-info-card' : ''}`}>
                      <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        How Promotions Help Your AI Assistant
                      </h4>
                      <ul className={`space-y-3 text-gray-700 ${isMobile ? 'mobile-info-list' : ''}`}>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span>AI shares current promotions with interested customers</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Highlights special offers to drive conversions</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Accurately communicates promotion terms and conditions</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Only mentions valid, active promotions</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment" className={`${isMobile ? 'mobile-tab-content pt-2' : ''}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Card className={`relative shadow-md border-0 overflow-hidden ${isMobile ? 'mobile-card' : ''}`}>
                <CardHeader className={isMobile ? 'mobile-card-header' : 'pb-2'}>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-amber-600" />
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'mobile-card-content' : ''}>
                  <div className="space-y-6">
                    <div className={`grid gap-4 ${isMobile ? 'mobile-payment-grid' : ''}`}>
                      {businessData.paymentMethods.map((method, index) => (
                        <div key={`payment-${method.type}`} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-100">
                          <div className="flex-shrink-0 mt-1">
                            {method.type === 'cash' && <Banknote className="h-5 w-5 text-green-600" />}
                            {method.type === 'card' && <CreditCard className="h-5 w-5 text-blue-600" />}
                            {method.type === 'online' && <Globe className="h-5 w-5 text-violet-600" />}
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium capitalize">{method.type}</h4>
                                <Input
                                  value={method.details || ''}
                                  onChange={(e) => {
                                    const updatedMethods = [...businessData.paymentMethods];
                                    updatedMethods[index] = {
                                      ...method,
                                      details: e.target.value
                                    };
                                    const newState = {
                                      ...businessData,
                                      paymentMethods: updatedMethods
                                    };
                                    setBusinessData(newState);
                                  }}
                                  onBlur={() => {
                                    setHasUnsavedChanges(true);
                                  }}
                                  placeholder={`Enter details for ${method.type} payments`}
                                  className={`mt-2 text-sm ${isMobile ? 'mobile-input' : ''}`}
                                />
                              </div>
                              <Switch
                                checked={method.enabled}
                                onCheckedChange={() => {
                                  const updatedMethods = [...businessData.paymentMethods];
                                  updatedMethods[index] = {
                                    ...method,
                                    enabled: !method.enabled
                                  };
                                  const newState = {
                                    ...businessData,
                                    paymentMethods: updatedMethods
                                  };
                                  
                                  setBusinessData(newState);
                                  setHasUnsavedChanges(true);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`bg-gradient-to-br from-violet-50 to-blue-50 p-6 rounded-xl border border-violet-100 ${isMobile ? 'mobile-info-card' : ''}`}>
                      <h4 className="text-lg font-semibold text-violet-800 mb-4 flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        How Payment Methods Help Your AI Assistant
                      </h4>
                      <ul className={`space-y-3 text-gray-700 ${isMobile ? 'mobile-info-list' : ''}`}>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-violet-500 mt-1 flex-shrink-0" />
                          <span>AI informs customers about accepted payment methods</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-violet-500 mt-1 flex-shrink-0" />
                          <span>Reduces payment-related questions and confusion</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-violet-500 mt-1 flex-shrink-0" />
                          <span>Helps set clear expectations for transactions</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-violet-500 mt-1 flex-shrink-0" />
                          <span>Ensures smooth payment process for customers</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Custom Responses Tab */}
          <TabsContent value="custom" className={`${isMobile ? 'mobile-tab-content pt-2' : ''}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Card className={`relative shadow-md border-0 overflow-hidden ${isMobile ? 'mobile-card' : ''}`}>
                <CardHeader className={isMobile ? 'mobile-card-header' : 'pb-2'}>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    Custom Responses
                  </CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'mobile-card-content' : ''}>
                  <div className="space-y-6">
                    <div className={`grid grid-cols-1 gap-4 ${isMobile ? 'mobile-custom-response-form' : ''}`}>
                      <div className="space-y-2">
                        <Label htmlFor="responseTrigger" className={isMobile ? 'mobile-label' : ''}>When customer says or asks about...</Label>
                        <Input
                          id="responseTrigger"
                          value={newCustomResponse.trigger}
                          onChange={(e) => setNewCustomResponse({ ...newCustomResponse, trigger: e.target.value })}
                          placeholder="e.g., cancellation policy, parking availability"
                          className={isMobile ? 'mobile-input' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customResponse" className={isMobile ? 'mobile-label' : ''}>AI should respond with...</Label>
                        <Textarea
                          id="customResponse"
                          value={newCustomResponse.response}
                          onChange={(e) => setNewCustomResponse({ ...newCustomResponse, response: e.target.value })}
                          placeholder="e.g., Our cancellation policy requires 24 hours notice. Late cancellations may incur a fee."
                          className={`min-h-[100px] ${isMobile ? 'mobile-input' : ''}`}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        const newState = {
                          ...businessData,
                          customResponses: [...businessData.customResponses, newCustomResponse]
                        };
                        setBusinessData(newState);
                        setHasUnsavedChanges(true);
                        setNewCustomResponse({
                          trigger: '',
                          response: '',
                          isActive: true
                        });
                        toast({
                          title: "Custom Response Added",
                          description: "Remember to click Save Changes to save your updates.",
                          duration: 3000,
                        });
                      }}
                      className={`w-full bg-violet-600 hover:bg-violet-700 ${isMobile ? 'mobile-button' : ''}`}
                      disabled={!validateCustomResponse(newCustomResponse)}
                    >
                      Add Custom Response
                    </Button>

                    {businessData.customResponses.length > 0 && (
                      <div className={`mt-6 ${isMobile ? 'mobile-mt-6' : ''}`}>
                        <h3 className="text-lg font-semibold mb-4">Current Custom Responses</h3>
                        <div className={`grid gap-4 ${isMobile ? 'mobile-custom-response-grid' : ''}`}>
                          {businessData.customResponses.map((customResponse, index) => (
                            <Card key={`custom-response-${index}`} className={isMobile ? 'mobile-card p-4' : 'p-4'}>
                              <div className="flex justify-between items-start">
                                <div className="space-y-2 flex-grow pr-8">
                                  <div className="flex items-start gap-2">
                                    <div className="flex-shrink-0 mt-1">
                                      <Brain className="h-5 w-5 text-violet-500" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium text-gray-900">{customResponse.trigger}</h4>
                                        <Switch
                                          checked={customResponse.isActive}
                                          onCheckedChange={() => {
                                            const updatedResponses = [...businessData.customResponses];
                                            updatedResponses[index] = {
                                              ...customResponse,
                                              isActive: !customResponse.isActive
                                            };
                                            setBusinessData({
                                              ...businessData,
                                              customResponses: updatedResponses
                                            });
                                            setHasUnsavedChanges(true);
                                          }}
                                        />
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">{customResponse.response}</p>
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    const newState = {
                                      ...businessData,
                                      customResponses: businessData.customResponses.filter((_, i) => i !== index)
                                    };
                                    setBusinessData(newState);
                                    setHasUnsavedChanges(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`bg-gradient-to-br from-violet-50 to-blue-50 p-6 rounded-xl border border-violet-100 ${isMobile ? 'mobile-info-card' : ''}`}>
                      <h4 className="text-lg font-semibold text-violet-800 mb-4 flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        How Custom Responses Help Your AI Assistant
                      </h4>
                      <ul className={`space-y-3 text-gray-700 ${isMobile ? 'mobile-info-list' : ''}`}>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-violet-500 mt-1 flex-shrink-0" />
                          <span>Personalize AI responses to match your business voice</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-violet-500 mt-1 flex-shrink-0" />
                          <span>Ensure accurate responses for specific customer inquiries</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-violet-500 mt-1 flex-shrink-0" />
                          <span>Handle unique situations with custom-tailored messages</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-violet-500 mt-1 flex-shrink-0" />
                          <span>Maintain consistency in special policy communications</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Footer with helpful tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className={`mt-12 mb-6 p-6 bg-gradient-to-r from-violet-50 via-blue-50 to-violet-50 rounded-xl border border-violet-100 shadow-sm ${isMobile ? 'mobile-tips-section' : ''}`}
      >
        <h3 className="text-xl font-semibold text-violet-900 mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5" /> 
          AI Training Tips
        </h3>
        <ul className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${isMobile ? 'mobile-tips-grid' : ''}`}>
          <li className="flex items-start gap-3">
            <div className="bg-violet-100 p-2 rounded-full mt-1">
              <Sparkles className="h-4 w-4 text-violet-700" />
            </div>
            <div>
              <p className="font-medium text-violet-900">Be Specific</p>
              <p className="text-sm text-gray-600">The more specific your information, the more accurate your AI will be.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full mt-1">
              <Upload className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <p className="font-medium text-blue-900">Keep Updated</p>
              <p className="text-sm text-gray-600">Regularly update your information as your business changes.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="bg-emerald-100 p-2 rounded-full mt-1">
              <CheckCircle className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <p className="font-medium text-emerald-900">Test Regularly</p>
              <p className="text-sm text-gray-600">Check your AI's responses periodically to ensure accuracy.</p>
            </div>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

// Helper function to generate time options
function generateTimeOptions() {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    const formattedHour = hour.toString().padStart(2, '0');
    times.push(`${formattedHour}:00`);
    times.push(`${formattedHour}:30`);
  }
  return times;
} 