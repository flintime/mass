'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCsrfToken } from '@/lib/client/csrf';

interface Product {
  name: string;
  description: string;
  features: string[];
  metadata: Record<string, string>;
}

interface PricingPlan {
  id: string;
  unit_amount: number;
  currency: string;
  interval: string;
  product: Product;
}

interface PricingData {
  monthly: PricingPlan;
  annual: PricingPlan;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchPrices() {
      try {
        // Fetch CSRF token
        const csrfToken = await fetchCsrfToken();
        if (!csrfToken) {
          throw new Error('Failed to fetch CSRF token');
        }
        
        const response = await fetch('/api/business/subscription/prices', {
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }
        const data = await response.json();
        setPricingData(data);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError('Failed to load subscription plans. Please try again.');
      }
    }

    fetchPrices();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(true);
      
      // Fetch CSRF token
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const response = await fetch('/api/business/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError('Failed to start subscription process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!pricingData && !error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
            <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-6 h-96"></div>
              <div className="bg-white rounded-lg p-6 h-96"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Choose the plan that best fits your business needs
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        {pricingData && (
          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
            {[pricingData.monthly, pricingData.annual].map((plan) => {
              const pricePerMonth = plan.interval === 'month'
                ? plan.unit_amount / 100
                : (plan.unit_amount / 100) / 12;

              const isAnnual = plan.interval === 'year';
              const savings = isAnnual
                ? Math.round((1 - (pricePerMonth / (pricingData.monthly.unit_amount / 100))) * 100)
                : 0;

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg shadow-sm divide-y divide-gray-200 bg-white ${
                    isAnnual ? 'border-indigo-200 ring-2 ring-indigo-500' : 'border-gray-200'
                  }`}
                >
                  <div className="p-6">
                    {isAnnual && (
                      <p className="absolute top-0 -translate-y-1/2 transform rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white">
                        Save {savings}%
                      </p>
                    )}
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {plan.product.name}
                    </h3>
                    {plan.product.description && (
                      <p className="mt-4 text-sm text-gray-500">
                        {plan.product.description}
                      </p>
                    )}
                    <p className="mt-8">
                      <span className="text-4xl font-extrabold text-gray-900">
                        ${pricePerMonth.toFixed(2)}
                      </span>
                      <span className="text-base font-medium text-gray-500">
                        /month
                      </span>
                      {isAnnual && (
                        <span className="text-sm text-gray-500 block mt-1">
                          Billed annually (${(plan.unit_amount / 100).toFixed(2)})
                        </span>
                      )}
                    </p>
                    <ul className="mt-6 space-y-4">
                      {plan.product.features.map((feature) => (
                        <li key={feature} className="flex space-x-3">
                          <svg
                            className="flex-shrink-0 h-5 w-5 text-green-500"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm text-gray-500">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading}
                      className={`mt-8 block w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isAnnual
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {loading ? 'Processing...' : `Subscribe Now`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Additional Information */}
        <div className="mt-12 text-center">
          <p className="text-base text-gray-500">
            Start your subscription today and get access to all features immediately.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Questions? <a href="/support" className="text-indigo-600 hover:text-indigo-500">Contact our support team</a>
          </p>
        </div>
      </div>
    </div>
  );
} 