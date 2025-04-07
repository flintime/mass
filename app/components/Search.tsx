'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchIcon, Clock, Tag, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LocationSearch } from '@/components/LocationSearch'
import { Command, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command"

// Categories with emojis like Yelp
const SERVICE_CATEGORIES = [
  { name: 'Home Cleaning', emoji: '🧹', tags: ['house cleaning', 'maid service', 'cleaning'] },
  { name: 'Plumbing', emoji: '🔧', tags: ['plumber', 'pipe repair', 'water heater'] },
  { name: 'Electrician', emoji: '⚡', tags: ['electrical', 'wiring', 'lighting'] },
  { name: 'Moving', emoji: '📦', tags: ['movers', 'relocation', 'packing'] },
  { name: 'Gardening', emoji: '🌱', tags: ['landscaping', 'lawn care', 'yard work'] },
  { name: 'Home Repair', emoji: '🏠', tags: ['handyman', 'maintenance', 'fix'] },
  { name: 'Painting', emoji: '🎨', tags: ['painters', 'interior', 'exterior'] },
  { name: 'Pest Control', emoji: '🐜', tags: ['exterminator', 'bug removal'] },
  { name: 'Carpet Cleaning', emoji: '🧶', tags: ['rug cleaning', 'floor care'] },
  { name: 'Window Cleaning', emoji: '🪟', tags: ['glass cleaning', 'window washer'] }
];

const MAX_RECENT_SEARCHES = 5;

export default function Search() {
  const [service, setService] = useState('')
  const [location, setLocation] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat?: number; lng?: number }>({})
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const router = useRouter()

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  const addToRecentSearches = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)]
      .slice(0, MAX_RECENT_SEARCHES)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    const params = new URLSearchParams()
    
    if (service) {
      params.set('query', service)
      addToRecentSearches(service)
    }
    if (location) {
      params.set('location', location)
      if (coordinates.lat && coordinates.lng) {
        params.set('lat', coordinates.lat.toString())
        params.set('lng', coordinates.lng.toString())
      }
    }
    
    if (params.toString()) {
      router.push(`/search?${params.toString()}`)
    }
  }

  const getFilteredSuggestions = () => {
    const searchTerm = service.toLowerCase()
    return SERVICE_CATEGORIES.filter(category => 
      category.name.toLowerCase().includes(searchTerm) ||
      category.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  const handleServiceChange = (value: string) => {
    setService(value)
    setShowServiceSuggestions(true)
  }

  const handleServiceSelect = (value: string) => {
    setService(value)
    setShowServiceSuggestions(false)
    addToRecentSearches(value)
    
    const params = new URLSearchParams()
    params.set('query', value)
    if (location) {
      params.set('location', location)
      if (coordinates.lat && coordinates.lng) {
        params.set('lat', coordinates.lat.toString())
        params.set('lng', coordinates.lng.toString())
      }
    }
    router.push(`/search?${params.toString()}`)
  }

  const handleLocationChange = (value: string, lat?: number, lng?: number) => {
    setLocation(value)
    if (lat && lng) {
      setCoordinates({ lat, lng })
      // Automatically redirect when location is selected
      const params = new URLSearchParams()
      if (service) {
        params.set('query', service)
      }
      params.set('location', value)
      params.set('lat', lat.toString())
      params.set('lng', lng.toString())
      router.push(`/search?${params.toString()}`)
    }
  }

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation('Current Location')
        setCoordinates({ lat: latitude, lng: longitude })
        // Automatically redirect when current location is obtained
        const params = new URLSearchParams()
        if (service) {
          params.set('query', service)
        }
        params.set('location', 'Current Location')
        params.set('lat', latitude.toString())
        params.set('lng', longitude.toString())
        router.push(`/search?${params.toString()}`)
        setIsLocating(false)
      },
      () => {
        setIsLocating(false)
      }
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow relative">
          <Input 
            type="text" 
            placeholder="Search for services (e.g., plumbers, cleaners)" 
            className="flex-grow pl-4 pr-10 py-2"
            value={service}
            onChange={(e) => handleServiceChange(e.target.value)}
            onFocus={() => setShowServiceSuggestions(true)}
          />
          {showServiceSuggestions && (
            <div className="absolute z-50 w-full bg-white rounded-md border shadow-md mt-1 max-h-[400px] overflow-y-auto">
              <Command>
                {recentSearches.length > 0 && (
                  <>
                    <CommandGroup heading="Recent Searches">
                      {recentSearches.map((search) => (
                        <CommandItem
                          key={search}
                          onSelect={() => handleServiceSelect(search)}
                          className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100"
                        >
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          {search}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}
                <CommandGroup heading="Popular Categories">
                  {getFilteredSuggestions().map((category) => (
                    <CommandItem
                      key={category.name}
                      onSelect={() => handleServiceSelect(category.name)}
                      className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100"
                    >
                      <span className="mr-2">{category.emoji}</span>
                      <div>
                        <div>{category.name}</div>
                        <div className="text-sm text-gray-500">
                          {category.tags.join(' • ')}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </div>
          )}
        </div>
        <div className="flex-grow">
          <LocationSearch
            value={location}
            onChange={handleLocationChange}
            onCurrentLocation={getUserLocation}
            isLocating={isLocating}
          />
        </div>
        <Button type="submit" className="w-full md:w-auto bg-violet-600 hover:bg-violet-700">
          <SearchIcon className="mr-2 h-4 w-4" /> Search
        </Button>
      </form>
    </div>
  )
}

