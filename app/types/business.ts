export interface RawBusiness {
  id: string;
  business_name: string;
  description: string;
  Business_Category: string;
  Business_Subcategories: string[];
  business_features?: string[];
  services?: string[];
  images: { url: string }[];
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  Website?: string;
  unique_id?: string;
  distance?: number;
  relevance_score?: number;
  ai_explanation?: string;
  final_score?: number;
  matched_services?: string[];
}

export interface Business {
  id: string;
  _id?: string;
  business_name: string;
  description?: string;
  Business_Category: string;
  Business_Subcategories: string[];
  business_features?: string[];
  services?: string[];
  images?: { url: string }[];
  rating?: number;
  reviews_count?: number;
  category?: string;
  distance?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  Website?: string;
  unique_id?: string;
  relevance_score?: number;
  ai_explanation?: string;
  matched_services?: string[];
  availability?: 'available' | 'busy' | 'offline';
} 