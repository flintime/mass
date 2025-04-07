'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { businessAuth } from '@/lib/businessAuth';
import { Loader2 } from 'lucide-react';

interface SubscriptionRequiredProps {
  children: ReactNode;
}

// Define the extended user type with subscription properties
interface BusinessUserWithSubscription extends ReturnType<typeof businessAuth.getCurrentUser> {
  subscription?: {
    status: string;
  };
  subscription_status?: string;
}

export default function SubscriptionRequired({ children }: SubscriptionRequiredProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        console.log('SubscriptionRequired: Checking business authentication...');
        
        // First check if the auth initialization flag is set
        const isAuthInitialized = typeof window !== 'undefined' && window.businessAuthInitialized;
        const token = businessAuth.getToken();
        
        console.log('SubscriptionRequired: Auth status:', {
          initialized: isAuthInitialized,
          tokenPresent: !!token,
          tokenLength: token ? token.length : 0
        });
        
        // Check if we have a valid token before trying to get the user
        if (!token) {
          console.log('SubscriptionRequired: No authentication token found, redirecting to signin');
          router.push('/business/signin?redirect=' + encodeURIComponent(window.location.pathname));
          return;
        }
        
        // Wait a moment if auth isn't fully initialized yet
        if (!isAuthInitialized) {
          console.log('SubscriptionRequired: Auth not fully initialized, waiting briefly...');
          // Wait briefly and check again
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check token again after waiting
          const tokenAfterWait = businessAuth.getToken();
          if (!tokenAfterWait) {
            console.log('SubscriptionRequired: Token still not available after waiting, redirecting to signin');
            router.push('/business/signin?redirect=' + encodeURIComponent(window.location.pathname));
            return;
          }
        }
        
        // Try to get the current user
        console.log('SubscriptionRequired: Fetching current user...');
        const user = await businessAuth.getCurrentUser();
        
        console.log('SubscriptionRequired: User fetch result:', {
          userFound: !!user,
          userId: user?._id,
          email: user?.email,
          businessName: user?.business_name
        });
        
        if (!user) {
          console.log('SubscriptionRequired: No user data returned, redirecting to signin');
          router.push('/business/signin?redirect=' + encodeURIComponent(window.location.pathname));
          return;
        }
        
        // Type assertion to access subscription properties
        const businessUser = user as any;
        
        // Check subscription status from the business data
        const hasSubscription = 
          (businessUser.subscription && businessUser.subscription.status === 'active') || 
          businessUser.subscription_status === 'active';
        
        console.log('SubscriptionRequired: Subscription check result:', {
          hasSubscription,
          subscriptionStatus: businessUser.subscription?.status || 'none',
          legacyStatus: businessUser.subscription_status || 'none'
        });
        
        if (!hasSubscription) {
          // Redirect to subscription page
          console.log('SubscriptionRequired: No active subscription, redirecting to subscription page');
          router.push('/business/subscription');
          return;
        }
        
        console.log('SubscriptionRequired: User has active subscription, allowing access');
        setHasActiveSubscription(true);
      } catch (error) {
        console.error('SubscriptionRequired: Error checking subscription:', error);
        
        // Check if the error is related to missing auth token
        if (error instanceof Error && 
            error.message.includes('No authentication token found')) {
          console.log('SubscriptionRequired: Authentication token error, redirecting to signin');
          
          // Clear any potentially corrupted token
          businessAuth.signout();
          
          // Redirect to signin page
          router.push('/business/signin?redirect=' + encodeURIComponent(window.location.pathname));
        } else {
          // For other errors, also redirect to signin as a fallback
          console.log('SubscriptionRequired: Unexpected error, redirecting to signin');
          router.push('/business/signin?redirect=' + encodeURIComponent(window.location.pathname));
        }
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [router]);

  if (loading) {
    // Return either children with reduced opacity or a minimal loading indicator
    // This makes the loading state less obtrusive
    return (
      <div className="w-full h-full">
        {children}
        <div className="fixed bottom-4 right-4">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600 opacity-70" />
        </div>
      </div>
    );
  }

  if (!hasActiveSubscription) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
} 