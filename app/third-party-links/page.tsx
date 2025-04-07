'use client';

import Link from 'next/link';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ThirdPartyLinksPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4 text-violet-600 hover:text-violet-700 hover:bg-violet-50 -ml-3"
          asChild
        >
          <Link href="/">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Third-Party Links & Integrations</h1>
        <p className="text-gray-600">
          Information about external services and integrations we use to enhance your experience.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>Overview</h2>
          <p>
            At Flintime, we utilize various third-party services and integrations to provide you with a seamless experience. This page explains how we use these external services, what data might be shared with them, and how they enhance your experience with our platform.
          </p>
          <p>
            Please note that when you interact with these third-party services, you may also be subject to their terms of service and privacy policies. We encourage you to review those policies when applicable.
          </p>
        </section>

        <section className="mb-8">
          <h2>Payment Processing</h2>
          <p>
            We use secure third-party payment processors to handle financial transactions on our platform. These services help us process subscriptions and payments securely.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-2">Payment Processors</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Stripe</span>: Used for processing credit card payments and subscriptions.
                <div className="text-sm text-gray-600 mt-1">
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline">
                    Privacy Policy <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            </ul>
          </div>
          <p className="text-sm bg-violet-50 p-3 rounded-lg">
            Note: Flintime does not store your full credit card information. All payment processing is handled securely by our payment processors.
          </p>
        </section>

        <section className="mb-8">
          <h2>Hosting and Infrastructure</h2>
          <p>
            Our application and data are hosted on reliable cloud infrastructure to ensure security, availability, and performance.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-2">Infrastructure Providers</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">DigitalOcean</span>: Used for application hosting and data storage.
                <div className="text-sm text-gray-600 mt-1">
                  <p>DigitalOcean provides a secure cloud platform with SOC 2 Type II certification, DDoS protection, and comprehensive security measures guided by six security pillars. Their platform includes robust data center compliance, GDPR adherence, and transparent security practices.</p>
                  <a href="https://docs.digitalocean.com/platform/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline mt-1">
                    Platform Documentation <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2>Maps and Location Services</h2>
          <p>
            To provide location-based features, we integrate with mapping and geocoding services that help display and process address information.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Mapping Services</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Google Maps</span>: Used for displaying maps, geocoding addresses, and providing location-based services.
                <div className="text-sm text-gray-600 mt-1">
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline">
                    Privacy Policy <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2>Analytics and Performance Monitoring</h2>
          <p>
            We use analytics services to understand how users interact with our platform, identify issues, and improve your experience.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Analytics Services</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Google Analytics</span>: Used to collect anonymous information about how visitors use our site.
                <div className="text-sm text-gray-600 mt-1">
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline">
                    Privacy Policy <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2>AI and Machine Learning Services</h2>
          <p>
            Our platform leverages AI technologies to provide intelligent assistance, recommendation systems, and automated features.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">AI Service Providers</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">OpenAI</span>: Used for natural language processing and conversational AI features.
                <div className="text-sm text-gray-600 mt-1">
                  <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline">
                    Privacy Policy <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            </ul>
          </div>
          <p className="mt-3">
            For more information about our use of AI technology, please visit our <Link href="/ai-transparency" className="text-violet-600 hover:underline">AI Transparency</Link> page.
          </p>
        </section>

        <section className="mb-8">
          <h2>Communication Services</h2>
          <p>
            We use third-party email and communication services to send notifications, updates, and marketing communications.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Communication Providers</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Resend</span>: Used for sending transactional emails and notifications.
                <div className="text-sm text-gray-600 mt-1">
                  <p>Resend is SOC 2 Type II and GDPR compliant, with robust data encryption both at rest and in transit.</p>
                  <a href="https://resend.com/docs/security" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline mt-1">
                    Security Documentation <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2>Social Media Links</h2>
          <p>
            Our platform may include links to social media platforms. Clicking on these links will take you to external websites with their own privacy policies and terms.
          </p>
          <p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-100">
            Flintime is not responsible for the content or practices of these third-party sites. We encourage you to review their terms and privacy policies before interacting with them.
          </p>
        </section>

        <section>
          <h2>Updates to This Policy</h2>
          <p>
            We may update our list of third-party services and integrations from time to time as our platform evolves. We encourage you to review this page periodically to stay informed about the external services we use.
          </p>
          <p className="mt-4">
            If you have any questions or concerns about our use of third-party services, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
          </p>
        </section>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="flex justify-center mt-4">
          <Button variant="outline" asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 