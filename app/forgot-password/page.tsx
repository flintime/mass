'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Check } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call the new forgot-password endpoint
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to send reset link');
      }
      
      setIsSuccess(true);
      toast({
        title: 'Reset link sent!',
        description: 'Please check your email for instructions to reset your password.',
        duration: 5000,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Something went wrong. Please try again.';
      
      toast({
        variant: 'destructive',
        title: 'Failed to send reset link',
        description: errorMessage,
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
          <p className="text-gray-500">Enter your email to receive reset instructions</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            {isSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
                  <p className="text-sm text-gray-500">
                    We've sent password reset instructions to {email}
                  </p>
                </div>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => router.push('/signin')}
                >
                  Return to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      Sending reset link...
                    </>
                  ) : (
                    'Send reset link'
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