'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Check, X } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValidated, setTokenValidated] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing reset token. Please request a new password reset link.');
      return;
    }
    
    setTokenValidated(true);
    setIsTokenValid(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    
    // Validate passwords
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }
      
      setIsSuccess(true);
      
      toast({
        title: 'Password reset successful',
        description: 'Your password has been updated. You can now sign in with your new password.',
        duration: 5000,
      });
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push('/signin');
      }, 3000);
      
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      setError(error.message || 'Something went wrong. Please try again.');
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to reset password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo and Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
              alt="Flintime"
              width={60}
              height={60}
              className="mx-auto"
            />
          </Link>
          <h1 className="text-2xl font-bold text-violet-600">Reset your password</h1>
          <p className="text-gray-500">Please enter your new password</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            {!tokenValidated ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
              </div>
            ) : !isTokenValid ? (
              <div className="text-center py-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Invalid Token</h3>
                  <p className="text-sm text-gray-500">
                    This password reset link is invalid or has expired.
                  </p>
                </div>
                <Button
                  className="mt-4"
                  onClick={() => router.push('/forgot-password')}
                >
                  Request New Link
                </Button>
              </div>
            ) : isSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Password Reset Complete</h3>
                  <p className="text-sm text-gray-500">
                    Your password has been reset successfully. You'll be redirected to sign in shortly.
                  </p>
                </div>
                <Button
                  className="mt-4"
                  onClick={() => router.push('/signin')}
                >
                  Sign In Now
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter your new password"
                    required
                    disabled={isLoading}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your new password"
                    required
                    disabled={isLoading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/signin"
            className="text-sm text-violet-600 hover:text-violet-700 inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
} 