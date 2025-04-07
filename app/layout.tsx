import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import ClientLayout from './client-layout'
import GoogleMapsScript from '@/components/GoogleMapsScript'
import './globals.css'
import { ConditionalSocketProvider } from '@/app/components/ConditionalSocketProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Flintime - Find and Book Local Services',
  description: 'Discover and book trusted local service providers for all your needs.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleMapsScript />
        <ConditionalSocketProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ConditionalSocketProvider>
        <Toaster />
      </body>
    </html>
  )
}

