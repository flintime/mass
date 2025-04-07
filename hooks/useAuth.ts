import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import auth from '@/lib/auth';
import type { User } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Add a function to refresh the auth token
  const refreshToken = async () => {
    try {
      setLoading(true);
      // This will check the token in localStorage and ensure it's properly set in cookies
      const token = auth.getToken();
      if (token) {
        auth.setToken(token); // This will reset the token in cookies
        await checkAuth(); // Verify the token works
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing auth token:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await auth.login({ email, password });
      if (response.user) {
        setUser(response.user);
        // Dispatch auth change event
        window.dispatchEvent(new Event('auth-change'));
        // Force router refresh
        router.refresh();
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signup = async (credentials: { 
    name: string; 
    email: string; 
    password: string; 
    mobile: string;
    agreeToTerms?: boolean;
    acknowledgeAI?: boolean;
  }) => {
    try {
      const response = await auth.signup(credentials);
      if (response.user) {
        setUser(response.user);
        // Dispatch auth change event
        window.dispatchEvent(new Event('auth-change'));
        // Force router refresh
        router.refresh();
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // First, call auth.logout() which handles the API call and client-side state clearing
      await auth.logout();
      
      // Then update our local state
      setUser(null);
      
      // Dispatch auth change event
      window.dispatchEvent(new Event('auth-change'));
      
      // Ensure localStorage and sessionStorage are cleared
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('userLoggedIn');
        sessionStorage.removeItem('user');
      }
      
      // Force router refresh
      router.refresh();
      
      // Redirect to signin page
      router.push('/signin');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we should still clear state and redirect
      setUser(null);
      router.refresh();
      router.push('/signin');
    }
  };

  // Listen for auth change events
  useEffect(() => {
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // Listen for auth logout events
  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('userLoggedIn');
      }
    };

    window.addEventListener('auth-logout', handleAuthLogout);
    return () => window.removeEventListener('auth-logout', handleAuthLogout);
  }, []);

  return {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    refreshToken
  };
}

export type { User }; 