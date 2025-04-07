'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessibilityStatement() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Accessibility Statement</h1>
        <p className="text-gray-600">
          Effective Date: March 20, 2025
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>Commitment to Accessibility</h2>
          <p>
            Flintime INC. is dedicated to ensuring that our platform and services are accessible and inclusive for all users, regardless of ability or technology. We strive to comply with applicable accessibility standards, including the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.
          </p>
        </section>

        <section className="mb-8">
          <h2>Accessibility Efforts</h2>
          <p>
            Our ongoing efforts include:
          </p>
          <ul>
            <li>Ensuring our website and platform are navigable via keyboard and screen reader technology.</li>
            <li>Regularly reviewing our platform for compliance with accessibility standards.</li>
            <li>Training our team on best practices for accessibility and inclusion.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>Feedback and Assistance</h2>
          <p>
            If you encounter accessibility barriers or have suggestions on how we can improve, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>. Your feedback is important and helps us enhance the user experience for everyone.
          </p>
        </section>

        <section className="mb-8">
          <h2>Policy Updates</h2>
          <p>
            We may periodically update this Accessibility Statement as we continue to improve and expand our accessibility efforts. Users will be notified of any significant updates.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            For accessibility-related questions or requests, please reach out to us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
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