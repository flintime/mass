'use client'

import { CheckCircle2, Calendar, Clock, MapPin, Phone, Mail, ChevronLeft, Share2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function BookingConfirmationPage() {
  const [bookingId, setBookingId] = useState<string>("");

  useEffect(() => {
    // Generate booking ID only on client side
    setBookingId("BK-" + Math.random().toString(36).substr(2, 9).toUpperCase());
  }, []);

  // In a real app, this would come from your booking state/API
  const booking = {
    id: bookingId,
    service: {
      title: "Professional House Cleaning Service",
      provider: "Clean & Shine Services",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80",
    },
    date: new Date(),
    time: "10:00 AM",
    location: "123 Main St, San Francisco, CA 94105",
    status: "confirmed",
    contactInfo: {
      phone: "+1 (555) 123-4567",
      email: "support@cleanshine.com"
    }
  }

  const nextSteps = [
    {
      title: "Prepare for the Service",
      description: "Please ensure easy access to the service area and remove any valuable items."
    },
    {
      title: "Service Provider Arrival",
      description: "Your service provider will arrive at the scheduled time. They'll call if there are any delays."
    },
    {
      title: "Service Completion",
      description: "After the service, you'll receive a notification to review and rate your experience."
    }
  ]

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Booking Confirmation',
        text: `Booking confirmed for ${booking.service.title} on ${booking.date.toLocaleDateString()} at ${booking.time}`,
        url: window.location.href
      })
    } catch (error) {
      console.log('Error sharing:', error)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/services"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Services
        </Link>

        {/* Confirmation Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-center text-center mb-6">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Your booking has been successfully confirmed.
            {bookingId && <> Booking ID: {bookingId}</>}
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={handleShare} variant="outline" className="inline-flex items-center">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button>
              Add to Calendar
            </Button>
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Booking Details</h2>
          <div className="flex gap-4 mb-6">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={booking.service.image}
                alt={booking.service.title}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{booking.service.title}</h3>
              <p className="text-gray-600">{booking.service.provider}</p>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <div className="font-medium">Date & Time</div>
                <div className="text-gray-600">
                  {booking.date.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-gray-600">{booking.time}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <div className="font-medium">Location</div>
                <div className="text-gray-600">{booking.location}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Next Steps</h2>
          <div className="space-y-6">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-medium mb-1">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Need Help?</h2>
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-600" />
              <div>
                <div className="font-medium">Phone</div>
                <a href={`tel:${booking.contactInfo.phone}`} className="text-blue-600 hover:text-blue-700">
                  {booking.contactInfo.phone}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-600" />
              <div>
                <div className="font-medium">Email</div>
                <a href={`mailto:${booking.contactInfo.email}`} className="text-blue-600 hover:text-blue-700">
                  {booking.contactInfo.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 