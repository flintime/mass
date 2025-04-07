'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, Building, ShieldCheck, ExternalLink } from 'lucide-react'
import { businessAuth } from '@/lib/businessAuth'
import { toast } from "@/components/ui/use-toast"
import Cookies from 'js-cookie'

export default function BusinessSignIn() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/business/dashboard'
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  // Check if already authenticated on page load
  useEffect(() => {
    const checkToken = async () => {
      // Initialize businessAuth from cookies
      console.log('Signin page - Initializing auth');
      await businessAuth.initialize();
      
      const token = businessAuth.getToken();
      console.log('Signin page - Auth token check:', !!token);
      
      if (token) {
        // Verify token is valid by fetching user
        try {
          console.log('Signin page - Validating token by fetching user');
          const user = await businessAuth.getCurrentUser();
          if (user) {
            console.log('Signin page - Already signed in, redirecting to:', redirectPath);
            router.push(redirectPath);
          }
        } catch (error) {
          console.error('Token validation error:', error);
          // Clear invalid token
          businessAuth.signout();
        }
      } else {
        // Check if server has a valid token even if client doesn't
        try {
          const isServerAuthenticated = await businessAuth.checkServerToken();
          console.log('Signin page - Server authentication check:', isServerAuthenticated);
          
          if (isServerAuthenticated) {
            console.log('Signin page - Server has valid token, will try to fetch user');
            const user = await businessAuth.getCurrentUser();
            if (user) {
              console.log('Signin page - Server auth confirmed, redirecting to:', redirectPath);
              router.push(redirectPath);
            }
          }
        } catch (serverAuthError) {
          console.error('Server auth check error:', serverAuthError);
        }
      }
    };
    
    // Test backend connectivity
    const testBackendConnection = async () => {
      try {
        console.log('Testing backend connectivity...');
        const response = await fetch(`${redirectPath.startsWith('/') ? '' : '/'}api/health-check`);
        console.log('Backend connectivity test:', {
          status: response.status,
          ok: response.ok
        });
      } catch (error) {
        console.error('Backend connectivity test failed:', error);
      }
    };
    
    checkToken();
    testBackendConnection();
  }, [redirectPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!formData.email.trim()) {
      setError('Email is required')
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive',
      })
      return
    }

    if (!formData.password) {
      setError('Password is required')
      toast({
        title: 'Error',
        description: 'Password is required',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      console.log('Attempting to sign in...');
      await businessAuth.signin(formData.email.trim(), formData.password);
      
      // Verify token was set successfully
      const token = businessAuth.getToken();
      if (!token) {
        throw new Error('Authentication failed - no token was set');
      }
      
      console.log('Login successful! Redirecting to:', redirectPath);
      
      // Show success toast
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
        variant: 'default',
      });
      
      // Add small delay to ensure cookie is properly set before redirecting
      setTimeout(() => {
        router.push(redirectPath);
      }, 100);
    } catch (error: any) {
      console.error('Signin error:', error)
      setError(error.message || 'Failed to sign in. Please check your credentials.')
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in. Please check your credentials.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-violet-50 flex flex-col items-center justify-center px-4 py-12 transition-all duration-300">
      <div className="w-full max-w-md">
        {/* Logo with subtle animation */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4 relative">
            <div className="absolute inset-0 bg-violet-200 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <Image 
              src="/logo.png" 
              alt="Flintime" 
              width={60} 
              height={60} 
              className="h-16 w-auto relative z-10 hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback if logo image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent">Flintime Business</h2>
        </div>

        {/* Main card with refined shadow */}
        <Card className="overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          {/* Card header with enhanced gradient */}
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 px-7 py-8 text-center text-white relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl transform -translate-x-20 translate-y-20"></div>
            </div>
            
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-14 w-14 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Building className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Business Sign In</h1>
              <p className="mt-2 text-white/90 text-sm">
                Access your business dashboard and manage appointments
              </p>
            </div>
          </div>

          <CardContent className="p-7">
            <form onSubmit={handleSubmit} className="space-y-5 py-2">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 animate-fadeIn">
                  <AlertDescription className="flex items-center">
                    <span className="ml-1">{error}</span>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className={`text-gray-700 font-medium transition-colors duration-200 ${emailFocused ? 'text-violet-700' : ''}`}>
                  Email Address
                </Label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors duration-200 ${emailFocused ? 'text-violet-500' : 'text-gray-400'}`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="youremail@example.com"
                    required
                    disabled={isLoading}
                    className={`pl-10 h-12 bg-gray-50 border focus:ring-2 transition-all duration-200 ${
                      emailFocused 
                        ? 'border-violet-400 ring-violet-100 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className={`text-gray-700 font-medium transition-colors duration-200 ${passwordFocused ? 'text-violet-700' : ''}`}>
                    Password
                  </Label>
                  <Link 
                    href="/business/forgot-password" 
                    className="text-sm text-violet-600 hover:text-violet-800 hover:underline flex items-center group"
                  >
                    Forgot password?
                    <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">›</span>
                  </Link>
                </div>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors duration-200 ${passwordFocused ? 'text-violet-500' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className={`pl-10 h-12 bg-gray-50 border focus:ring-2 transition-all duration-200 ${
                      passwordFocused 
                        ? 'border-violet-400 ring-violet-100 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 rounded-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>

              <div className="text-center pt-3">
                <p className="text-sm text-gray-600">
                  Don't have a business account?{' '}
                  <Link href="/business/signup" className="font-medium text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center group">
                    Create an account
                    <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5 ml-0.5">›</span>
                  </Link>
                </p>
              </div>
            </form>
            
            {/* Secure login badge */}
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4 text-green-500 mr-1.5" />
              Secure, encrypted login
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <div className="text-xs text-gray-500 max-w-md mx-auto">
            <p>© {new Date().getFullYear()} Flintime Inc. All rights reserved.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
              <Link href="/terms" className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center">
                Terms
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/privacy" className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center">
                Privacy
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/cookie-policy" className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center">
                Cookie Policy
              </Link>
              <span className="text-gray-300">•</span>
              <a href="mailto:support@flintime.com" className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add keyframe animation for fade-in effect */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

