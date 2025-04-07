'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { businessAuth, BusinessUser as BaseBusinessUser } from '@/lib/businessAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, X, ArrowRight, Calendar, BarChart, MessageSquare, Users, Sparkles, Zap, Brain, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

// Extend the base BusinessUser interface with subscription fields
interface BusinessUser extends BaseBusinessUser {
  subscription?: {
    status: string;
    current_period_end?: number;
  };
  subscription_status?: string;
  subscription_end_date?: string | number;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [business, setBusiness] = useState<BusinessUser | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isActive: boolean;
    expiresAt: string | null;
  }>({
    isActive: false,
    expiresAt: null,
  });

  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const user = await businessAuth.getCurrentUser();
        if (!user) {
          router.push('/business/signin');
          return;
        }
        
        // Cast the user to our extended BusinessUser type
        const businessUser = user as unknown as BusinessUser;
        setBusiness(businessUser);
        
        // Check subscription status
        const isActive = 
          (businessUser.subscription && businessUser.subscription.status === 'active') || 
          businessUser.subscription_status === 'active';
        
        const expiresAt = businessUser.subscription?.current_period_end 
          ? new Date(businessUser.subscription.current_period_end * 1000).toLocaleDateString()
          : businessUser.subscription_end_date
            ? new Date(businessUser.subscription_end_date).toLocaleDateString()
            : null;
        
        setSubscriptionStatus({
          isActive,
          expiresAt
        });
      } catch (error) {
        console.error('Error loading business data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, [router]);

  const handleSubscribe = async () => {
    if (!business || !business._id) return;
    
    setCheckoutLoading(true);
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: business._id,
          businessEmail: business.email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to create checkout session. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-slate-800 overflow-hidden">
      {/* AI-themed animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-violet-500 rounded-full filter blur-[120px] animate-pulse" style={{ animationDuration: '15s' }}></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-indigo-500 rounded-full filter blur-[120px] animate-pulse" style={{ animationDuration: '20s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-1/3 h-1/3 bg-purple-500 rounded-full filter blur-[100px] animate-pulse" style={{ animationDuration: '25s' }}></div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10 relative z-10">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 animate-pulse" />
            <span className="text-xs sm:text-sm uppercase tracking-wider text-violet-600 font-semibold">AI-Powered Business Platform</span>
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center overflow-hidden">
                <Image 
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
                  alt="Flintime"
                  width={36}
                  height={36}
                />
              </div>
              <span>Business Intelligence Suite</span>
            </div>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 px-4 sm:px-0">
            Leverage cutting-edge AI technology to transform your business operations and customer engagement
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mt-6 sm:mt-8 px-2">
            <div className="flex items-center gap-1 sm:gap-2 text-violet-600 bg-violet-50 px-2 py-1 rounded-full border border-violet-100">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm">Smart Assistants</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm">AI Analytics</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm">Automated Workflows</span>
            </div>
          </div>
        </div>
        
        {/* Current Subscription Status */}
        <Card className="border border-violet-200 bg-violet-50/50 shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="pb-2 pt-4 sm:pt-6 px-4 sm:px-6 border-b border-violet-100">
            <CardTitle className="flex flex-wrap items-center gap-2 text-slate-800 text-base sm:text-lg">
              <span>Your Subscription Status</span>
              <Badge variant={subscriptionStatus.isActive ? "default" : "destructive"} className={subscriptionStatus.isActive ? "bg-green-500/90" : "bg-red-500/90"}>
                {subscriptionStatus.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              {subscriptionStatus.isActive ? (
                <>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 border border-green-300 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700 text-sm sm:text-base">Your AI business suite is active</p>
                    {subscriptionStatus.expiresAt && (
                      <p className="text-xs sm:text-sm text-slate-600">
                        Your current billing period ends on {subscriptionStatus.expiresAt}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0">
                    <X className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-700 text-sm sm:text-base">You don't have an active subscription</p>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Activate now to unlock AI-powered business features
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Details */}
        <div className="py-6">
          <div className="text-center mb-10">
            <div className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 border border-violet-200 text-violet-700 text-sm mb-4">
              Powered by Advanced Machine Learning
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Enterprise-Grade AI Features</h2>
            <p className="text-slate-600 mt-2">
              Your AI-powered business profile learns and adapts to optimize your customer engagement. Get discovered by more customers through our intelligent matching algorithms.
            </p>
          </div>

          <Card className="overflow-hidden border border-violet-200 shadow-xl rounded-xl hover:shadow-2xl hover:shadow-violet-100 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-violet-600 text-white relative overflow-hidden">
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-violet-400/20 opacity-60"></div>
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-purple-400/30 blur-xl"></div>
              <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-violet-400/30 blur-xl"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center overflow-hidden">
                      <Image 
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
                        alt="Flintime"
                        width={28}
                        height={28}
                      />
                    </div>
                    Business Intelligence Pro
                  </CardTitle>
                  <CardDescription className="text-violet-100 mt-1">
                    Advanced AI algorithms to automate customer engagement, appointment scheduling, and business discovery. Cancel anytime.
                  </CardDescription>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-4xl font-bold">$49.99</div>
                  <div className="text-white/80 text-sm">per month</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-white">
              <Separator className="mb-6 opacity-30" />
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 group">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 group-hover:from-indigo-200 group-hover:to-violet-200 flex items-center justify-center shrink-0 transition-colors duration-300 border border-violet-200">
                      <Bot className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900">AI Chatbot</h3>
                      <p className="text-sm text-slate-600">Natural language processing for automated responses to customer inquiries</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 group">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 group-hover:from-indigo-200 group-hover:to-violet-200 flex items-center justify-center shrink-0 transition-colors duration-300 border border-violet-200">
                      <Calendar className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900">Smart Scheduling</h3>
                      <p className="text-sm text-slate-600">AI-optimized appointment management with predictive availability</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 group">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 group-hover:from-purple-200 group-hover:to-violet-200 flex items-center justify-center shrink-0 transition-colors duration-300 border border-violet-200">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900">Customer Insights</h3>
                      <p className="text-sm text-slate-600">ML-driven analysis of customer behavior and sentiment</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 group">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 group-hover:from-purple-200 group-hover:to-violet-200 flex items-center justify-center shrink-0 transition-colors duration-300 border border-violet-200">
                      <Brain className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900">Predictive Analytics</h3>
                      <p className="text-sm text-slate-600">AI-powered business intelligence and forecasting</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-4 rounded-lg bg-violet-50 border border-violet-200">
                <h4 className="text-slate-900 flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  <span>AI-Enhanced Business Advantages</span>
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0" />
                    <span className="text-slate-700">ML-driven visibility in search and recommendations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0" />
                    <span className="text-slate-700">Custom AI branding optimization for your target audience</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0" />
                    <span className="text-slate-700">Priority access to new AI features and model updates</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t border-violet-100 px-6 py-4">
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-violet-200/50 transition-all duration-300"
                size="lg"
                onClick={handleSubscribe}
                disabled={checkoutLoading || subscriptionStatus.isActive}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : subscriptionStatus.isActive ? (
                  'AI Suite Activated'
                ) : (
                  <>
                    Activate AI Platform
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* AI Technology Section */}
        <div className="py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Card className="bg-white border border-violet-200 shadow-lg hover:shadow-violet-100 transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-3 border border-violet-200">
                  <Zap className="h-5 w-5 text-violet-600" />
                </div>
                <CardTitle className="text-slate-900">Real-time Learning</CardTitle>
                <CardDescription className="text-slate-600">
                  Our AI continuously optimizes based on your business performance
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-white border border-violet-200 shadow-lg hover:shadow-purple-100 transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center mb-3 border border-violet-200">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-slate-900">Conversational AI</CardTitle>
                <CardDescription className="text-slate-600">
                  Natural language processing for seamless customer interactions
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-white border border-violet-200 shadow-lg hover:shadow-indigo-100 transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-3 border border-violet-200">
                  <Brain className="h-5 w-5 text-indigo-600" />
                </div>
                <CardTitle className="text-slate-900">Smart Automation</CardTitle>
                <CardDescription className="text-slate-600">
                  Intelligent algorithms that adapt to your business needs
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
        
        {/* FAQ or Additional Info */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 sm:p-6 mt-8">
          <h3 className="text-lg font-medium mb-2 text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            Need Assistance?
          </h3>
          <p className="text-slate-700">
            If you have questions about our AI business platform or need technical support, 
            contact our AI support team at <span className="text-violet-700 font-medium">support@flintime.com</span>
          </p>
        </div>
      </div>
    </div>
  );
} 