'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Disclaimer() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Disclaimer and Limitation of Liability</h1>
        <p className="text-gray-600">
          Effective Date: March 20, 2025
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>1. Introduction</h2>
          <p>
            This Disclaimer and Limitation of Liability document ("Disclaimer") applies to your use of the Flintime platform, including our website, mobile applications, and all related services (collectively, the "Service") provided by Flintime INC. ("Flintime," "we," "us," or "our").
          </p>
          <p>
            By accessing or using Flintime, you acknowledge that you have read, understood, and agree to be bound by this Disclaimer. If you do not agree with any part of this Disclaimer, you should not use our Service.
          </p>
        </section>

        <section className="mb-8">
          <h2>2. No Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. FLINTIME EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p>
            We do not warrant that:
          </p>
          <p>
            • The Service will meet your specific requirements<br />
            • The Service will be uninterrupted, timely, secure, or error-free<br />
            • The results obtained from using the Service will be accurate or reliable<br />
            • The quality of any products, services, information, or other material purchased or obtained through the Service will meet your expectations<br />
            • Any errors in the Service will be corrected
          </p>
        </section>

        <section className="mb-8">
          <h2>3. Third-Party Services</h2>
          <p>
            Flintime integrates with and relies on various third-party services to provide our platform functionality. We make no warranty or representation regarding the accuracy, reliability, quality, or suitability of any third-party services integrated with our platform.
          </p>
          <p>
            You acknowledge that:
          </p>
          <p>
            • Flintime does not control third-party services and is not responsible for their availability, reliability, or functionality<br />
            • Any issues arising from the use of third-party services should be directed to the respective service provider<br />
            • Third-party services may have their own terms of service and privacy policies that you are subject to when using those services
          </p>
          <p>
            For more information about the third-party services we use, please see our <a href="/third-party-links" className="text-violet-600 hover:underline">Third-Party Links and Integrations Disclosure</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>4. Business Listings and User-Generated Content</h2>
          <p>
            Flintime allows businesses to create profiles and upload content to our platform. We also enable users to book appointments with these businesses. However:
          </p>
          <p>
            • We do not verify the accuracy or completeness of information provided by businesses<br />
            • We do not guarantee the quality, safety, legality, or appropriateness of any business or its services<br />
            • We do not endorse any business listed on our platform<br />
            • We are not responsible for any disputes that may arise between users and businesses
          </p>
          <p>
            You acknowledge that you are solely responsible for verifying the credentials, qualifications, and suitability of any business you choose to interact with through our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2>5. AI-Generated Content</h2>
          <p>
            Flintime utilizes artificial intelligence (AI) technologies to enhance user experience, including AI-powered chat, recommendations, and responses. Regarding AI-generated content:
          </p>
          <p>
            • AI-generated content is provided for informational purposes only and should not be considered professional advice<br />
            • AI systems may occasionally produce inaccurate, incomplete, or inappropriate responses<br />
            • We do not guarantee the accuracy, completeness, or appropriateness of any AI-generated content<br />
            • You should independently verify any important information provided by our AI systems
          </p>
          <p>
            For more information about our AI features, please see our <a href="/ai-transparency" className="text-violet-600 hover:underline">AI Transparency Statement</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>6. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL FLINTIME, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, PARTNERS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </p>
          <p>
            • Your access to or use of or inability to access or use the Service<br />
            • Any conduct or content of any third party on the Service<br />
            • Any content obtained from the Service<br />
            • Unauthorized access, use, or alteration of your transmissions or content<br />
            • Any transactions between users and businesses on our platform<br />
            • Responses generated by our AI systems
          </p>
          <p>
            IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT PAID BY YOU TO FLINTIME, IF ANY, IN THE PAST SIX (6) MONTHS, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
          </p>
        </section>

        <section className="mb-8">
          <h2>7. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Flintime, its directors, officers, employees, agents, partners, and suppliers from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from or relating to:
          </p>
          <p>
            • Your use of and access to the Service<br />
            • Your violation of any provision of our Terms of Service or this Disclaimer<br />
            • Your violation of any third-party right, including without limitation any intellectual property right, publicity, confidentiality, property, or privacy right<br />
            • Any content you upload, post, transmit, or otherwise make available through the Service<br />
            • Your interactions with any businesses or other users of the Service<br />
            • Any misuse of our AI features
          </p>
        </section>

        <section className="mb-8">
          <h2>8. Exclusions and Limitations</h2>
          <p>
            Some jurisdictions do not allow the exclusion of certain warranties or the limitation or exclusion of liability for certain types of damages. Therefore, some of the above limitations in this section may not apply to you.
          </p>
          <p>
            Nothing in this Disclaimer shall limit or exclude our liability for:
          </p>
          <p>
            • Death or personal injury resulting from our negligence<br />
            • Fraud or fraudulent misrepresentation<br />
            • Any other liability that cannot be excluded or limited by applicable law
          </p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>
            If you have any questions about this Disclaimer, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
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