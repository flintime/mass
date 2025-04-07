'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion } from "framer-motion"

const testimonials = [
  {
    name: "Alice Johnson",
    avatar: "https://i.pravatar.cc/150?img=1",
    role: "Homeowner",
    content: "Flintime made it so easy to find a reliable house cleaner. Great service!"
  },
  {
    name: "Bob Smith",
    avatar: "https://i.pravatar.cc/150?img=2",
    role: "Car Owner",
    content: "I use Flintime for all my car maintenance needs. It's quick and convenient."
  },
  {
    name: "Carol Williams",
    avatar: "https://i.pravatar.cc/150?img=3",
    role: "Pet Owner",
    content: "Finding a pet sitter has never been easier. Thank you, Flintime!"
  }
]

export default function Testimonials() {
  return (
    <section className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">What Our Customers Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4">{testimonial.content}</p>
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

