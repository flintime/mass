'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Terms() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Flintime Terms of Service</h1>
        <p className="text-gray-600">
          Effective Date: March 20, 2025
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>1. Introduction</h2>
          <p>Welcome to Flintime, a product of Flintime INC.! These Terms of Service ("Terms") govern your use of the Flintime platform and services ("Service"). By accessing or using Flintime, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use Flintime.</p>
          <p>We strive to be accessible to all users. Please see our <a href="/accessibility" className="text-violet-600 hover:underline">Accessibility Statement</a> for details on our accessibility features and accommodations.</p>
        </section>

        <section className="mb-8">
          <h2>2. Account Registration</h2>
          <p>To access certain features of Flintime, you may need to create an account. You are responsible for:</p>
          <p>• Providing accurate information during registration.</p>
          <p>• Maintaining the confidentiality of your account credentials.</p>
          <p>• All activities that occur under your account.</p>
          <p>We reserve the right to terminate accounts that violate these Terms.</p>
        </section>

        <section className="mb-8">
          <h2>3. User Conduct</h2>
          <p>When using Flintime, you agree not to:</p>
          <p>• Use the Service for illegal purposes.</p>
          <p>• Post false, misleading, or deceptive content.</p>
          <p>• Harass, intimidate, or discriminate against others.</p>
          <p>• Attempt to access other users' accounts without authorization.</p>
          <p>• Manipulate or interfere with the Service functionality.</p>
          <p>• Upload viruses or malicious code.</p>
        </section>

        <section className="mb-8">
          <h2>4. Business Subscription and Payments</h2>
          <p>Business users may subscribe to various plans to access additional features on Flintime. By subscribing:</p>
          <p>• You agree to pay the fees associated with your chosen plan.</p>
          <p>• Payment is processed through our trusted third-party payment processor, Stripe.</p>
          <p>• Subscription fees are billed automatically according to your selected billing cycle.</p>
          <p>• We reserve the right to modify pricing with reasonable notice.</p>
        </section>

        <section className="mb-8">
          <h2>5. Cancellation and Refund Policy</h2>
          <p>• Business subscriptions can be canceled at any time through your dashboard settings.</p>
          <p>• Cancellation will take effect at the end of your current billing cycle.</p>
          <p>• No refunds are provided for partial billing periods.</p>
          <p>• We may consider partial refunds for exceptional circumstances at our discretion.</p>
        </section>

        <section className="mb-8">
          <h2>6. Intellectual Property</h2>
          <p>• Flintime INC. owns all rights, title, and interest in the Service, including graphics, design, and functionality.</p>
          <p>• By uploading content (such as business images, descriptions), you retain ownership but grant Flintime a worldwide, non-exclusive, royalty-free license to use, display, and distribute such content on the platform.</p>
          <p>• You represent that you have the necessary rights to grant this license.</p>
          <p>• For more information, please see our <a href="/intellectual-property" className="text-violet-600 hover:underline">Intellectual Property Disclosure</a>.</p>
        </section>

        <section className="mb-8">
          <h2>7. Use of AI and Automated Systems</h2>
          <p>Flintime uses artificial intelligence and automated systems to enhance the user experience. When using these features:</p>
          <p>• You understand that AI responses are generated automatically and may not always be perfect.</p>
          <p>• AI interactions are used to train and improve our systems unless you opt out.</p>
          <p>• Business information provided via the FeedAI page is used to improve AI responses.</p>
          <p>• For more details, see our <a href="/ai-transparency" className="text-violet-600 hover:underline">AI Transparency Statement</a>.</p>
        </section>

        <section className="mb-8">
          <h2>8. Business Data Accuracy</h2>
          <p>Business users are responsible for:</p>
          <p>• Providing accurate information about their business, services, pricing, and availability.</p>
          <p>• Promptly updating information as changes occur.</p>
          <p>• Honestly representing the services they offer.</p>
          <p>Failure to maintain accurate business data may result in account suspension.</p>
        </section>

        <section className="mb-8">
          <h2>9. Third-Party Services and Links</h2>
          <p>Flintime integrates with various third-party services to provide a comprehensive platform experience. By using our Service, you acknowledge that:</p>
          <p>• We utilize third-party services for payment processing, hosting, communication, analytics, and other essential functions.</p>
          <p>• These third-party services have their own terms of service and privacy policies.</p>
          <p>• While we carefully select our partners, we are not responsible for the content, policies, or practices of third-party services.</p>
          <p>• Your interactions with these third-party services are subject to their respective terms and policies.</p>
          <p>For a comprehensive list of the third-party services we use and links to their respective policies, please refer to our <a href="/third-party-links" className="text-violet-600 hover:underline">Third-Party Links and Integrations Disclosure</a>.</p>
        </section>

        <section className="mb-8">
          <h2>10. Communication Preferences</h2>
          <p>By using Flintime, you consent to receive communications from us, including:</p>
          <p>• Service updates and administrative messages.</p>
          <p>• Appointment confirmations and reminders.</p>
          <p>• Marketing communications (which you may opt out of).</p>
          <p>• Business users agree to receive booking notifications and customer inquiries.</p>
        </section>

        <section className="mb-8">
          <h2>11. Appointments and Cancellations</h2>
          <p>• Users can book appointments with businesses through Flintime.</p>
          <p>• Appointment cancellation policies are set by individual businesses.</p>
          <p>• Users should review business-specific cancellation policies before booking.</p>
          <p>• Flintime facilitates but does not enforce cancellation policies.</p>
        </section>

        <section className="mb-8">
          <h2>12. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law:</p>
          <p>• Flintime INC. provides the Service "as is" without warranties of any kind.</p>
          <p>• We are not liable for any indirect, incidental, or consequential damages.</p>
          <p>• Our total liability for any claims is limited to the amount paid by you to Flintime in the past six months.</p>
          <p>• We are not responsible for the quality of services provided by businesses on our platform.</p>
          <p>For complete details, please see our <a href="/disclaimer" className="text-violet-600 hover:underline">Disclaimer and Limitation of Liability</a> document.</p>
        </section>

        <section className="mb-8">
          <h2>13. Dispute Resolution</h2>
          <p>• Any disputes arising from these Terms will be governed by the laws of California.</p>
          <p>• Before pursuing legal action, both parties agree to attempt good-faith negotiation.</p>
          <p>• Any legal proceedings must be brought in the courts of California.</p>
        </section>

        <section className="mb-8">
          <h2>14. Modifications to Terms</h2>
          <p>Flintime INC. reserves the right to modify these Terms at any time. We will notify users of significant changes through:</p>
          <p>• Email notifications to registered users.</p>
          <p>• Notices on the Flintime platform.</p>
          <p>Continued use of Flintime after changes constitutes acceptance of the updated Terms.</p>
        </section>

        <section>
          <h2>15. Contact Information</h2>
          <p>If you have any questions or concerns about these Terms, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.</p>
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

