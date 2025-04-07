'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

interface AvailabilityCalendarProps {
  serviceId: number
  className?: string
}

export default function AvailabilityCalendar({ serviceId, className }: AvailabilityCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())

  // In a real application, you would fetch availability data based on the serviceId and selected date
  const availableSlots = [
    { time: "09:00 AM", available: true },
    { time: "10:00 AM", available: false },
    { time: "11:00 AM", available: true },
    { time: "12:00 PM", available: true },
    { time: "01:00 PM", available: false },
    { time: "02:00 PM", available: true },
    { time: "03:00 PM", available: true },
    { time: "04:00 PM", available: false },
    { time: "05:00 PM", available: true },
  ]

  return (
    <div className={className}>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {availableSlots.map((slot, index) => (
          <Button
            key={index}
            variant={slot.available ? "outline" : "ghost"}
            className={slot.available ? "hover:bg-violet-100" : "opacity-50 cursor-not-allowed"}
            disabled={!slot.available}
          >
            {slot.time}
          </Button>
        ))}
      </div>
    </div>
  )
}

