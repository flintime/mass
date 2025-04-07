'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function IntellectualPropertyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Intellectual Property Disclosure</h1>
        <p className="text-gray-600">
          Effective Date: March 20, 2025
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-violet max-w-none">
        <section className="mb-8">
          <h2>1. Introduction</h2>
          <p>
            This Intellectual Property Disclosure ("Disclosure") outlines the intellectual property rights and restrictions related to the Flintime platform and services ("Service") provided by Flintime INC. ("we," "us," "our").
          </p>
          <p>
            By accessing or using Flintime, you acknowledge that you have read, understood, and agree to be bound by this Disclosure. If you do not agree with any part of this Disclosure, you should not use our Service.
          </p>
        </section>

        <section className="mb-8">
          <h2>2. Flintime's Intellectual Property</h2>
          <p>
            Flintime INC. owns all right, title, and interest in and to the Service, including all intellectual property rights therein. The Flintime platform, including its design, graphics, logos, website, mobile applications, and all software, text, images, audio, videos, and other materials contained therein (collectively, the "Content"), are protected by copyright, trademark, and other intellectual property laws of the United States and foreign countries.
          </p>
          <p>
            Trademarks, logos, and service marks displayed on Flintime ("Marks") are the property of Flintime INC. or other third parties. You are not permitted to use these Marks without the prior written consent of Flintime INC. or such third party that may own the Marks.
          </p>
        </section>

        <section className="mb-8">
          <h2>3. User Content and License Grant</h2>
          <p>
            As a user of Flintime, you may submit various types of content to our platform, including but not limited to business information, images, text, and other materials (collectively, "User Content").
          </p>
          <p>
            You retain all ownership rights in your User Content. However, by uploading, submitting, or otherwise making available any User Content on or through Flintime, you grant Flintime INC. a worldwide, non-exclusive, royalty-free, transferable, sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, perform, and display such User Content in connection with:
          </p>
          <ul>
            <li>Operating and providing the Service to you and other users</li>
            <li>Displaying your business information to potential customers</li>
            <li>Promoting and marketing Flintime services (with your prior consent)</li>
            <li>Improving our platform and services</li>
          </ul>
          <p>
            This license exists for the period during which the User Content is posted on Flintime and for a commercially reasonable time thereafter. This license also includes the right for other users to access and view your User Content as permitted through the functionality of the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2>4. User Representations and Warranties</h2>
          <p>
            When you submit User Content to Flintime, you represent and warrant that:
          </p>
          <ul>
            <li>You own or have the necessary rights, licenses, consents, and permissions to use and authorize Flintime to use all intellectual property rights in and to any User Content</li>
            <li>The User Content does not violate any third-party rights, including intellectual property rights and privacy rights</li>
            <li>The User Content complies with these terms and all applicable laws and regulations</li>
          </ul>
          <p>
            You are solely responsible for your User Content and the consequences of posting or publishing it. Flintime INC. is not responsible or liable for any User Content or for any loss or damage resulting from it.
          </p>
        </section>

        <section className="mb-8">
          <h2>5. AI-Generated Content</h2>
          <p>
            Flintime utilizes artificial intelligence (AI) systems to generate responses, recommendations, and other content ("AI-Generated Content"). The intellectual property rights to AI-Generated Content are governed as follows:
          </p>
          <ul>
            <li>AI responses generated through user interactions with Flintime's AI chat feature are owned by Flintime INC.</li>
            <li>Users are granted a limited, non-exclusive license to use AI-Generated Content for personal or business purposes directly related to their use of the platform</li>
            <li>Users may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, transmit, or commercially exploit AI-Generated Content without our express written permission</li>
          </ul>
          <p>
            Flintime reserves the right to use conversational data from AI interactions to train and improve our AI systems, as outlined in our <a href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>6. DMCA Compliance</h2>
          <p>
            Flintime respects the intellectual property rights of others and expects users to do the same. If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible on Flintime, please notify our copyright agent as set forth in the Digital Millennium Copyright Act of 1998 (DMCA).
          </p>
          <p>
            A proper DMCA notice must contain the following information:
          </p>
          <ul>
            <li>An electronic or physical signature of a person authorized to act on behalf of the copyright owner</li>
            <li>Identification of the copyrighted work claimed to have been infringed</li>
            <li>Identification of the material that is claimed to be infringing and where it is located on the Service</li>
            <li>Information reasonably sufficient to permit Flintime to contact you, such as your address, telephone number, and email address</li>
            <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or law</li>
            <li>A statement, made under penalty of perjury, that the above information is accurate, and that you are the copyright owner or are authorized to act on behalf of the owner</li>
          </ul>
          <p>
            DMCA notices should be sent to <a href="mailto:copyright@flintime.com" className="text-violet-600 hover:underline">copyright@flintime.com</a>.
          </p>
        </section>

        <section className="mb-8">
          <h2>7. Acceptable Use and Restrictions</h2>
          <p>
            You agree that you will not:
          </p>
          <ul>
            <li>Use, copy, adapt, modify, prepare derivative works based upon, distribute, license, sell, transfer, publicly display, publicly perform, transmit, stream, broadcast, or otherwise exploit the Service or Content, except as expressly permitted in this Disclosure</li>
            <li>Reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code of the Service or any part thereof, except to the extent that such activity is expressly permitted by applicable law</li>
            <li>Attempt to access or search the Service or Content or download Content from the Service through the use of any engine, software, tool, agent, device, or mechanism (including spiders, robots, crawlers, data mining tools, or the like) other than the software and/or search agents provided by Flintime or other generally available third-party web browsers</li>
            <li>Use the Service to violate the intellectual property rights of others</li>
          </ul>
        </section>

        <section>
          <h2>8. Contact Us</h2>
          <p>
            If you have any questions about this Intellectual Property Disclosure, please contact us at <a href="mailto:contact@flintime.com" className="text-violet-600 hover:underline">contact@flintime.com</a>.
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