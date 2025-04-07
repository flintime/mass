'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, Users, Clock, MapPin, Star } from 'lucide-react'

const faqs = [
  { 
    question: 'What is Flintime?',
    answer: 'Flintime is a platform that connects users with local service providers for various needs including home services, auto services, pet care, and professional services.'
  },
  {
    question: 'How does Flintime work?',
    answer: 'Users can search for services, compare providers, read reviews, and book appointments directly through our platform. Service providers can list their services and manage bookings.'
  },
  {
    question: 'Is Flintime available in my area?',
    answer: 'Flintime is expanding rapidly. Please check our service area page or enter your location on our homepage to see if we\'re available in your area.'
  },
  {
    question: 'How do I become a service provider on Flintime?',
    answer: 'To become a service provider, visit our "For Business" page and follow the sign-up process. You\'ll need to provide information about your services, pricing, and availability.'
  },
]

const testimonials = [
  { name: 'Alice Johnson', role: 'Homeowner', content: 'Flintime has made finding reliable home services so much easier. I love the convenience!', rating: 5 },
  { name: 'Bob Smith', role: 'Pet Owner', content: 'The pet care services on Flintime are top-notch. I always feel confident leaving my pets with the sitters I find here.', rating: 4 },
  { name: 'Carol White', role: 'Small Business Owner', content: 'As a service provider, Flintime has helped me grow my business and connect with new clients effortlessly.', rating: 5 },
]

const features = [
  { title: 'Verified Providers', description: 'All service providers go through a rigorous verification process.', icon: CheckCircle },
  { title: 'Easy Scheduling', description: 'Book services at your convenience with our user-friendly system.', icon: Clock },
  { title: 'Community Reviews', description: 'Make informed decisions with genuine user reviews.', icon: Users },
  { title: 'Local Focus', description: 'Find services in your area, supporting local businesses.', icon: MapPin },
]

export default function AboutPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', { name, email, message })
    toast({
      title: "Message sent!",
      description: "We'll get back to you as soon as possible.",
    })
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <motion.h1 
          className="text-5xl font-bold text-center mb-8 text-violet-800"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          About Flintime
        </motion.h1>

        <motion.section 
          className="mb-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-4 text-violet-700">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              At Flintime, we're on a mission to revolutionize the way people access and provide local services. 
              We believe in creating a seamless connection between service providers and customers, 
              fostering a community built on trust, quality, and convenience for home, auto, pet, and personal services.
            </p>
          </div>
        </motion.section>

        <motion.section 
          className="mb-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-3xl font-semibold mb-8 text-center text-violet-700">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center text-violet-700">
                    <feature.icon className="mr-2 h-6 w-6" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        <motion.section 
          className="mb-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-3xl font-semibold mb-8 text-center text-violet-700">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-violet-700">{testimonial.name}</CardTitle>
                  <CardDescription>{testimonial.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 italic">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        <motion.section 
          className="mb-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h2 className="text-3xl font-semibold mb-8 text-center text-violet-700">Learn More</h2>
          <Tabs defaultValue="faq" className="w-full max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="contact">Contact Us</TabsTrigger>
            </TabsList>
            <TabsContent value="faq">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Find answers to common questions about Flintime.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-violet-700 hover:text-violet-900">{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-gray-700">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                  <CardDescription>Have questions or feedback? We'd love to hear from you!</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Committed to accessibility for all users. Read our <a href="/accessibility" className="text-violet-600 hover:underline">Accessibility Statement</a>.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                      <Textarea 
                        id="message" 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        required 
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700">Send Message</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.section>
      </div>
    </div>
  )
}

