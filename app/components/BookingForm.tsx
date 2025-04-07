'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addDays, format, isBefore, startOfDay } from 'date-fns'

interface Service {
  id: string
  name: string
  price: number
}

interface BookingFormProps {
  serviceId: number
  serviceName: string
  services: Service[]
}

export default function BookingForm({ serviceId, serviceName, services }: BookingFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1))
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedService, setSelectedService] = useState<string>('')
  const { toast } = useToast()

  // Generate time slots in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // In a real application, you would fetch availability data based on the serviceId and selected date
  const getAvailableSlots = (selectedDate: Date) => {
    // This is a mock function. In a real app, you'd fetch this data from your backend.
    return timeSlots.map(slot => ({
      time: slot,
      available: Math.random() > 0.3 // Randomly determine availability
    }))
  }

  const availableSlots = date ? getAvailableSlots(date) : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send this data to your backend
    console.log('Booking submitted:', { serviceId, selectedService, name, email, phone, date, time, notes })
    toast({
      title: "Booking Submitted",
      description: `Your booking for ${serviceName} (${selectedService}) has been received. We'll contact you shortly to confirm.`,
    })
    // Reset form
    setName('')
    setEmail('')
    setPhone('')
    setDate(addDays(new Date(), 1))
    setTime('')
    setNotes('')
    setSelectedService('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select value={selectedService} onValueChange={setSelectedService}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a service" />
        </SelectTrigger>
        <SelectContent>
          {services.map((service) => (
            <SelectItem key={service.id} value={service.id}>
              {service.name} - ${service.price}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        disabled={(date) => isBefore(date, startOfDay(new Date()))}
        className="rounded-md border"
      />
      {date && (
        <div className="grid grid-cols-3 gap-2">
          {availableSlots.map((slot, index) => (
            <Button
              key={index}
              type="button"
              variant={slot.available ? (time === slot.time ? "default" : "outline") : "ghost"}
              className={slot.available ? "hover:bg-violet-100" : "opacity-50 cursor-not-allowed"}
              disabled={!slot.available}
              onClick={() => setTime(slot.time)}
            >
              {format(new Date(`2000-01-01T${slot.time}`), 'h:mm a')}
            </Button>
          ))}
        </div>
      )}
      <Input
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        type="email"
        placeholder="Your Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="tel"
        placeholder="Your Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <Textarea
        placeholder="Additional Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={!selectedService || !date || !time}>Book Now</Button>
    </form>
  )
}

