'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Home, Car, PawPrint, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion"

const categories = [
  { name: 'Home Services', icon: Home, href: '/services/home' },
  { name: 'Auto Services', icon: Car, href: '/services/auto' },
  { name: 'Pet Services', icon: PawPrint, href: '/services/pet' },
  { name: 'Personal Services', icon: User, href: '/services/personal' },
]

export default function ServiceCategories() {
  const router = useRouter()
  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold mb-8 text-center">Service Categories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <button
              onClick={() => {
                const categoryParam = category.name.toLowerCase().replace(' services', '')
                router.push(`/search?category=${encodeURIComponent(categoryParam)}`)
              }}
              className="w-full"
            >
              <Card className="hover:shadow-lg transition-shadow group">
                <CardContent className="flex flex-col items-center p-6">
                  <category.icon className="h-12 w-12 text-violet-600 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold group-hover:text-violet-600 transition-colors">{category.name}</h3>
                </CardContent>
              </Card>
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

