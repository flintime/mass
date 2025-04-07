'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function StripeCheckPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeInfo, setStripeInfo] = useState<any>(null);

  const checkStripeMode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/mode-check');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check Stripe mode');
      }
      
      const data = await response.json();
      setStripeInfo(data);
    } catch (error: any) {
      console.error('Error checking Stripe mode:', error);
      setError(error.message || 'An error occurred while checking Stripe mode');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStripeMode();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Stripe Mode Check</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Stripe Configuration
            {stripeInfo && (
              <Badge
                className={stripeInfo.mode === 'live' ? 'bg-green-500' : 'bg-amber-500'}
              >
                {stripeInfo.mode === 'live' ? 'LIVE MODE' : 'TEST MODE'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-red-700">
              <p className="font-medium">Error checking Stripe mode:</p>
              <p>{error}</p>
            </div>
          ) : stripeInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Mode</p>
                  <p className="font-medium">{stripeInfo.mode.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Key Type</p>
                  <p className="font-medium">{stripeInfo.keyType.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">API Version</p>
                  <p className="font-medium">{stripeInfo.apiVersion}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Working</p>
                  <p className="font-medium">{stripeInfo.isWorking ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              {stripeInfo.environment && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Supported Currencies (Sample)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stripeInfo.environment.supportedCurrencies.map((currency: string) => (
                      <Badge key={currency} variant="outline">
                        {currency}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button 
          onClick={checkStripeMode} 
          disabled={loading}
          className="gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Refresh Stripe Status
        </Button>
      </div>
    </div>
  );
} 