'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { businessAuth } from '@/lib/businessAuth';
import { toast } from '@/components/ui/use-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Submitting forgot password request for:', email);
      await businessAuth.forgotPassword(email);
      setIsSubmitted(true);
      toast({
        title: 'Email Sent',
        description: 'If an account exists with this email, you will receive password reset instructions.',
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      let errorMessage = error.message || 'Failed to process request';
      
      // Check for specific known errors
      if (errorMessage.includes('CSRF')) {
        errorMessage = 'Your session appears to be invalid. Please refresh the page and try again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        errorMessage = 'The request took too long to complete. Our servers might be experiencing high load. Please try again later.';
      } else if (errorMessage.includes('database') || errorMessage.includes('Database')) {
        errorMessage = 'We are having trouble connecting to our database. Please try again later.';
      } else if (errorMessage.includes('Error looking up business')) {
        errorMessage = 'We are experiencing technical difficulties. Please try again later.';
      }
      
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Image 
              src="/logo.png" 
              alt="Flintime" 
              width={60} 
              height={60} 
              className="h-14 w-auto"
              onError={(e) => {
                // Fallback if logo image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-2xl font-bold text-violet-900">Flintime Business</h2>
        </div>
        
        {/* Back button */}
        <div className="mb-6">
          <Link href="/business/signin" className="inline-flex items-center text-sm font-medium text-violet-600 transition-colors hover:text-violet-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
        
        {/* Main card */}
        <Card className="overflow-hidden border-0 shadow-lg">
          {/* Card header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-8 text-center text-white">
            <Lock className="mx-auto mb-4 h-12 w-12 rounded-full bg-white/10 p-2 text-white" />
            <h1 className="text-2xl font-bold tracking-tight">Reset Your Password</h1>
            <p className="mt-2 text-white/80">
              {isSubmitted 
                ? "Check your email for reset instructions" 
                : "Enter your email to receive reset instructions"}
            </p>
          </div>
          
          <CardContent className="p-6">
            {isSubmitted ? (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">Email Sent Successfully</h3>
                  <p className="text-gray-600">
                    We've sent password reset instructions to <span className="font-medium text-violet-700">{email}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Please check your inbox and spam folder.
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsSubmitted(false)}
                    className="w-full border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
                  >
                    Reset Another Account
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 py-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="youremail@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-gray-50 border-gray-300 focus:border-violet-500 focus:ring-violet-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the email associated with your business account
                  </p>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 transition-all duration-200 shadow-sm" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : "Send Reset Instructions"}
                </Button>
                
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    Remember your password?{" "}
                    <Link href="/business/signin" className="font-medium text-violet-600 hover:text-violet-800">
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Flintime Inc. All rights reserved.</p>
          <p className="mt-1">Need help? <a href="mailto:support@flintime.com" className="text-violet-600 hover:underline">Contact Support</a></p>
        </div>
      </div>
    </div>
  );
} 