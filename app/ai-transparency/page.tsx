'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AITransparency() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Flintime AI Transparency and Usage Disclosure</h1>
        <p className="text-gray-600">
          Effective Date: March 20th, 2025
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>1. Introduction</h2>
          <p>
            Flintime, a product of Flintime INC., leverages artificial intelligence (AI) technology to enhance the functionality and user experience of our platform. This disclosure explains how AI technology is used in Flintime and what you can expect when interacting with our AI-powered services.
          </p>
        </section>

        <section className="mb-8">
          <h2>2. How AI is Used</h2>
          <p>Flintime employs AI for:</p>
          <ul>
            <li><strong>Search and Recommendations:</strong> AI-powered search features that help match your service requests with suitable businesses.</li>
            <li><strong>Chat Interactions:</strong> Automated AI chatbots assist in booking appointments, providing business information, answering queries, and managing communications efficiently.</li>
            <li><strong>Customization:</strong> AI utilizes information provided by businesses, such as service details, pricing, promotions, business hours, and custom responses, to generate accurate, timely, and personalized interactions.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>3. AI-Generated Responses</h2>
          <p>
            AI-driven chat responses aim to streamline your experience, but they may not always reflect real-time availability or complete accuracy. While Flintime continually improves its AI systems, please verify critical details directly with the businesses involved.
          </p>
        </section>

        <section className="mb-8">
          <h2>4. Business Control of AI</h2>
          <p>
            Businesses on Flintime can toggle AI assistance on or off at their discretion. If AI assistance is disabled, interactions will be managed directly by the business, without automated AI involvement.
          </p>
        </section>

        <section className="mb-8">
          <h2>5. Data and AI</h2>
          <p>
            Your interactions with AI, including chat messages, appointment information, email preferences, and other engagement details, are used to train and improve our AI services. Flintime INC. respects your privacy and manages your data securely in accordance with our Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2>6. Human Oversight</h2>
          <p>
            Although AI supports interactions on Flintime, significant decisions—such as appointment confirmations, cancellations, or substantial account changes—always involve human oversight.
          </p>
        </section>

        <section className="mb-8">
          <h2>7. Feedback and Concerns</h2>
          <p>
            We encourage you to provide feedback regarding your experience with our AI systems. If you encounter issues or inaccuracies, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>8. Updates to This Disclosure</h2>
          <p>
            Flintime INC. may periodically update this AI Transparency and Usage Disclosure. Users will be notified of any substantial changes.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            For any questions or feedback regarding our use of AI, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
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