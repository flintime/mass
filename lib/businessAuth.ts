import { API_BASE_URL } from '@/config';
import Cookies from 'js-cookie';
import { verify } from 'jsonwebtoken';
import Business from '@/backend/src/models/business.model';
import { SenderType } from '@/lib/types';
import { postWithCsrf, fetchCsrfToken } from './client/csrf';

declare global {
  interface Window {
    businessAuthToken?: string;
    businessAuthInitialized?: boolean;
  }
}

interface BusinessSignupData {
  business_name: string;
  unique_id: string;
  email: string;
  password: string;
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
  faq_question?: string;
  faq_answer?: string;
}

interface BusinessSigninData {
  email: string;
  password: string;
}

export interface BusinessUser {
  _id: string;
  business_name: string;
  unique_id: string;
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
  business_features: string[];
  services: string[];
  images: {
    url: string;
  }[];
  latitude?: number;
  longitude?: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  faq_question?: string;
  faq_answer?: string;
  faqs?: Array<{ question: string; answer: string }>;
  created_at: Date;
  years_in_business?: string;
}

export interface BusinessUpdateData {
  business_name: string;
  unique_id: string;
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
  services?: string[];
  faq_question?: string;
  faq_answer?: string;
  faqs?: Array<{ question: string; answer: string }>;
  latitude?: number;
  longitude?: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  years_in_business?: string;
}

interface Appointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  address: string;
  created_at: string;
}

interface AppointmentStats {
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  todayAppointments: number;
  totalRevenue: number;
}

interface BusinessAvailability {
  regularHours: {
    monday: TimeSlot[];
    tuesday: TimeSlot[];
    wednesday: TimeSlot[];
    thursday: TimeSlot[];
    friday: TimeSlot[];
    saturday: TimeSlot[];
    sunday: TimeSlot[];
  };
  customDates: {
    date: string;
    slots: TimeSlot[];
    isUnavailable: boolean;
  }[];
  breakTime: number;
  appointmentDuration: number;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface IPreferences {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  marketingEmails: boolean;
  autoConfirm: boolean;
  displayInSearch: boolean;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    [key: number]: number;
  };
}

interface Review {
  _id: string;
  businessId: string;
  rating: number;
  comment: string;
  customerName: string;
  customerEmail: string;
  appointmentId?: string;
  status: 'pending' | 'approved' | 'rejected';
  reply?: string;
  replyDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  content: string;
  senderId: string;
  senderType: SenderType;
  chatRoomId: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  isAI?: boolean;
  image?: {
    url: string;
    type: string;
    size: number;
  };
}

export interface ChatList {
  [key: string]: {
    messages: ChatMessage[];
    user: {
      _id: string;
      name: string;
      email: string;
    };
    unreadCount: number;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function getBusinessFromToken(request: Request) {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // Get the token from cookies as fallback
    if (!token) {
      const cookieToken = Cookies.get('businessAuthToken');
      token = cookieToken || null;
      if (!token) {
        return null;
      }
    }

    // Verify the token using jsonwebtoken
    const decoded = verify(token, JWT_SECRET) as { businessId: string };

    // Get the business from the database
    const business = await Business.findById(decoded.businessId);
    if (!business) {
      return null;
    }

    return business;
  } catch (error) {
    console.error('Error getting business from token:', error);
    return null;
  }
}

class BusinessAuth {
  // Add a new initialize method to be called on app start
  async initialize(): Promise<boolean> {
    if (typeof window !== 'undefined') {
      console.log('Initializing business auth...');
      
      // If memory token is not set, check all possible sources
      if (!window.businessAuthToken) {
        try {
          // Check for client cookie first
          const clientCookie = Cookies.get('businessAuthTokenClient');
          console.log('Initialize: client cookie available:', !!clientCookie);
          
          if (clientCookie) {
            console.log('Found token in client cookie, initializing from cookie');
            window.businessAuthToken = clientCookie;
            window.businessAuthInitialized = true;
            return true;
          }
          
          // Log all available cookies for debugging
          const allCookies = document.cookie;
          console.log('Initialize: all cookies available:', allCookies);
          
          // As a last resort, check if the server has a valid token
          // This will help if the HttpOnly cookie exists but client cookie doesn't
          const hasServerToken = await this.checkServerToken();
          if (hasServerToken) {
            console.log('Server has valid token but client does not, making API call to refresh client token');
            
            try {
              // Make API call to get user info, which will validate with server HttpOnly cookie
              const user = await this.getCurrentUser();
              if (user && user._id) {
                // If we successfully got a user, store token in a client cookie for subsequent page loads
                // We're creating a fake token here since we can't access the HttpOnly cookie
                const tempToken = `validated-${Date.now()}`;
                Cookies.set('businessAuthTokenClient', tempToken, {
                  expires: 30,
                  path: '/',
                  sameSite: 'lax',
                  secure: process.env.NODE_ENV === 'production'
                });
                
                window.businessAuthToken = tempToken;
                window.businessAuthInitialized = true;
                console.log('Created client token from server validation');
                return true;
              }
            } catch (userError) {
              console.error('Error fetching user with server token:', userError);
            }
          }
        } catch (e) {
          console.error('Error checking cookies during initialization:', e);
        }
        
        console.log('No authentication token found from any source');
        return false;
      } else {
        console.log('Memory token already exists, skipping cookie initialization');
        window.businessAuthInitialized = true;
        return true;
      }
    }
    
    return false;
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      // First try to get from memory
      const memoryToken = window.businessAuthToken;
      console.log('getToken: memory token check:', !!memoryToken);
      if (memoryToken) {
        return memoryToken;
      }
      
      // If not in memory, try to get from cookie as fallback
      try {
        const clientCookie = Cookies.get('businessAuthTokenClient');
        console.log('getToken: client cookie check:', !!clientCookie);
        if (clientCookie) {
          // Store in memory for future use - this is crucial to fix the token persistence
          console.log('Found token in client cookie, storing in memory for future use');
          window.businessAuthToken = clientCookie;
          return clientCookie;
        }
        
        // Try the HttpOnly cookie from server as last resort
        // Note: client-side JS can't read HttpOnly cookies directly
        const allCookies = document.cookie;
        console.log('getToken: all cookies available:', allCookies);
      } catch (e) {
        console.error('Error retrieving cookies:', e);
      }
      
      console.log('getToken: No token found from any source');
      return null;
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const authEndpoints = ['/signin', '/signup', '/auth/login', '/forgot-password', '/reset-password'];
    const isAuthEndpoint = authEndpoints.some(authPath => endpoint.includes(authPath));
    
    if (!token && !isAuthEndpoint) {
      console.log(`Request to ${endpoint} requires token but none found`);
      throw new Error('No authentication token found');
    }

    console.log(`Making request to: ${API_BASE_URL}/api/business${endpoint}`, {
      method: options.method || 'GET',
      requiresAuth: !isAuthEndpoint,
      hasToken: !!token
    });

    const response = await fetch(`${API_BASE_URL}/api/business${endpoint}`, {
      ...options,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    // Log the response status and headers for debugging
    console.log(`Response from ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      
      try {
        // Try to parse error details from response
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        console.error('API error details:', errorData);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        // If we can't parse JSON, try to get text
        try {
          const textError = await response.text();
          console.error('Error response text:', textError);
        } catch (textError) {
          console.error('Could not get error response text:', textError);
        }
      }
      
      // Create a more specific error based on status code
      if (response.status === 401) {
        throw new Error('Invalid email or password');
      } else if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to perform this action.');
      } else if (response.status === 404) {
        throw new Error(`Resource not found: ${endpoint}`);
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch (error) {
      console.error('Error parsing response JSON:', error);
      throw new Error('Invalid response format');
    }
  }

  async signup(data: BusinessSignupData): Promise<void> {
    console.log('Business signup process started');
    try {
      // Use CSRF-protected POST request
      const response = await postWithCsrf('/api/business/auth/signup', data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }
      
      const result = await response.json();
      
      // Check if a token was received
      if (result.businessAuthToken) {
        console.log('Business signup successful, token received');
        // We don't need to set the cookie client-side anymore
        // It's handled by the server with HttpOnly flag
        window.location.href = '/business/dashboard/chat';
      } else {
        throw new Error('No authentication token received');
      }
    } catch (error: any) {
      console.error('Business signup error:', error);
      throw new Error(error.message || 'Failed to sign up. Please try again.');
    }
  }

  async signin(email: string, password: string): Promise<void> {
    console.log('Starting business signin process');
    
    // Track retry attempts
    let retryCount = 0;
    const maxRetries = 2;
    
    // Recursive function to attempt sign-in with retries
    const attemptSignin = async (): Promise<void> => {
      try {
        console.log(`Signin attempt ${retryCount + 1}/${maxRetries + 1}`);
        
        // Force refresh CSRF token before login attempt
        try {
          console.log('Fetching fresh CSRF token for login...');
          await fetchCsrfToken(true);
          console.log('CSRF token refreshed successfully');
        } catch (csrfError: any) {
          console.error('Error fetching CSRF token:', csrfError);
          throw new Error(`CSRF token error: ${csrfError.message}`);
        }
        
        // Use CSRF-protected POST request
        console.log('Making CSRF-protected request to login endpoint...');
        const response = await postWithCsrf('/api/business/auth/login', { email, password });
        
        console.log('Login response status:', response.status);
        
        if (!response.ok) {
          let errorMessage = `Server error: ${response.status} ${response.statusText}`;
          let shouldRetry = false;
          
          try {
            const data = await response.json();
            console.error('Error response data:', data);
            errorMessage = data.error || errorMessage;
            
            // Check if this is a CSRF/session error that might benefit from a retry
            if (data.csrfRefreshed || 
                errorMessage.includes('session') || 
                errorMessage.includes('invalid') || 
                response.status === 403) {
              shouldRetry = retryCount < maxRetries;
              console.log('CSRF/session error detected, shouldRetry:', shouldRetry);
            }
          } catch (parseError) {
            console.error('Could not parse error response:', parseError);
            const text = await response.text().catch(() => '');
            if (text) {
              console.error('Error response text:', text);
              errorMessage = `Server error: ${text}`;
            }
          }
          
          // If we should retry, do so after a short delay
          if (shouldRetry) {
            retryCount++;
            console.log(`Retrying login (attempt ${retryCount + 1}/${maxRetries + 1})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptSignin();
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Check for the presence of a token
        if (data.businessAuthToken) {
          console.log('Business login successful, token received');
          
          // Store token in memory for immediate use
          this.setToken(data.businessAuthToken);
          
          // Verify token was stored correctly
          const storedToken = this.getToken();
          if (!storedToken) {
            throw new Error('Token storage failed');
          }
          
          // Set the global initialization flag
          if (typeof window !== 'undefined') {
            window.businessAuthInitialized = true;
          }
          
          console.log('Token stored and verified successfully');
        } else {
          throw new Error('No authentication token received');
        }
      } catch (error: any) {
        console.error('Business login error:', error);
        
        // Check if we should retry based on error type
        const isNetworkError = error.message.includes('Failed to fetch') || 
                              error.message.includes('NetworkError');
        const isTimeoutError = error.message.includes('timeout') || 
                              error.message.includes('timed out');
        const isSessionError = error.message.includes('session') || 
                              error.message.includes('CSRF') || 
                              error.message.includes('invalid');
        
        // Retry for network, timeout, or session errors
        if ((isNetworkError || isTimeoutError || isSessionError) && retryCount < maxRetries) {
          retryCount++;
          console.log(`Network/timeout/session error, retrying (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          // Wait longer for network issues
          await new Promise(resolve => setTimeout(resolve, 2000));
          return attemptSignin();
        }
        
        // Clear any partial state
        this.signout();
        
        // Enhance error messages to be more user-friendly
        if (isNetworkError) {
          throw new Error('Network error. Please check your connection and try again.');
        } else if (isTimeoutError) {
          throw new Error('The request timed out. Please try again later.');
        } else if (isSessionError) {
          throw new Error('Your session appears to be invalid. Please refresh the page and try again.');
        }
        
        // Rethrow the original error
        throw error;
      }
    };
    
    // Start the signin attempt process
    await attemptSignin();
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      console.log('Setting token in memory:', !!token);
      window.businessAuthToken = token;
      
      // Also set in js-cookie for page reloads (non-HttpOnly version)
      // This is in addition to the HttpOnly cookie set by the server
      // It serves as a fallback and to maintain consistent state
      try {
        console.log('Setting client-side cookie token');
        Cookies.set('businessAuthTokenClient', token, {
          expires: 30, // 30 days
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
        
        // Check if cookie was set
        const testCookie = Cookies.get('businessAuthTokenClient');
        console.log('Verify client cookie was set:', !!testCookie);
      } catch (e) {
        console.error('Error setting cookie:', e);
      }
    }
  }

  async getCurrentUser(): Promise<BusinessUser> {
    try {
      console.log('Fetching current business user...');
      const response = await this.request<BusinessUser>('/me', {
        method: 'GET'
      });

      console.log('Successfully fetched business user');
      return response;
    } catch (error: any) {
      console.error('Failed to fetch current user:', error);
      throw new Error(error.message || 'Failed to fetch user profile. Please try again.');
    }
  }

  async getBusinessUser(id: number): Promise<BusinessUser> {
    return this.request<BusinessUser>(`/user/${id}`, {
      method: 'GET'
    });
  }

  signout(): void {
    console.log('Signing out business user');
    
    // We'll need server help to clear HttpOnly cookies
    fetch('/api/business/signout', {
      method: 'POST',
      credentials: 'include'
    }).catch(error => {
      console.error('Error during signout API call:', error);
    });
    
    // Clear client-side cookies as well
    if (typeof window !== 'undefined') {
      try {
        // Clear memory token
        console.log('Clearing memory token');
        window.businessAuthToken = undefined;
        
        // Clear all relevant cookies with different path combinations
        console.log('Clearing client-side cookies');
        Cookies.remove('businessAuthTokenClient', { path: '/' });
        Cookies.remove('businessAuthTokenClient'); // Default path
        
        // For extra certainty, try to clear the cookie directly
        document.cookie = "businessAuthTokenClient=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        // Clear the global initialization flag
        window.businessAuthInitialized = false;
        
        console.log('All authentication state cleared');
      } catch (e) {
        console.error('Error clearing cookies during signout:', e);
      }
    }
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // First check memory token
    let token = window.businessAuthToken;
    
    // If no memory token, try to get from cookie
    if (!token) {
      try {
        const clientCookie = Cookies.get('businessAuthTokenClient');
        if (clientCookie) {
          // Sync token to memory if found in cookie
          console.log('isAuthenticated: Syncing token from cookie to memory');
          window.businessAuthToken = clientCookie;
          token = clientCookie;
        }
      } catch (e) {
        console.error('Error checking cookie in isAuthenticated:', e);
      }
    }
    
    console.log('Checking business authentication:', { hasToken: !!token });
    return !!token;
  }

  async updateProfile(data: BusinessUpdateData): Promise<BusinessUser> {
    try {
      console.log('Updating business profile with data:', JSON.stringify(data, null, 2));
      const response = await this.request<BusinessUser>('/me', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      console.log('Profile update response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      throw new Error(error.message || 'Failed to update profile. Please try again.');
    }
  }

  async uploadImage(file: File): Promise<{ url: string }> {
    try {
      console.log('Uploading business profile image...');
      const formData = new FormData();
      formData.append('image', file);

      const response = await this.request<{ url: string }>('/profile/upload-image', {
        method: 'POST',
        headers: {}, // Let the request method handle the headers
        body: formData
      });
      console.log('Image uploaded successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      throw new Error(error.message || 'Failed to upload image. Please try again.');
    }
  }

  async updateBusinessFeatures(features: string[]): Promise<BusinessUser> {
    try {
      console.log('Updating business features...');
      const response = await this.request<BusinessUser>('/profile/features', {
        method: 'PUT',
        body: JSON.stringify({ business_features: features })
      });
      console.log('Business features updated successfully');
      return response;
    } catch (error: any) {
      console.error('Failed to update business features:', error);
      throw new Error(error.message || 'Failed to update business features. Please try again.');
    }
  }

  async updateFAQ(question: string, answer: string): Promise<BusinessUser> {
    try {
      console.log('Updating business FAQ...');
      const response = await this.request<BusinessUser>('/profile/faq', {
        method: 'PUT',
        body: JSON.stringify({ 
          faq_question: question,
          faq_answer: answer 
        })
      });
      console.log('FAQ updated successfully');
      return response;
    } catch (error: any) {
      console.error('Failed to update FAQ:', error);
      throw new Error(error.message || 'Failed to update FAQ. Please try again.');
    }
  }

  async updateFAQs(faqs: Array<{ question: string; answer: string }>): Promise<BusinessUser> {
    try {
      console.log('Updating business FAQs...', faqs);
      const response = await this.request<BusinessUser>('/profile/faqs', {
        method: 'PUT',
        body: JSON.stringify({ faqs })
      });
      console.log('FAQs updated successfully');
      return response;
    } catch (error: any) {
      console.error('Failed to update FAQs:', error);
      throw new Error(error.message || 'Failed to update FAQs. Please try again.');
    }
  }

  getCurrentUserId(): number | null {
    try {
      const token = this.getToken();
      if (!token) return null;
      
      // Decode the JWT token to get the user ID
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      return payload.id || null;
    } catch (error) {
      console.error('Error getting user ID from token:', error);
      return null;
    }
  }

  async getAppointments(filters: { status?: string; startDate?: string; endDate?: string } = {}): Promise<Appointment[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const endpoint = `/appointments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('Requesting appointments with endpoint:', endpoint);
      return this.request<Appointment[]>(endpoint, { method: 'GET' });
    } catch (error: any) {
      console.error('Failed to fetch appointments:', error);
      throw new Error(error.message || 'Failed to fetch appointments');
    }
  }

  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment> {
    try {
      console.log('Creating appointment...', appointmentData);
      const response = await this.request<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData)
      });
      console.log('Appointment created successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      throw new Error(error.message || 'Failed to create appointment. Please try again.');
    }
  }

  async getAppointmentStats(): Promise<AppointmentStats> {
    try {
      return this.request<AppointmentStats>('/appointments/stats', { method: 'GET' });
    } catch (error: any) {
      console.error('Failed to fetch appointment stats:', error);
      throw new Error(error.message || 'Failed to fetch appointment statistics');
    }
  }

  async updateAppointmentStatus(appointmentId: string, status: string): Promise<void> {
    try {
      await this.request<void>(`/appointments/${appointmentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    } catch (error: any) {
      console.error('Failed to update appointment status:', error);
      throw new Error(error.message || 'Failed to update appointment status');
    }
  }

  async getAvailability(): Promise<BusinessAvailability> {
    try {
      console.log('Fetching business availability...');
      const response = await this.request<BusinessAvailability>('/availability', {
        method: 'GET'
      });
      console.log('Successfully fetched availability');
      return response;
    } catch (error: any) {
      console.error('Failed to fetch availability:', error);
      throw new Error(error.message || 'Failed to fetch availability settings. Please try again.');
    }
  }

  async updateAvailability(data: BusinessAvailability): Promise<BusinessAvailability> {
    try {
      console.log('Updating business availability...');
      const response = await this.request<BusinessAvailability>('/availability', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      console.log('Successfully updated availability');
      return response;
    } catch (error: any) {
      console.error('Failed to update availability:', error);
      throw new Error(error.message || 'Failed to update availability settings. Please try again.');
    }
  }

  async getSettings(): Promise<{ preferences: IPreferences }> {
    try {
      console.log('Fetching business settings...');
      const response = await this.request<{ preferences: IPreferences }>('/settings', {
        method: 'GET'
      });
      console.log('Settings fetched successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
      throw new Error(error.message || 'Failed to fetch settings. Please try again.');
    }
  }

  async updateSettings(data: { preferences?: IPreferences; currentPassword?: string; newPassword?: string }): Promise<any> {
    try {
      console.log('Updating business settings...');
      
      // Fetch fresh CSRF token
      const csrfToken = await fetchCsrfToken(true);
      
      const response = await this.request<any>('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      console.log('Settings updated successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      throw new Error(error.message || 'Failed to update settings. Please try again.');
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      console.log('Deleting business account...');
      
      // Fetch fresh CSRF token
      const csrfToken = await fetchCsrfToken(true);
      
      await this.request<void>('/settings', {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      console.log('Account deleted successfully');
      this.signout();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      throw new Error(error.message || 'Failed to delete account. Please try again.');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    console.log('Starting forgot password process for email:', email.slice(0, 3) + '***@***' + email.split('@')[1]);
    try {
      // Force refresh CSRF token before request
      console.log('Fetching fresh CSRF token...');
      try {
        await fetchCsrfToken(true);
        console.log('CSRF token refreshed successfully');
      } catch (csrfError: any) {
        console.error('Error fetching CSRF token:', csrfError);
        throw new Error(`CSRF token error: ${csrfError.message}`);
      }
      
      // Use CSRF-protected POST request
      console.log('Making CSRF-protected request to forgot-password endpoint...');
      const response = await postWithCsrf('/api/business/forgot-password', { email });
      
      console.log('Forgot password response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const data = await response.json();
          console.error('Error response data:', data);
          
          // Handle specific error types with user-friendly messages
          if (data.error && data.error.includes('timed out')) {
            throw new Error('Database connection timed out. Please try again later.');
          } else if (data.error && data.error.includes('timeout')) {
            throw new Error('The server is taking too long to respond. Please try again later.');
          }
          
          errorMessage = data.message || data.error || errorMessage;
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          // Try to get the response text if JSON parsing fails
          const text = await response.text().catch(() => '');
          if (text) {
            console.error('Error response text:', text);
            errorMessage = `Server error: ${text}`;
          }
        }
        throw new Error(errorMessage);
      }
      
      console.log('Forgot password request processed successfully');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      // Enhance the error message to be more user-friendly
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error. Please check your connection and try again.');
      } else if (error.message.includes('timed out') || error.message.includes('timeout')) {
        throw new Error('The request timed out. Our servers might be experiencing high load. Please try again later.');
      } else if (error.message.includes('Error looking up business')) {
        throw new Error('We are having trouble accessing your account information. Please try again later.');
      }
      throw new Error(error.message || 'Failed to process forgot password request');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    console.log('Starting password reset process with token length:', token?.length);
    
    // Track retry attempts
    let retryCount = 0;
    const maxRetries = 2;
    
    // Recursive function to attempt password reset with retries
    const attemptPasswordReset = async (): Promise<void> => {
      try {
        // Force refresh CSRF token before request
        console.log(`Password reset attempt ${retryCount + 1}/${maxRetries + 1}`);
        console.log('Fetching fresh CSRF token...');
        
        try {
          await fetchCsrfToken(true);
          console.log('CSRF token refreshed successfully');
        } catch (csrfError: any) {
          console.error('Error fetching CSRF token:', csrfError);
          throw new Error(`CSRF token error: ${csrfError.message}`);
        }
        
        // Use CSRF-protected POST request
        console.log('Making CSRF-protected request to reset-password endpoint...');
        const response = await postWithCsrf('/api/business/reset-password', { token, newPassword });
        
        console.log('Reset password response status:', response.status);
        
        if (!response.ok) {
          let errorMessage = `Server error: ${response.status} ${response.statusText}`;
          let shouldRetry = false;
          
          try {
            const data = await response.json();
            console.error('Error response data:', data);
            errorMessage = data.message || data.error || errorMessage;
            
            // If we got a new CSRF token or session error, we might want to retry
            if (data.csrfRefreshed || 
                errorMessage.includes('session') || 
                errorMessage.includes('CSRF') || 
                response.status === 403) {
              shouldRetry = retryCount < maxRetries;
              console.log('CSRF/session error detected, shouldRetry:', shouldRetry);
            }
          } catch (parseError) {
            console.error('Could not parse error response:', parseError);
            // Try to get the response text if JSON parsing fails
            const text = await response.text().catch(() => '');
            if (text) {
              console.error('Error response text:', text);
              errorMessage = `Server error: ${text}`;
            }
          }
          
          if (shouldRetry) {
            retryCount++;
            console.log(`Retrying password reset (attempt ${retryCount + 1}/${maxRetries + 1})...`);
            // Wait briefly before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptPasswordReset();
          }
          
          throw new Error(errorMessage);
        }
        
        // Get response body
        let responseData;
        try {
          responseData = await response.json();
          console.log('Reset password successful:', responseData.message);
        } catch (parseError) {
          console.error('Error parsing success response:', parseError);
          // Even if we can't parse the JSON, consider it a success if status is ok
        }
      } catch (error: any) {
        console.error('Reset password error:', error);
        
        // Check if we should retry based on error type
        const isNetworkError = error.message.includes('Failed to fetch') || 
                              error.message.includes('NetworkError');
        const isTimeoutError = error.message.includes('timeout') || 
                              error.message.includes('timed out');
        const isSessionError = error.message.includes('session') || 
                              error.message.includes('CSRF') || 
                              error.message.includes('invalid');
        
        if ((isNetworkError || isTimeoutError || isSessionError) && retryCount < maxRetries) {
          retryCount++;
          console.log(`Network/timeout/session error, retrying (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          // Wait longer for network issues
          await new Promise(resolve => setTimeout(resolve, 2000));
          return attemptPasswordReset();
        }
        
        // Enhance the error message to be more user-friendly
        if (isNetworkError) {
          throw new Error('Network error. Please check your connection and try again.');
        } else if (isTimeoutError) {
          throw new Error('The request timed out. Our servers might be experiencing high load. Please try again later.');
        } else if (error.message.includes('invalid') || error.message.includes('expired')) {
          throw new Error('The password reset link is invalid or has expired. Please request a new reset link.');
        } else if (isSessionError) {
          throw new Error('Your session appears to be invalid. Please refresh the page and try again.');
        }
        
        throw error; // Re-throw any other errors
      }
    };
    
    // Start the password reset attempt process
    await attemptPasswordReset();
  }

  async getReviews(): Promise<Review[]> {
    try {
      console.log('Fetching business reviews...');
      const response = await this.request<Review[]>('/reviews', {
        method: 'GET'
      });
      console.log('Reviews fetched successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Failed to fetch reviews:', error);
      throw new Error(error.message || 'Failed to fetch reviews. Please try again.');
    }
  }

  async getReviewStats(): Promise<ReviewStats> {
    try {
      console.log('Fetching review statistics...');
      const response = await this.request<ReviewStats>('/reviews/stats', {
        method: 'GET'
      });
      console.log('Review stats fetched successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Failed to fetch review stats:', error);
      throw new Error(error.message || 'Failed to fetch review statistics. Please try again.');
    }
  }

  async replyToReview(reviewId: string, reply: string): Promise<Review> {
    try {
      console.log('Submitting review reply...', { reviewId });
      const response = await this.request<Review>(`/reviews/${reviewId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply })
      });
      console.log('Review reply submitted successfully');
      return response;
    } catch (error: any) {
      console.error('Failed to submit review reply:', error);
      throw new Error(error.message || 'Failed to submit review reply. Please try again.');
    }
  }

  async editReplyToReview(reviewId: string, reply: string): Promise<Review> {
    try {
      console.log('Editing review reply...', { reviewId });
      const response = await this.request<Review>(`/reviews/${reviewId}/reply`, {
        method: 'PUT',
        body: JSON.stringify({ reply })
      });
      console.log('Review reply edited successfully');
      return response;
    } catch (error: any) {
      console.error('Failed to edit review reply:', error);
      throw new Error(error.message || 'Failed to edit review reply. Please try again.');
    }
  }

  async deleteReplyToReview(reviewId: string): Promise<Review> {
    try {
      console.log('Deleting review reply...', { reviewId });
      const response = await this.request<Review>(`/reviews/${reviewId}/reply`, {
        method: 'DELETE'
      });
      console.log('Review reply deleted successfully');
      return response;
    } catch (error: any) {
      console.error('Failed to delete review reply:', error);
      throw new Error(error.message || 'Failed to delete review reply. Please try again.');
    }
  }

  async updateReviewStatus(reviewId: string, status: 'pending' | 'approved' | 'rejected'): Promise<Review> {
    try {
      console.log('Updating review status...');
      const response = await this.request<Review>(`/reviews/${reviewId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      console.log('Review status updated successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Failed to update review status:', error);
      throw new Error(error.message || 'Failed to update review status. Please try again.');
    }
  }

  async getChats(): Promise<ChatList> {
    try {
      console.log('Fetching business chats...');
      return await this.request<ChatList>('/chats');
    } catch (error: any) {
      console.error('Failed to fetch chats:', error);
      throw new Error(error.message || 'Failed to fetch chats. Please try again.');
    }
  }

  async sendChatMessage(chatRoomId: string, content: string): Promise<ChatMessage> {
    try {
      console.log('Sending chat message...');
      return await this.request<ChatMessage>('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          chatRoomId,
          content,
          senderType: SenderType.BUSINESS
        })
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      throw new Error(error.message || 'Failed to send message. Please try again.');
    }
  }

  async checkUniqueIdAvailability(uniqueId: string): Promise<boolean | null> {
    try {
      const response = await fetch(`/api/business/auth/check-unique-id?uniqueId=${encodeURIComponent(uniqueId.toLowerCase())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error checking unique ID availability:', errorData);
        throw new Error(errorData.error || 'Failed to check unique ID availability');
      }
      
      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Error checking unique ID availability:', error);
      return null;
    }
  }

  async checkServerToken(): Promise<boolean> {
    try {
      console.log('Checking if server-side token exists...');
      const response = await fetch(`${API_BASE_URL}/api/business/check-auth`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Server token check response:', data);
      return data.authenticated === true;
    } catch (error) {
      console.error('Error checking server token:', error);
      return false;
    }
  }
}

export const businessAuth = new BusinessAuth(); 