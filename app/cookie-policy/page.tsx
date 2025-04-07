'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CookiePolicy() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Flintime Cookie Policy</h1>
        <p className="text-gray-600">
          Effective Date: March 20, 2025
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>1. Introduction</h2>
          <p>
            This Cookie Policy explains how Flintime INC. ("Flintime," "we," "us," or "our") uses cookies and similar technologies to recognize and remember you when you visit our website and applications (collectively, the "Service"). It explains what these technologies are and why we use them, as well as your rights to control our use of them.
          </p>
          <p>
            By continuing to use our Service, you are agreeing to our use of cookies as described in this Cookie Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2>2. What Are Cookies?</h2>
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
          </p>
          <p>
            Cookies set by the website owner (in this case, Flintime) are called "first-party cookies." Cookies set by parties other than the website owner are called "third-party cookies." Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics). The parties that set these third-party cookies can recognize your device both when it visits the website in question and also when it visits certain other websites.
          </p>
        </section>

        <section className="mb-8">
          <h2>3. Why Do We Use Cookies?</h2>
          <p>
            We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Service to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Service. Third parties serve cookies through our Service for advertising, analytics, and other purposes.
          </p>
          <p>
            Specifically, we use cookies and other tracking technologies for the following purposes:
          </p>
          <p>
            • <strong>Essential cookies:</strong> These are cookies that are required for the operation of our Service. They include, for example, cookies that enable you to log into secure areas of our website, use a shopping cart, or make use of e-billing services.
          </p>
          <p>
            • <strong>Analytical/performance cookies:</strong> These allow us to recognize and count the number of visitors and to see how visitors move around our Service when they are using it. This helps us to improve the way our Service works, for example, by ensuring that users are finding what they are looking for easily.
          </p>
          <p>
            • <strong>Functionality cookies:</strong> These are used to recognize you when you return to our Service. This enables us to personalize our content for you, greet you by name, and remember your preferences (for example, your choice of language or region).
          </p>
          <p>
            • <strong>Targeting cookies:</strong> These cookies record your visit to our Service, the pages you have visited, and the links you have followed. We will use this information to make our Service and the advertising displayed on it more relevant to your interests. We may also share this information with third parties for this purpose.
          </p>
        </section>

        <section className="mb-8">
          <h2>4. Types of Cookies We Use</h2>
          <p>
            The specific types of first- and third-party cookies served through our Service and the purposes they perform include:
          </p>

          <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">Essential Website Cookies</h3>
          <p>
            These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as access to secure areas.
          </p>

          <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">Performance and Functionality Cookies</h3>
          <p>
            These cookies are used to enhance the performance and functionality of our Service but are non-essential to their use. However, without these cookies, certain functionality may become unavailable.
          </p>

          <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">Analytics and Customization Cookies</h3>
          <p>
            These cookies collect information that is used either in aggregate form to help us understand how our Service is being used or how effective our marketing campaigns are, or to help us customize our Service for you.
          </p>

          <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">Third-Party Cookies</h3>
          <p>
            We use cookies from the following third parties:
          </p>
          <p>
            • <strong>Google Analytics:</strong> Used to track website usage and user behavior.<br />
            • <strong>Stripe:</strong> Used for payment processing for business subscriptions.<br />
            • <strong>Google Maps:</strong> Used for location-based services and maps integration.
          </p>
        </section>

        <section className="mb-8">
          <h2>5. How Can You Control Cookies?</h2>
          <p>
            You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our Service though your access to some functionality and areas of our Service may be restricted. As the means by which you can refuse cookies through your web browser controls vary from browser-to-browser, you should visit your browser's help menu for more information.
          </p>
          <p>
            In addition, most advertising networks offer you a way to opt out of targeted advertising. If you would like to find out more information, please visit <a href="http://www.aboutads.info/choices/" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">http://www.aboutads.info/choices/</a> or <a href="http://www.youronlinechoices.com" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">http://www.youronlinechoices.com</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>6. Mobile Application Tracking Technologies</h2>
          <p>
            For users of our mobile applications, we and our third-party service providers may use mobile analytics software to allow us to better understand the functionality of our mobile software on your mobile device. These technologies may record information such as how often you use the application, the events that occur within the application, aggregated usage, performance data, and where the application was downloaded from.
          </p>
        </section>

        <section className="mb-8">
          <h2>7. DNT (Do Not Track) Signals</h2>
          <p>
            Some browsers feature a "Do Not Track" (DNT) setting. When this feature is enabled, the browser sends a signal to websites indicating that the user does not want to be tracked. At this time, we do not respond to DNT signals. However, we may adopt a DNT standard if one is established in the future.
          </p>
        </section>

        <section className="mb-8">
          <h2>8. Updates to This Cookie Policy</h2>
          <p>
            We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. We will notify you of any material changes to this Cookie Policy prior to the changes becoming effective by posting the changes on this page and providing a more prominent notice about the changes.
          </p>
          <p>
            Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
          </p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>
            If you have any questions about our use of cookies or other technologies, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
          </p>
        </section>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          Last updated: March 20th, 2025
        </p>
        <div className="flex justify-center mt-4">
          <Button variant="outline" asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
} 