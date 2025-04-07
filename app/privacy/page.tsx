'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Flintime Privacy Policy</h1>
        <p className="text-gray-600">
          Effective Date: 20th March, 2025
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Flintime, a product of Flintime INC.! Your privacy is important to us. This Privacy Policy outlines how Flintime INC. collects, uses, stores, and protects your personal information when you use our platform and services.
          </p>
          <p className="text-gray-700 mt-2">
            We strive for accessibility. Read more in our <a href="/accessibility" className="text-violet-600 hover:underline">Accessibility Statement</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>2. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <p>
            • <strong>Personal Information:</strong> Name, email address, phone number, and other registration details.
          </p>
          <p>
            • <strong>Appointment Information:</strong> Details of bookings made through Flintime.
          </p>
          <p>
            • <strong>Business Information:</strong> Information provided by businesses, such as business name, basic information, location details, contact details, service descriptions, pricing, special promotions, payment methods, business hours, custom responses (collected via the FeedAI page), and images uploaded on the profile page.
          </p>
          <p>
            • <strong>AI Chat Data:</strong> Appointment details collected through AI chat interactions, user email preferences, chat messages, AI-generated responses, and related interactions used to train and improve AI responses.
          </p>
          <p>
            • <strong>Usage Data:</strong> Information about your interactions with Flintime, including IP address, browser type, and usage patterns.
          </p>
        </section>

        <section className="mb-8">
          <h2>3. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <p>
            • Provide, maintain, and improve Flintime services.
          </p>
          <p>
            • Facilitate bookings and communication between users and businesses.
          </p>
          <p>
            • Send notifications and updates regarding appointments and services.
          </p>
          <p>
            • Enhance user experience and personalize content.
          </p>
          <p>
            • Ensure platform security and prevent fraudulent activities.
          </p>
          <p>
            • Improve AI responses and recommendations through information provided by businesses via the FeedAI page and through AI chat interactions.
          </p>
        </section>

        <section className="mb-8">
          <h2>4. Sharing Your Information</h2>
          <p>We may share your information with:</p>
          <p>
            • Businesses you interact with through Flintime for appointment management.
          </p>
          <p>
            • Third-party service providers necessary to operate our services, including:
          </p>
          <p className="ml-6">
            - <strong>OpenAI</strong> for AI-powered interactions and responses.<br />
            - <strong>Stripe</strong> for secure payment processing.<br />
            - <strong>DigitalOcean</strong> for cloud database storage and hosting.<br />
            - <strong>Resend</strong> for email notifications to users and businesses.
          </p>
          <p>
            • Law enforcement or authorities when required by law.
          </p>
          <p>
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2>5. International Users</h2>
          <p>
            If you are accessing Flintime from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States. Flintime INC. complies with applicable international data protection standards such as the General Data Protection Regulation (GDPR).
          </p>
        </section>

        <section className="mb-8">
          <h2>6. California Privacy Rights (CCPA)</h2>
          <p>
            If you are a resident of California, you have the right to request information about how we share certain categories of your personal data with third parties. You can exercise these rights by contacting us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>7. Automated Decision-Making Transparency</h2>
          <p>
            Flintime uses AI technology to provide recommendations and responses through automated decision-making processes. While AI enhances our service, significant decisions impacting your account or bookings always include human oversight.
          </p>
        </section>

        <section className="mb-8">
          <h2>8. Data Security</h2>
          <p>
            Flintime INC. implements industry-standard security measures to protect your information from unauthorized access, disclosure, or alteration.
          </p>
        </section>

        <section className="mb-8">
          <h2>9. Cookies and Tracking</h2>
          <p>
            Flintime uses cookies and similar tracking technologies to enhance your browsing experience, analyze platform usage, and provide tailored content. You may adjust cookie preferences through your browser settings. For more details about cookies, please see our <a href="/cookie-policy" className="text-violet-600 hover:underline">Cookie Policy</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>10. Data Retention</h2>
          <p>
            We retain your personal information only as long as necessary to fulfill purposes outlined in this Privacy Policy, comply with legal obligations, or resolve disputes.
          </p>
        </section>

        <section className="mb-8">
          <h2>11. Your Rights</h2>
          <p>You have the right to:</p>
          <p>
            • Access, update, or request deletion of your personal information.
          </p>
          <p>
            • Object to or restrict the processing of your data.
          </p>
          <p>
            • Withdraw consent for data processing, where applicable.
          </p>
          <p>
            To exercise these rights, contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>12. Third-Party Links</h2>
          <p>
            Flintime may contain links to third-party websites and we use various third-party services to operate our platform. We are not responsible for the privacy practices of third-party services. Please review their respective privacy policies.
          </p>
          <p>
            We use third-party services for payment processing, hosting, analytics, mapping, and communication. See our <a href="/third-party-links" className="text-violet-600 hover:underline">Third-Party Links and Integrations Disclosure</a> for more details.
          </p>
        </section>

        <section className="mb-8">
          <h2>13. Children's Privacy</h2>
          <p>
            Flintime does not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2>14. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy periodically. Significant changes will be communicated to you directly. Continued use of Flintime after updates implies acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2>15. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
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


