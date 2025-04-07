import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config';
import { postWithCsrf } from './client/csrf';

interface JWTPayload {
  userId: string;
  email: string;
  type: string;
  exp?: number;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  mobile: string;
  agreeToTerms?: boolean;
  acknowledgeAI?: boolean;
}

interface NotificationPreferences {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  location?: string;
  profilePicture?: string;
  notificationPreferences: NotificationPreferences;
  created_at: number;
}

interface Booking {
  id: number;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  status: 'completed' | 'upcoming' | 'cancelled';
  price: number;
  address: string;
}

interface AuthResponse {
  authToken: string;
  user: User;
  message?: string;
}

interface UpdateProfileData {
  name?: string;
  location?: string;
  mobile?: string;
}

interface BookingStats {
  totalBookings: number;
  upcomingBookings: number;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

interface AuthError extends Error {
  response?: {
    error: string;
    [key: string]: any;
  };
}

// API endpoints with full URL
const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  VERIFY: '/api/auth/verify',
  ME: '/api/auth/me',
  PROFILE: '/api/auth/profile',
  REFRESH: '/api/auth/refresh',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password-confirm',
  LOGOUT: '/api/auth/signout',
  BOOKINGS: '/api/auth/bookings',
  NOTIFICATIONS: '/api/auth/notifications',
} as const;

export const auth = {
  signup: async (credentials: SignupCredentials) => {
    console.log('Starting signup process');
    try {
      console.log('Sending signup request with:', {
        ...credentials,
        password: '[REDACTED]'
      });

      // Use CSRF-protected POST request
      const response = await postWithCsrf('/api/auth/signup', {
        name: credentials.name.trim(),
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
        mobile: credentials.mobile.trim(),
        agreeToTerms: credentials.agreeToTerms,
        acknowledgeAI: credentials.acknowledgeAI
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Signup failed:', error);
        throw new Error(error.error || 'Signup failed');
      }

      const data = await response.json();
      console.log('Signup successful, response:', { ...data, authToken: data.authToken ? '[PRESENT]' : '[MISSING]' });

      // We no longer need to check for the HttpOnly cookie presence since it's not accessible via JavaScript
      // Instead, assume the token has been set server-side if we have a successful response
      console.log('Auth state after signup:', {
        hasToken: !!data.authToken,
        user: data.user
      });

      // Store token in localStorage as a fallback
      if (data.authToken) {
        localStorage.setItem('authToken', data.authToken);
        // Set a flag that signup and login was successful
        sessionStorage.setItem('userLoggedIn', 'true');
      }

      return data;
    } catch (error: any) {
      console.error('Signup error:', error);
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; samesite=lax;';
      throw error;
    }
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    console.log('Starting login process');
    try {
      // Use CSRF-protected POST request
      const response = await postWithCsrf('/api/auth/login', {
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password
      });

      console.log('Login response status:', response.status);
      const data = await response.json();
      console.log('Login response data:', { ...data, authToken: data.authToken ? '[PRESENT]' : '[MISSING]' });

      if (!response.ok) {
        // Create an error object with the response data
        const error = new Error(data.error || 'Login failed') as AuthError;
        error.response = data; // Attach the response data to the error object
        console.error('Login failed:', data);
        throw error;
      }

      if (!data.authToken) {
        console.error('No auth token received in login response');
        throw new Error('No authentication token received');
      }

      // The httpOnly cookie is set by the server and can't be accessed via JavaScript
      // So we rely on server validation instead of checking it client-side
      console.log('Login successful, auth token and cookie set by server');
      
      // Store the token in localStorage as a fallback (but cookie is more secure)
      localStorage.setItem('authToken', data.authToken);
      
      // Set a flag that login was successful
      sessionStorage.setItem('userLoggedIn', 'true');
      
      return data;
    } catch (error: any) {
      console.error('Login error:', error);
      // Clear any partial auth state on error
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; samesite=lax;';
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('userLoggedIn');
      throw error;
    }
  },

  logout: async () => {
    console.log('Logging out...');
    try {
      // Call the signout endpoint to clear HttpOnly cookies server-side
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Also clear auth state on the client side
      auth.clearAuthState();
      
      // Force reload if needed to ensure clean state
      if (typeof window !== 'undefined') {
        // Dispatch an event that logout has occurred
        window.dispatchEvent(new Event('auth-logout'));
        
        // Remove any auth-related session storage items
        sessionStorage.removeItem('userLoggedIn');
        sessionStorage.removeItem('user');
        
        // Remove any auth-related local storage items
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Still try to clear auth state even if the API call fails
      auth.clearAuthState();
      
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('userLoggedIn');
        localStorage.removeItem('authToken');
      }
    }
  },

  clearAuthState: () => {
    console.log('Clearing all auth state...');
    try {
      // Clear cookies on all possible paths, with secure and samesite flags
      const paths = ['/', '/api', '/chat', '/services'];
      paths.forEach(path => {
        document.cookie = `authToken=; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; samesite=lax;`;
        document.cookie = `authToken=; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=${window.location.hostname}; secure; samesite=lax;`;
      });
      
      // Clear localStorage and sessionStorage
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('userLoggedIn');
      
      console.log('Successfully cleared all auth state');
      return true;
    } catch (error) {
      console.error('Error clearing auth state:', error);
      return false;
    }
  },

  getToken: () => {
    if (typeof window === 'undefined') {
      console.log('getToken called server-side, returning null');
      return null;
    }
    
    try {
      // First try localStorage as a fallback
      const localToken = localStorage.getItem('authToken');
      if (localToken) {
        return localToken;
      }
      
      // If localStorage doesn't have it, we can check if we're logged in
      const isLoggedIn = sessionStorage.getItem('userLoggedIn') === 'true';
      if (isLoggedIn) {
        console.log('User appears to be logged in, but token not found in localStorage');
        // We should rely on the HttpOnly cookie for the actual auth
        return "COOKIE_BASED_AUTH";
      }
      
      console.log('No token found in storage');
      return null;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  },

  isAuthenticated: async () => {
    if (typeof window === 'undefined') {
      console.log('isAuthenticated called server-side, returning false');
      return false;
    }
    
    try {
      const token = auth.getToken();
      const isLoggedIn = sessionStorage.getItem('userLoggedIn') === 'true';
      
      if (!token && !isLoggedIn) {
        console.log('No authentication detected');
        return false;
      }

      console.log('Verifying authentication with server...');
      const response = await fetch(API_ENDPOINTS.VERIFY, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Only send Authorization header if we have a token from localStorage
          ...(token && token !== "COOKIE_BASED_AUTH" ? { 'Authorization': `Bearer ${token}` } : {})
        },
        // Include credentials to send the HttpOnly cookie
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to verify authentication' }));
        console.error('Authentication verification failed:', error);
        
        // If auth is invalid, clear auth state
        if (response.status === 401) {
          auth.clearAuthState();
        }
        return false;
      }

      const data = await response.json().catch(() => null);
      if (!data || !data.success) {
        console.error('Invalid response from server:', data);
        return false;
      }

      console.log('Authentication verification successful:', data);
      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      console.log('getCurrentUser - Starting request');
      
      // Check for token in localStorage first as a fallback
      const token = localStorage.getItem('authToken');
      
      // Set up headers - only include Authorization if token exists in localStorage
      const headers: HeadersInit = {};
      if (token) {
        console.log('getCurrentUser - Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('getCurrentUser - No token in localStorage, relying on HttpOnly cookie');
      }
      
      // Make the request with the appropriate headers and include credentials
      const response = await fetch(API_ENDPOINTS.ME, {
        credentials: 'include', // Important for sending cookies
        headers
      });

      if (!response.ok) {
        console.error('getCurrentUser - Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch user');
      }

      // Parse the response
      const userData = await response.json();
      
      // Normalize and log user data
      console.log('getCurrentUser - Received user data:', {
        ...userData,
        hasLocation: 'location' in userData,
        locationValue: userData.location === '' ? 'EMPTY_STRING' : 
                      userData.location === null ? 'NULL' : 
                      userData.location === undefined ? 'UNDEFINED' : 
                      `STRING: ${userData.location}`,
        locationTypeOf: typeof userData.location
      });
      
      // Normalize location field to ensure consistent behavior
      if (userData.location === null || userData.location === undefined) {
        userData.location = '';
      }
      
      return userData;
    } catch (error: any) {
      console.error('getCurrentUser - Error:', error);
      throw new Error(error.message || 'Failed to get current user');
    }
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    try {
      console.log('updateProfile - Starting request with data:', JSON.stringify(data));
      
      // Check for token in localStorage first as a fallback
      const token = localStorage.getItem('authToken');
      
      // Set up headers - only include Authorization if token exists in localStorage
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        console.log('updateProfile - Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('updateProfile - No token in localStorage, relying on HttpOnly cookie');
      }
      
      // Make the request with the appropriate headers and include credentials
      const response = await fetch(API_ENDPOINTS.PROFILE, {
        method: 'PUT',
        credentials: 'include', // Important for sending cookies
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        console.error('updateProfile - Response not OK:', response.status, response.statusText);
        throw new Error('Failed to update profile');
      }

      // Parse the response
      const userData = await response.json();
      
      // Normalize response data
      console.log('updateProfile - Received user data:', JSON.stringify(userData));
      
      // Normalize fields to prevent null/undefined issues
      if (userData.location === null || userData.location === undefined) {
        userData.location = '';
      }
      if (userData.mobile === null || userData.mobile === undefined) {
        userData.mobile = '';
      }
      
      return userData;
    } catch (error: any) {
      console.error('updateProfile - Error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  },

  uploadProfilePicture: async (file: File): Promise<{ profilePicture: string }> => {
    try {
      console.log('uploadProfilePicture - Starting request');
      
      // Check for token in localStorage first as a fallback
      const token = localStorage.getItem('authToken');
      
      // Set up headers - only include Authorization if token exists in localStorage
      const headers: HeadersInit = {};
      if (token) {
        console.log('uploadProfilePicture - Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('uploadProfilePicture - No token in localStorage, relying on HttpOnly cookie');
      }

      const formData = new FormData();
      formData.append('picture', file);

      const response = await fetch(`${API_ENDPOINTS.PROFILE}/picture`, {
        method: 'POST',
        credentials: 'include', // Important for sending cookies
        headers,
        body: formData
      });

      if (!response.ok) {
        console.error('uploadProfilePicture - Response not OK:', response.status, response.statusText);
        throw new Error('Failed to upload profile picture');
      }

      const result = await response.json();
      console.log('uploadProfilePicture - Success:', result);
      return result;
    } catch (error: any) {
      console.error('uploadProfilePicture - Error:', error);
      throw new Error(error.message || 'Failed to upload profile picture');
    }
  },

  getBookings: async (status?: string): Promise<Booking[]> => {
    try {
      console.log('getBookings - Starting request');
      
      // Check for token in localStorage first as a fallback
      const token = localStorage.getItem('authToken');
      
      // Set up headers - only include Authorization if token exists in localStorage
      const headers: HeadersInit = {};
      if (token) {
        console.log('getBookings - Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('getBookings - No token in localStorage, relying on HttpOnly cookie');
      }

      const url = new URL(API_ENDPOINTS.BOOKINGS);
      if (status) {
        url.searchParams.append('status', status);
      }

      const response = await fetch(url.toString(), {
        credentials: 'include', // Important for sending cookies
        headers
      });

      if (!response.ok) {
        console.error('getBookings - Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch bookings');
      }

      const result = await response.json();
      console.log('getBookings - Success, fetched bookings count:', result.length);
      return result;
    } catch (error: any) {
      console.error('getBookings - Error:', error);
      throw new Error(error.message || 'Failed to fetch bookings');
    }
  },

  getBookingStats: async (): Promise<BookingStats> => {
    try {
      console.log('getBookingStats - Starting request');
      
      // Check for token in localStorage first as a fallback
      const token = localStorage.getItem('authToken');
      
      // Set up headers - only include Authorization if token exists in localStorage
      const headers: HeadersInit = {};
      if (token) {
        console.log('getBookingStats - Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('getBookingStats - No token in localStorage, relying on HttpOnly cookie');
      }

      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/stats`, {
        credentials: 'include', // Important for sending cookies
        headers
      });

      if (!response.ok) {
        console.error('getBookingStats - Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch booking stats');
      }

      const result = await response.json();
      console.log('getBookingStats - Success:', result);
      return result;
    } catch (error: any) {
      console.error('getBookingStats - Error:', error);
      throw new Error(error.message || 'Failed to fetch booking stats');
    }
  },

  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    try {
      console.log('changePassword - Starting request');
      
      // Check for token in localStorage first as a fallback
      const token = localStorage.getItem('authToken');
      
      // Set up headers - only include Authorization if token exists in localStorage
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        console.log('changePassword - Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('changePassword - No token in localStorage, relying on HttpOnly cookie');
      }

      const response = await fetch(`${API_ENDPOINTS.ME}/change-password`, {
        method: 'POST',
        credentials: 'include', // Important for sending cookies
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        console.error('changePassword - Response not OK:', response.status, response.statusText);
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }

      const result = await response.json();
      console.log('changePassword - Success');
      return result;
    } catch (error: any) {
      console.error('changePassword - Error:', error);
      throw new Error(error.message || 'Failed to change password');
    }
  },

  updateNotificationSettings: async (preferences: NotificationPreferences): Promise<{ notificationPreferences: NotificationPreferences }> => {
    try {
      console.log('updateNotificationSettings - Starting request');
      
      // Check for token in localStorage first as a fallback
      const token = localStorage.getItem('authToken');
      
      // Set up headers - only include Authorization if token exists in localStorage
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        console.log('updateNotificationSettings - Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('updateNotificationSettings - No token in localStorage, relying on HttpOnly cookie');
      }

      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS, {
        method: 'PUT',
        credentials: 'include', // Important for sending cookies
        headers,
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        console.error('updateNotificationSettings - Response not OK:', response.status, response.statusText);
        const error = await response.json();
        throw new Error(error.message || 'Failed to update notification settings');
      }

      const result = await response.json();
      console.log('updateNotificationSettings - Success:', result);
      
      // Ensure notificationPreferences is always populated
      if (!result.notificationPreferences) {
        result.notificationPreferences = {
          emailNotifications: preferences.emailNotifications ?? true,
          smsNotifications: preferences.smsNotifications ?? true,
          marketingEmails: preferences.marketingEmails ?? false
        };
      }
      
      return result;
    } catch (error: any) {
      console.error('updateNotificationSettings - Error:', error);
      throw new Error(error.message || 'Failed to update notification settings');
    }
  },

  setToken: (token: string): boolean => {
    try {
      console.log('Setting new auth token...');
      
      // Always set in localStorage first
      localStorage.setItem('authToken', token);
      
      // Then set in cookies with proper attributes
      document.cookie = `authToken=${token}; path=/; max-age=2592000; SameSite=Lax`;
      
      // Verify it was set
      const storedToken = localStorage.getItem('authToken');
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(c => c.trim().startsWith('authToken='));
      
      console.log('Token storage status:', { 
        localStorage: storedToken ? 'Set' : 'Not set',
        cookie: authCookie ? 'Set' : 'Not set' 
      });
      
      if (storedToken && authCookie) {
        return true;
      } else {
        console.error('Failed to store new authentication token');
        throw new Error('Failed to store new authentication token');
      }
    } catch (error) {
      console.error('Error storing token:', error);
      return false;
    }
  },

  refreshToken: async (): Promise<string | null> => {
    try {
      const currentToken = auth.getToken();
      if (!currentToken) {
        console.error('No token to refresh');
        return null;
      }

      console.log('Attempting to refresh token...');
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      if (!response.ok) {
        console.error('Token refresh failed:', await response.text());
        // Clear auth state on refresh failure
        auth.clearAuthState();
        return null;
      }

      const { token: newToken } = await response.json();
      
      // Store the new token
      const success = auth.setToken(newToken);
      if (!success) {
        console.error('Failed to store refreshed token');
        return null;
      }

      console.log('Token refreshed and stored successfully');
      return newToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      auth.clearAuthState();
      return null;
    }
  },

  deleteAccount: async () => {
    try {
      console.log('deleteAccount - Starting request');
      
      // Check for token in localStorage first as a fallback
      const token = localStorage.getItem('authToken');
      
      // Set up headers - only include Authorization if token exists in localStorage
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        console.log('deleteAccount - Using token from localStorage');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('deleteAccount - No token in localStorage, relying on HttpOnly cookie');
      }

      const response = await fetch(`${API_ENDPOINTS.ME}`, {
        method: 'DELETE',
        credentials: 'include', // Important for sending cookies
        headers
      });

      if (!response.ok) {
        console.error('deleteAccount - Response not OK:', response.status, response.statusText);
        throw new Error('Failed to delete account');
      }

      // Clear auth state after successful deletion
      console.log('deleteAccount - Success, clearing auth state');
      auth.clearAuthState();
      return true;
    } catch (error: any) {
      console.error('deleteAccount - Error:', error);
      throw new Error(error.message || 'Failed to delete account');
    }
  },
};

export default auth;

export async function verifyAuth(req: Request): Promise<AuthResult> {
  try {
    const response = await fetch(API_ENDPOINTS.VERIFY, {
      headers: {
        ...req.headers,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Authentication failed' }));
      return { 
        success: false, 
        error: error.error || 'Authentication failed' 
      };
    }

    const data = await response.json().catch(() => null);
    if (!data || !data.userId) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      userId: data.userId
    };
  } catch (error) {
    console.error('Error in verifyAuth:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
} 