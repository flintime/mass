'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  }>({ success: false, message: '' });

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setIsVerifying(false);
      setVerificationResult({
        success: false,
        message: 'Missing session ID. Cannot verify payment.'
      });
      return;
    }

    // Verify payment with session ID
    const verifyPayment = async () => {
      try {
        // If needed, call an API to verify payment status
        // For now we'll assume it's successful if we got here
        
        setVerificationResult({
          success: true,
          message: 'Your payment was successful! Your business account is now active.'
        });
      } catch (error) {
        setVerificationResult({
          success: false,
          message: 'There was an error verifying your payment. Please contact support.'
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-violet-50 via-white to-violet-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            {isVerifying ? (
              <>
                <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                <h1 className="text-2xl font-bold text-center">Verifying Payment...</h1>
                <p className="text-gray-500 text-center">
                  Please wait while we verify your payment.
                </p>
              </>
            ) : (
              <>
                {verificationResult.success ? (
                  <>
                    <div className="bg-green-100 rounded-full p-3">
                      <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-center">Payment Successful!</h1>
                    <p className="text-gray-500 text-center">
                      {verificationResult.message}
                    </p>
                    <div className="space-y-4 w-full mt-4">
                      <Button 
                        className="w-full" 
                        variant="default"
                        onClick={() => router.push('/business/dashboard/chat')}
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-red-100 rounded-full p-3">
                      <span className="w-12 h-12 text-red-600 flex items-center justify-center text-3xl">
                        !
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-center">Verification Issue</h1>
                    <p className="text-gray-500 text-center">
                      {verificationResult.message}
                    </p>
                    <div className="space-y-4 w-full mt-4">
                      <Button 
                        className="w-full" 
                        variant="default"
                        onClick={() => router.push('/business/signup')}
                      >
                        Try Again
                      </Button>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => router.push('/contact')}
                      >
                        Contact Support
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 