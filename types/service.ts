export interface ServiceImage {
  id: number;
  url: string;
  alt: string;
}

export interface ServiceReviewResponse {
  id: number;
  text: string;
  date: string;
}

export interface ServiceReview {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
  response?: ServiceReviewResponse;
}

export interface ServiceProvider {
  id: number;
  name: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  memberSince: string;
  description: string;
  phone: string;
  email: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  businessHours: {
    [key: string]: {
      open: string;
      close: string;
      isClosed?: boolean;
    };
  };
}

export interface ServicePricingOption {
  name: string;
  price: number;
  description: string;
}

export interface ServicePricing {
  model: 'hourly' | 'fixed' | 'variable' | 'quote';
  basePrice: number;
  currency: string;
  options?: ServicePricingOption[];
  minHours?: number;
  maxHours?: number;
}

export interface ServiceAvailability {
  days: string[];
  hours: string;
}

export interface ServicePolicies {
  cancellation: string;
  refund: string;
  insurance: string;
  terms: string;
}

export interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  rating?: number;
  reviewCount?: number;
  latitude: number;
  longitude: number;
  address?: string;
  images?: string[];
  features?: string[];
  provider?: ServiceProvider;
  availability?: ServiceAvailability;
  pricing: ServicePricing;
  policies?: ServicePolicies;
  reviews?: ServiceReview[];
  distance?: number;
  status?: 'available' | 'busy' | 'offline';
  unique_id?: string;
  business_id?: string;
} 