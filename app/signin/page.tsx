'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchCsrfToken } from '@/lib/client/csrf';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Get the return URL, email, and signup status from query parameters
  const returnUrl = searchParams.get('returnUrl') || '/';
  const email = searchParams.get('email');
  const fromSignup = searchParams.get('signup') === 'success';

  // Show welcome toast if coming from successful signup
  useEffect(() => {
    if (fromSignup) {
      toast({
        title: '👋 Welcome to Flintime!',
        description: 'Your account is ready. Please sign in to continue.',
        duration: 5000,
      });
    }
  }, [fromSignup, toast]);

  // Pre-fill email if provided
  useEffect(() => {
    if (email) {
      setFormData(prev => ({ ...prev, email }));
    }
  }, [email]);

  // Refresh CSRF token when page loads
  useEffect(() => {
    // Fresh CSRF token on page load
    const refreshCsrfToken = async () => {
      try {
        console.log('Pre-fetching fresh CSRF token on sign-in page load');
        await fetchCsrfToken(true);
      } catch (error) {
        console.error('Failed to pre-fetch CSRF token:', error);
      }
    };
    
    refreshCsrfToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Refresh the CSRF token before login attempt
      await fetchCsrfToken(true);
      
      await login(formData.email, formData.password);
      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in to your account.',
      });

      // Use window.location for a full page navigation
      // This ensures the auth state is fresh
      window.location.href = returnUrl;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Extract error message from the error response
      const errorMessage = error.response?.error || error.message || 'Please check your credentials and try again.';
      
      // Set the error message
      setError(errorMessage);
      
      // Also show toast
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: errorMessage,
        duration: 5000,
      });
      
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo and Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <div className="relative w-[60px] h-[60px] mx-auto">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
                alt="Flintime"
                fill
                className="object-contain"
                sizes="60px"
                priority
              />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-violet-600">Welcome back to Flintime</h1>
          <p className="text-gray-500">Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <Card className="border-0 shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  disabled={isLoading}
                  className="h-11"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-violet-600 hover:text-violet-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  disabled={isLoading}
                  className="h-11"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </CardContent>
          </form>
        </Card>

        <div className="text-center space-y-4">
          <div className="text-sm text-gray-500">
            Don't have an account?{' '}
            <Link href="/signup" className="text-violet-600 hover:text-violet-700 hover:underline font-medium">
              Create an account
            </Link>
          </div>
          <div className="text-xs text-gray-400">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="hover:text-violet-600 underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="hover:text-violet-600 underline">Privacy Policy</Link>
            {' '}and{' '}
            <Link href="/refund-policy" className="hover:text-violet-600 underline">Cancellation & Refund Policy</Link>
            {' '}and our{' '}
            <Link href="/cookie-policy" className="hover:text-violet-600 underline">Cookie Policy</Link>
            {' '}and our{' '}
            <Link href="/intellectual-property" className="hover:text-violet-600 underline">Intellectual Property</Link>
            {' '}and our{' '}
            <Link href="/third-party-links" className="hover:text-violet-600 underline">Third-Party Links</Link>
            {' '}and acknowledge our{' '}
            <Link href="/disclaimer" className="hover:text-violet-600 underline">Disclaimer and Limitation of Liability</Link>
            {' '}and our{' '}
            <Link href="/accessibility" className="hover:text-violet-600 underline">Accessibility</Link> commitment.
          </div>
        </div>
      </div>
    </div>
  );
} 