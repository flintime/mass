'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Briefcase, Users, TrendingUp, Coffee, Bell } from 'lucide-react'

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <Card className="h-full">
      <CardHeader>
        <Icon className="w-8 h-8 mb-2 text-violet-600" />
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
)

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <motion.h1 
          className="text-5xl font-bold text-center mb-8 text-violet-800"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Careers at Flintime
        </motion.h1>
        
        <motion.section 
          className="mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-semibold mb-4 text-violet-700">Join Our Team</h2>
            <p className="text-lg mb-4 text-gray-700">
              At Flintime, we're on a mission to revolutionize the way people access and provide local services. We're looking for passionate individuals who want to make a difference and help build the future of the service industry.
            </p>
            <p className="text-lg mb-4 text-gray-700">
              As a member of our team, you'll work on challenging problems, collaborate with talented colleagues, and have the opportunity to grow both personally and professionally.
            </p>
          </div>
        </motion.section>

        <motion.section 
          className="mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-3xl font-semibold mb-8 text-center text-violet-700">Why Work at Flintime?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={Briefcase}
              title="Innovative Environment"
              description="Work on cutting-edge technology and help shape the future of local services."
            />
            <FeatureCard 
              icon={TrendingUp}
              title="Growth Opportunities"
              description="We invest in our employees' development with mentorship programs and learning resources."
            />
            <FeatureCard 
              icon={Users}
              title="Competitive Benefits"
              description="Enjoy comprehensive health coverage, retirement plans, and generous paid time off."
            />
            <FeatureCard 
              icon={Coffee}
              title="Work-Life Balance"
              description="Flexible work arrangements to help you maintain a healthy work-life balance."
            />
          </div>
        </motion.section>

        <motion.section 
          className="mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-3xl font-semibold mb-8 text-center text-violet-700">Future Opportunities</h2>
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-2xl text-violet-700">No Current Openings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-700">
                While we don't have any open positions at the moment, we're always looking to connect with talented individuals who are passionate about revolutionizing the local services industry.
              </p>
              <p className="mb-4 text-gray-700">
                We encourage you to check back regularly or follow us on social media for updates on future job openings. When positions become available, we'll post them here and across our social channels.
              </p>
              <div className="flex flex-wrap gap-4 mt-6">
                <Badge variant="secondary" className="text-sm py-1 px-2">
                  #TechInnovation
                </Badge>
                <Badge variant="secondary" className="text-sm py-1 px-2">
                  #FutureOfWork
                </Badge>
                <Badge variant="secondary" className="text-sm py-1 px-2">
                  #LocalServices
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section 
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h2 className="text-3xl font-semibold mb-8 text-violet-700">Stay Connected</h2>
          <p className="text-lg mb-6 text-gray-700">
            Follow us on social media or sign up for our newsletter to be the first to know about new job openings and company updates.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="#social-media">
                <Users className="mr-2 h-4 w-4" />
                Follow Us
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700">
              <Link href="#newsletter">
                <Bell className="mr-2 h-4 w-4" />
                Join Newsletter
              </Link>
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

