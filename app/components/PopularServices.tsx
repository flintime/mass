'use client'

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from 'next/image'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from "@/components/ui/use-toast"

const popularServices = [
  { name: 'House Cleaning', image: '/placeholder.svg?height=200&width=300', price: '$50/hr' },
  { name: 'Car Wash', image: '/placeholder.svg?height=200&width=300', price: '$30' },
  { name: 'Dog Walking', image: '/placeholder.svg?height=200&width=300', price: '$20/hr' },
  { name: 'Tax Preparation', image: '/placeholder.svg?height=200&width=300', price: '$150' },
  { name: 'Lawn Mowing', image: '/placeholder.svg?height=200&width=300', price: '$40' },
  { name: 'Plumbing', image: '/placeholder.svg?height=200&width=300', price: '$80/hr' },
]

export default function PopularServices() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex + 1 === popularServices.length ? 0 : prevIndex + 1
    )
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex - 1 < 0 ? popularServices.length - 1 : prevIndex - 1
    )
  }

  const handleBookNow = (serviceName: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const params = new URLSearchParams();
          params.set('query', serviceName);
          params.set('location', 'Current Location');
          params.set('lat', latitude.toString());
          params.set('lng', longitude.toString());
          router.push(`/search?${params.toString()}`);
        },
        () => {
          // If location access is denied, just search with the service name
          toast({
            title: "Location access denied",
            description: "Please enable location access for better service matching",
            variant: "destructive",
          });
          const params = new URLSearchParams();
          params.set('query', serviceName);
          router.push(`/search?${params.toString()}`);
        }
      );
    } else {
      // If geolocation is not supported, just search with the service name
      const params = new URLSearchParams();
      params.set('query', serviceName);
      router.push(`/search?${params.toString()}`);
    }
  };

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-8 text-center">Popular Services</h2>
      <div className="relative">
        <Button 
          variant="outline" 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
          onClick={nextSlide}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="overflow-hidden">
          <AnimatePresence initial={false} custom={currentIndex}>
            <motion.div 
              key={currentIndex}
              custom={currentIndex}
              variants={{
                enter: (direction: number) => ({
                  x: direction > 0 ? 1000 : -1000,
                  opacity: 0
                }),
                center: {
                  zIndex: 1,
                  x: 0,
                  opacity: 1
                },
                exit: (direction: number) => ({
                  zIndex: 0,
                  x: direction < 0 ? 1000 : -1000,
                  opacity: 0
                })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="flex"
            >
              {[...popularServices, ...popularServices].slice(currentIndex, currentIndex + 4).map((service, index) => (
                <Card key={index} className="flex-shrink-0 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-2">
                  <Image 
                    src={service.image} 
                    alt={service.name} 
                    width={300} 
                    height={200} 
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                    <p className="text-gray-600">Starting from {service.price}</p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button 
                      className="w-full bg-violet-600 hover:bg-violet-700"
                      onClick={() => handleBookNow(service.name)}
                    >
                      Book Now
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

