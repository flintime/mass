'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RefundPolicy() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Flintime Cancellation and Refund Policy</h1>
        <p className="text-gray-600">
          Effective Date: 20th March, 2025
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>1. Appointment Cancellations</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Users may cancel appointments requested through Flintime only until the business approves or confirms the appointment.</li>
            <li>Once an appointment is approved by the business, cancellations must be handled directly with the business.</li>
            <li>Flintime encourages timely communication between users and businesses to manage cancellations or rescheduling effectively.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>2. Business Subscription Cancellations</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Businesses can cancel their subscription at any time.</li>
            <li>Subscription cancellations become effective at the end of the current billing cycle.</li>
            <li>After cancellation, businesses retain access to Flintime services until the end of the billing period.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>3. Refunds</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Flintime does not charge users for appointments; therefore, no refunds apply to appointment bookings.</li>
            <li>Flintime does not provide refunds for partial months or unused portions of subscription periods.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>4. Billing Issues</h2>
          <p>
            If you experience billing issues or discrepancies related to Flintime's subscription payments, please contact our support at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>5. Policy Changes</h2>
          <p>
            Flintime reserves the right to update this Cancellation and Refund Policy periodically. Significant changes will be communicated directly to users and businesses.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            For questions or clarifications about cancellations or refunds, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
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