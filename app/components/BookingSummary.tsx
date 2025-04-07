'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"

interface BookingSummaryProps {
  service: {
    name: string
    price: number
  }
}

export default function BookingSummary({ service }: BookingSummaryProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])


  return (
    <Card className={`transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
        <div className="text-lg">Starting from ${service.price}/hr</div>
      </CardContent>
    </Card>
  )
}

