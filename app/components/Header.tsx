'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronDown, User, LogOut, Settings, Building, MessageCircle, Calendar, MapPin, Home, Search, Bell } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { LocationSearch } from '@/components/LocationSearch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [locationValue, setLocationValue] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, logout, user, loading } = useAuth()

  // Initialize mounted state
  useEffect(() => {
    setMounted(true)
    // Load saved location from localStorage
    const savedLocation = localStorage.getItem('userLocation')
    if (savedLocation) {
      setLocationValue(savedLocation)
    }
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthChange = () => {
      setMounted(false)
      setTimeout(() => setMounted(true), 0)
    }

    window.addEventListener('auth-change', handleAuthChange)
    return () => window.removeEventListener('auth-change', handleAuthChange)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsMenuOpen(false)
  }

  // Create sign-in and sign-up URLs with return path
  const signInUrl = `/signin?returnUrl=${encodeURIComponent(pathname || '/')}`
  const signUpUrl = `/signup?returnUrl=${encodeURIComponent(pathname || '/')}`

  const handleLocationChange = (value: string, lat?: number, lng?: number) => {
    setLocationValue(value)
    if (lat && lng) {
      localStorage.setItem('userLocation', value)
      localStorage.setItem('userLocationCoords', JSON.stringify({ lat, lng }))
      // Dispatch location change event
      window.dispatchEvent(new CustomEvent('locationChange', {
        detail: {
          address: value,
          coords: { lat, lng }
        }
      }))
    }
  }

  const handleCurrentLocation = async () => {
    setIsLocating(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      const { latitude: lat, longitude: lng } = position.coords
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()

      if (data.results && data.results[0]) {
        const address = data.results[0].formatted_address
        handleLocationChange(address, lat, lng)
        // Close the location modal after setting current location
        setOpen(false)
      }
    } catch (error) {
      console.error('Error getting current location:', error)
    } finally {
      setIsLocating(false)
    }
  }

  // Function to get shortened location name for mobile display
  const getShortenedLocation = () => {
    if (!locationValue) return 'Select location';
    
    // Split by commas and take the first part (usually locality/area)
    const parts = locationValue.split(',');
    return parts[0].trim();
  }

  // Don't render until mounted and auth state is loaded
  if (!mounted || loading) {
    return (
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
              alt="Flintime"
              width={40}
              height={40}
              className="mr-2"
            />
            <span className="text-2xl font-bold text-violet-600">Flintime</span>
          </Link>
          <div className="h-10 w-[200px]" />
        </nav>
      </header>
    )
  }

  // Don't render menu content while loading or before hydration
  const renderMenuContent = () => {
    if (!mounted || loading) {
      return <div className="h-10 w-[200px]" />
    }

    return isAuthenticated ? (
      // Authenticated Header Content
      <div className="hidden md:flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>{user?.name || 'Profile'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/profile/appointments')}>
              <Calendar className="mr-2 h-4 w-4" />
              My Bookings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/chat')}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Messages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ) : (
      // Non-authenticated Header Content
      <div className="hidden md:flex space-x-4 items-center">
        <Link href="/about" className="text-gray-600 hover:text-violet-600 transition-colors">
          About
        </Link>
        <Link href={signInUrl}>
          <Button variant="outline" className="text-violet-600 border-violet-600 hover:bg-violet-50">Sign In</Button>
        </Link>
        <Link href={signUpUrl}>
          <Button className="bg-violet-600 text-white hover:bg-violet-700">Sign Up</Button>
        </Link>
      </div>
    )
  }

  // Don't render mobile menu content while loading or before hydration
  const renderMobileContent = () => {
    if (!mounted || loading) {
      return null
    }

    return isAuthenticated ? (
      // Authenticated Mobile Menu
      <>
        <div className="px-2 pb-2 mb-2 border-b border-gray-100">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <User className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="font-medium">{user?.name || 'User'}</div>
              <div className="text-xs text-gray-500">{user?.email || ''}</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-1">
        <Button
          variant="ghost"
            className="flex items-center justify-start space-x-2.5 w-full rounded-lg py-2.5"
            onClick={() => {
              router.push('/profile')
              setIsMenuOpen(false)
            }}
          >
            <User className="h-5 w-5" />
            <span>My Profile</span>
        </Button>
        <Button
          variant="ghost"
            className="flex items-center justify-start space-x-2.5 w-full rounded-lg py-2.5"
            onClick={() => {
              router.push('/profile/appointments')
              setIsMenuOpen(false)
            }}
          >
            <Calendar className="h-5 w-5" />
          <span>My Bookings</span>
        </Button>
        <Button
          variant="ghost"
            className="flex items-center justify-start space-x-2.5 w-full rounded-lg py-2.5"
            onClick={() => {
              router.push('/chat')
              setIsMenuOpen(false)
            }}
          >
            <MessageCircle className="h-5 w-5" />
          <span>Messages</span>
        </Button>
        <Button
          variant="ghost"
            className="flex items-center justify-start space-x-2.5 w-full rounded-lg py-2.5"
            onClick={() => {
              router.push('/settings')
              setIsMenuOpen(false)
            }}
          >
            <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Button>
          
          <div className="pt-2 mt-2 border-t border-gray-100">
        <Button
          variant="ghost"
              className="flex items-center justify-start space-x-2.5 w-full rounded-lg py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
              <LogOut className="h-5 w-5" />
          <span>Sign out</span>
        </Button>
          </div>
        </div>
      </>
    ) : (
      // Non-authenticated Mobile Menu
      <>
        <Link 
          href="/about" 
          className="flex items-center px-3 py-2.5 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          onClick={() => setIsMenuOpen(false)}
        >
          <Building className="h-5 w-5 mr-2.5" />
          <span>About Flintime</span>
        </Link>
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 px-2">
          <Link href={signInUrl} className="w-full block" onClick={() => setIsMenuOpen(false)}>
          <Button variant="outline" className="text-violet-600 border-violet-600 hover:bg-violet-50 w-full">Sign In</Button>
        </Link>
          <Link href={signUpUrl} className="w-full block" onClick={() => setIsMenuOpen(false)}>
          <Button className="bg-violet-600 text-white hover:bg-violet-700 w-full">Sign Up</Button>
        </Link>
        </div>
      </>
    )
  }

  return (
    <>
    <header className="bg-white shadow-sm sticky top-0 z-40">
        <nav className="container mx-auto px-3 sm:px-4 py-1.5 sm:py-4">
        {/* Main header content */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-8">
              <Link href="/" className="flex items-center group">
                <div className="relative w-8 h-8 mr-1.5 sm:mr-2">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
                alt="Flintime"
                    fill
                    className="object-contain transition-transform duration-300 group-hover:scale-110"
              />
                </div>
                <span className="text-xl sm:text-xl md:text-2xl font-bold text-violet-600 transition-colors group-hover:text-violet-700">Flintime</span>
            </Link>
            
            {/* Desktop location search */}
            <div className="hidden md:block w-[250px]">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 bg-violet-100 p-1.5 rounded-full">
                  <MapPin className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <div className="relative group flex-grow">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-400/20 to-indigo-400/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                  <div className="relative bg-white rounded-md shadow-sm group-hover:shadow-md transition-shadow duration-200">
                    <LocationSearch
                      value={locationValue}
                      onChange={handleLocationChange}
                      onCurrentLocation={handleCurrentLocation}
                      isLocating={isLocating}
                      className="border-violet-100 focus-within:border-violet-300 rounded-md bg-white/90 backdrop-blur-sm transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>
            
              {/* Improved mobile location display with animation */}
            <button
              onClick={() => setOpen(true)}
                className="md:hidden bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-full px-2.5 py-1.5 flex items-center gap-1.5 transition-all duration-200 active:scale-95"
            >
                <div className="flex-shrink-0 bg-violet-100 p-1 rounded-full">
                <MapPin className="h-3 w-3 text-violet-600" />
              </div>
              <div className="flex flex-col items-start">
                  <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider leading-none">Location</span>
                  <span className="font-medium text-xs truncate max-w-[80px] text-gray-700">{getShortenedLocation()}</span>
              </div>
            </button>
          </div>

            {/* Mobile menu button with animation */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2.5 text-gray-600 hover:text-violet-600 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 active:scale-95"
              aria-label="Toggle menu"
          >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop menu */}
          {renderMenuContent()}
        </div>

          {/* Mobile slide-out menu with improved styling and animation */}
          <div
            ref={menuRef}
            className={`md:hidden fixed top-0 right-0 bottom-0 w-[300px] bg-white shadow-lg z-50 transition-all duration-300 ease-out transform ${
              isMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            } overflow-auto`}
          >
            <div className="p-5 pb-24">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
                    alt="Flintime"
                    width={28}
                    height={28}
                    className="mr-2"
                  />
                  <h3 className="font-semibold text-lg text-violet-600">Menu</h3>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            {renderMobileContent()}
            </div>
          </div>
          
          {/* Backdrop for mobile menu with improved animation */}
          {isMenuOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setIsMenuOpen(false)}
            ></div>
        )}
      </nav>
      </header>
      
      {/* Mobile location search modal/popup with better animation */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-50 md:hidden backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute top-0 left-0 right-0 bg-white p-4 rounded-b-xl shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Select your location</h3>
              <button 
                onClick={() => setOpen(false)} 
                className="text-gray-500 p-1.5 hover:bg-gray-100 rounded-full active:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="relative">
              <LocationSearch
                value={locationValue}
                onChange={(value, lat, lng) => {
                  handleLocationChange(value, lat, lng);
                  if (value && lat && lng) {
                    setOpen(false);
                  }
                }}
                onCurrentLocation={handleCurrentLocation}
                isLocating={isLocating}
                className="w-full mb-2"
              />
            </div>
            
            <div className="mt-3 border-t border-gray-100 pt-2">
              <button 
                onClick={handleCurrentLocation}
                className="flex items-center gap-2 w-full py-2.5 px-3 hover:bg-gray-50 active:bg-blue-50 rounded-lg transition-colors text-left relative"
              >
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-xs">Current Location</span>
                  <p className="text-[10px] text-gray-500">Use your device location</p>
                </div>
                {isLocating ? (
                  <div className="ml-auto h-4 w-4 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                ) : (
                  <span className="ml-auto text-xs text-violet-600 font-medium">Use</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 border-t border-gray-100">
        <div className="container grid grid-cols-4 items-center">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-2.5 px-1 relative transition-colors duration-200 ${
              pathname === '/' ? 'text-violet-600' : 'text-gray-500 hover:text-gray-700 active:text-violet-500'
            }`}
          >
            <div className="relative">
              <Home className={cn("h-5 w-5", pathname === '/' && "drop-shadow-[0_0_3px_rgba(124,58,237,0.5)]")} />
              {pathname === '/' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 w-6 h-1 bg-violet-600 rounded-t-full animate-in fade-in duration-300" />
              )}
            </div>
            <span className="text-[10px] mt-1.5 font-medium relative z-10 bg-white">Home</span>
          </Link>
          
          {/* Apply the same enhancements to other bottom nav items */}
          <Link
            href="/chat"
            className={`flex flex-col items-center justify-center py-2.5 px-1 relative transition-colors duration-200 ${
              pathname?.includes('/chat') ? 'text-violet-600' : 'text-gray-500 hover:text-gray-700 active:text-violet-500'
            }`}
          >
            <div className="relative">
              <MessageCircle className={cn("h-5 w-5", pathname?.includes('/chat') && "drop-shadow-[0_0_3px_rgba(124,58,237,0.5)]")} />
              {pathname?.includes('/chat') && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 w-6 h-1 bg-violet-600 rounded-t-full animate-in fade-in duration-300" />
              )}
            </div>
            <span className="text-[10px] mt-1.5 font-medium relative z-10 bg-white">Chat</span>
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href="/profile/appointments"
                className={`flex flex-col items-center justify-center py-2.5 px-1 relative transition-colors duration-200 ${
                  pathname === '/profile/appointments' ? 'text-violet-600' : 'text-gray-500 hover:text-gray-700 active:text-violet-500'
                }`}
              >
                <div className="relative">
                  <Calendar className={cn("h-5 w-5", pathname === '/profile/appointments' && "drop-shadow-[0_0_3px_rgba(124,58,237,0.5)]")} />
                  {pathname === '/profile/appointments' && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 w-6 h-1 bg-violet-600 rounded-t-full animate-in fade-in duration-300" />
                  )}
                </div>
                <span className="text-[10px] mt-1.5 font-medium relative z-10 bg-white">Bookings</span>
              </Link>
              <Link
                href="/profile"
                className={`flex flex-col items-center justify-center py-2.5 px-1 relative transition-colors duration-200 ${
                  pathname === '/profile' ? 'text-violet-600' : 'text-gray-500 hover:text-gray-700 active:text-violet-500'
                }`}
              >
                <div className="relative">
                  <User className={cn("h-5 w-5", pathname === '/profile' && "drop-shadow-[0_0_3px_rgba(124,58,237,0.5)]")} />
                  {pathname === '/profile' && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 w-6 h-1 bg-violet-600 rounded-t-full animate-in fade-in duration-300" />
                  )}
                </div>
                <span className="text-[10px] mt-1.5 font-medium relative z-10 bg-white">Account</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href={signInUrl}
                className="flex flex-col items-center justify-center py-2.5 px-1 relative transition-colors duration-200 text-gray-500 hover:text-gray-700 active:text-violet-500"
              >
                <User className="h-5 w-5" />
                <span className="text-[10px] mt-1.5 font-medium relative z-10 bg-white">Sign In</span>
              </Link>
              <Link
                href={signUpUrl}
                className="flex flex-col items-center justify-center py-2.5 px-1 relative transition-colors duration-200 text-violet-600"
              >
                <div className="h-6 w-6 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] mt-1.5 font-medium relative z-10 bg-white">Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </div>
      
      {/* Add padding for mobile bottom nav - this shouldn't affect the header-hero spacing */}
      <div className="md:hidden h-[56px] hidden"></div>
    </>
  )
}

