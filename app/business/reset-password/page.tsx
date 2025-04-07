'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import { businessAuth } from '@/lib/businessAuth';
import { toast } from '@/components/ui/use-toast';
import { fetchCsrfToken } from '@/lib/client/csrf';

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [csrfLoading, setCsrfLoading] = useState(false);

  // Check password strength
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Fetch CSRF token when component mounts
  useEffect(() => {
    if (token) {
      const preloadCsrf = async () => {
        setCsrfLoading(true);
        try {
          console.log('Preloading CSRF token for password reset...');
          await fetchCsrfToken(true); // Force refresh to ensure we have a fresh token
          console.log('CSRF token preloaded successfully');
        } catch (error) {
          console.error('Failed to preload CSRF token:', error);
        } finally {
          setCsrfLoading(false);
        }
      };
      
      preloadCsrf();
    }
  }, [token]);
  
  useEffect(() => {
    // Simple password strength check
    let strength = 0;
    if (newPassword.length >= 8) strength += 1;
    if (newPassword.match(/[A-Z]/)) strength += 1;
    if (newPassword.match(/[0-9]/)) strength += 1;
    if (newPassword.match(/[^A-Za-z0-9]/)) strength += 1;
    setPasswordStrength(strength);
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (!token) {
      setError('Invalid or expired reset token');
      toast({
        title: 'Error',
        description: 'Invalid or expired reset token',
        variant: 'destructive',
      });
      return;
    }

    if (csrfLoading) {
      setError('Please wait, initializing secure connection...');
      toast({
        title: 'Loading',
        description: 'Please wait, initializing secure connection...',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Try to fetch a fresh token right before submission as a backup strategy
      try {
        await fetchCsrfToken(true);
      } catch (csrfError) {
        console.warn('Could not refresh CSRF token before submission, will use cached token if available');
      }
      
      await businessAuth.resetPassword(token, newPassword);
      setIsSuccess(true);
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been reset successfully. You can now sign in with your new password.',
      });
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/business/signin');
      }, 3000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      // Special handling for CSRF token issues
      if (error.message.includes('session') || error.message.includes('CSRF')) {
        setError('Your session appears to be invalid. We will try to refresh your session.');
        toast({
          title: 'Session Error',
          description: 'Refreshing your session...',
          variant: 'destructive',
        });
        
        // Try to refresh the token and retry
        try {
          await fetchCsrfToken(true);
          toast({
            title: 'Session Refreshed',
            description: 'Please try submitting the form again.',
          });
          setError('Please try submitting the form again with your refreshed session.');
        } catch (refreshError) {
          console.error('Failed to refresh session:', refreshError);
          setError('Could not refresh your session. Please reload the page and try again.');
        }
      } else {
        setError(error.message || 'Failed to reset password');
        toast({
          title: 'Error',
          description: error.message || 'Failed to reset password',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // No token provided - show error UI
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-violet-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
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
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent">Flintime Business</h2>
          </div>
          
          <Card className="overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-xl">
            <div className="bg-red-500 text-white p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-4">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold">Invalid Reset Link</h1>
              <p className="mt-2 text-white/80 text-sm">
                This password reset link is invalid or has expired
              </p>
            </div>
            
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">
                Please request a new password reset link to continue.
              </p>
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700"
                onClick={() => router.push('/business/forgot-password')}
              >
                Request New Reset Link
              </Button>
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center">
            <div className="text-xs text-gray-500 max-w-md mx-auto">
              <p>© {new Date().getFullYear()} Flintime Inc. All rights reserved.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
                <Link href="/business/signin" className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center">
                  Sign In
                </Link>
                <span className="text-gray-300">•</span>
                <a href="mailto:support@flintime.com" className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center">
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success UI
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-violet-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
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
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent">Flintime Business</h2>
          </div>
          
          <Card className="overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-xl">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-4">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold">Password Reset Successful</h1>
              <p className="mt-2 text-white/80 text-sm">
                Your password has been updated successfully
              </p>
            </div>
            
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">
                You can now sign in to your account with your new password. You will be redirected to the sign-in page automatically.
              </p>
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700"
                onClick={() => router.push('/business/signin')}
              >
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center">
            <div className="text-xs text-gray-500 max-w-md mx-auto">
              <p>© {new Date().getFullYear()} Flintime Inc. All rights reserved.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
                <a href="mailto:support@flintime.com" className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center">
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Debug component for development environment
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    csrfStatus: string;
    lastError: string | null;
    lastResponse: any;
    environment: string | undefined;
    cachedToken?: string;
    cookieContent?: string;
    timestamp?: string;
  }>({
    csrfStatus: 'Unknown',
    lastError: null,
    lastResponse: null,
    environment: process.env.NODE_ENV
  });
  
  // Update debug info
  useEffect(() => {
    const updateDebugInfo = async () => {
      try {
        // Only in development environment
        if (process.env.NODE_ENV !== 'development') return;
        
        // Check if cookie exists for CSRF token
        const hasCsrfCookie = document.cookie.includes('csrf_token');
        
        // Try to fetch a token without force refresh to see if we have one cached
        let cachedToken = null;
        try {
          const csrfModule = await import('@/lib/client/csrf');
          // @ts-ignore - accessing internal module state for debugging
          cachedToken = csrfModule.default?.csrfToken || null;
        } catch (e) {
          console.error('Error accessing CSRF module:', e);
        }
        
        setDebugInfo(prev => ({
          ...prev,
          csrfStatus: hasCsrfCookie ? 'Cookie Present' : 'No Cookie',
          cachedToken: cachedToken ? 'Present' : 'None',
          cookieContent: hasCsrfCookie ? document.cookie : 'No cookies',
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        console.error('Error updating debug info:', e);
      }
    };
    
    if (token) {
      updateDebugInfo();
      const interval = setInterval(updateDebugInfo, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);
  
  // Debug panel component
  const DebugPanel = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700"
        >
          {showDebug ? "Hide Debug" : "Debug"}
        </button>
        
        {showDebug && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">CSRF Debug Information</h3>
                <button 
                  onClick={() => setShowDebug(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Environment:</span> {debugInfo.environment}
                  </div>
                  <div>
                    <span className="font-medium">CSRF Status:</span> {debugInfo.csrfStatus}
                  </div>
                  <div>
                    <span className="font-medium">Cached Token:</span> {debugInfo.cachedToken}
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span> {debugInfo.timestamp}
                  </div>
                  <div>
                    <span className="font-medium">Reset Token Length:</span> {token?.length}
                  </div>
                  
                  <div className="mt-4">
                    <button
                      onClick={async () => {
                        try {
                          const result = await fetch('/api/csrf');
                          const data = await result.json();
                          setDebugInfo(prev => ({
                            ...prev,
                            lastResponse: data,
                            timestamp: new Date().toISOString()
                          }));
                        } catch (e: any) {
                          setDebugInfo(prev => ({
                            ...prev,
                            lastError: e.message,
                            timestamp: new Date().toISOString()
                          }));
                        }
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                    >
                      Test CSRF Endpoint
                    </button>
                    
                    <button
                      onClick={async () => {
                        try {
                          await fetchCsrfToken(true);
                          const hasCsrfCookie = document.cookie.includes('csrf_token');
                          setDebugInfo(prev => ({
                            ...prev,
                            csrfStatus: hasCsrfCookie ? 'Cookie Present' : 'No Cookie',
                            timestamp: new Date().toISOString()
                          }));
                        } catch (e: any) {
                          setDebugInfo(prev => ({
                            ...prev,
                            lastError: e.message,
                            timestamp: new Date().toISOString()
                          }));
                        }
                      }}
                      className="bg-green-500 text-white px-4 py-2 rounded text-sm ml-2 hover:bg-green-600"
                    >
                      Refresh CSRF Token
                    </button>
                  </div>
                  
                  {debugInfo.lastResponse && (
                    <div className="mt-4">
                      <h4 className="font-medium">Last Response:</h4>
                      <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto">
                        {JSON.stringify(debugInfo.lastResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {debugInfo.lastError && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-500">Last Error:</h4>
                      <pre className="bg-red-50 p-2 rounded mt-1 text-xs overflow-auto text-red-700">
                        {debugInfo.lastError}
                      </pre>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <h4 className="font-medium">Cookies:</h4>
                    <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto">
                      {debugInfo.cookieContent}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main reset password UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-violet-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
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
                <KeyRound className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
              <p className="mt-2 text-white/90 text-sm">
                Create a new secure password for your account
              </p>
            </div>
          </div>

          <CardContent className="p-7">
            <form onSubmit={handleSubmit} className="space-y-5 py-2">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 animate-fadeIn">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label 
                  htmlFor="newPassword" 
                  className={`text-gray-700 font-medium transition-colors duration-200 ${passwordFocused ? 'text-violet-700' : ''}`}
                >
                  New Password
                </Label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors duration-200 ${passwordFocused ? 'text-violet-500' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className={`pl-10 h-12 bg-gray-50 border focus:ring-2 transition-all duration-200 ${
                      passwordFocused 
                        ? 'border-violet-400 ring-violet-100 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
                
                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 1 ? 'bg-red-400' : 'bg-gray-200'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 2 ? 'bg-orange-400' : 'bg-gray-200'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 3 ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
                      <div className={`h-1 flex-1 rounded-full ${passwordStrength >= 4 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {passwordStrength === 0 && "Very weak - use at least 8 characters"}
                      {passwordStrength === 1 && "Weak - add uppercase letters"}
                      {passwordStrength === 2 && "Medium - add numbers"}
                      {passwordStrength === 3 && "Strong - add special characters"}
                      {passwordStrength === 4 && "Very strong password"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="confirmPassword" 
                  className={`text-gray-700 font-medium transition-colors duration-200 ${confirmFocused ? 'text-violet-700' : ''}`}
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors duration-200 ${confirmFocused ? 'text-violet-500' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className={`pl-10 h-12 bg-gray-50 border focus:ring-2 transition-all duration-200 ${
                      confirmFocused 
                        ? 'border-violet-400 ring-violet-100 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
                {/* Password match indicator */}
                {confirmPassword.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {newPassword === confirmPassword ? (
                      <span className="text-green-600">Passwords match ✓</span>
                    ) : (
                      <span className="text-red-500">Passwords do not match</span>
                    )}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 rounded-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
            
            {/* Secure login badge */}
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4 text-green-500 mr-1.5" />
              Secure, encrypted password reset
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <div className="text-xs text-gray-500 max-w-md mx-auto">
            <p>© {new Date().getFullYear()} Flintime Inc. All rights reserved.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
              <Link href="/business/signin" className="text-violet-600 hover:text-violet-800 hover:underline inline-flex items-center">
                Back to Sign In
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
      <DebugPanel />
    </div>
  );
} 