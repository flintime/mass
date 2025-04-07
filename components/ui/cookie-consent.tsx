"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted'

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!hasAccepted) {
      setIsVisible(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true')
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-white shadow-lg border-t border-gray-200",
      // Mobile-first styling
      "flex flex-col md:flex-row md:items-center md:justify-between"
    )}>
      <div className="flex-1 mb-3 md:mb-0 md:mr-4">
        <p className="text-sm text-gray-700">
          We use cookies to improve your experience. By continuing, you agree to our use of cookies.{' '}
          <Link href="/cookie-policy" className="text-violet-600 hover:underline font-medium">
            Learn more
          </Link>
        </p>
      </div>
      <div className="flex items-center justify-between md:justify-end">
        <Button
          onClick={acceptCookies}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-md"
        >
          Accept
        </Button>
        <button
          onClick={acceptCookies}
          className="ml-3 p-1 text-gray-500 hover:text-gray-700 rounded-full focus:outline-none"
          aria-label="Close cookie consent banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
} 