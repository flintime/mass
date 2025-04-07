'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { motion } from 'framer-motion';

interface Business {
  _id: string;
  business_name: string;
  description: string;
  rating: number;
  reviews_count: number;
  images: string[];
  distance?: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || searchParams.get('category') || '');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setIsLoading(true);
        const savedCoords = localStorage.getItem('userLocationCoords');
        const coords = savedCoords ? JSON.parse(savedCoords) : { lat: 40.7128, lng: -74.0060 };

        const response = await fetch('/api/search/businesses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            latitude: coords.lat,
            longitude: coords.lng,
            radius: 50
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch businesses');
        }

        const data = await response.json();
        setBusinesses(data);
      } catch (error) {
        console.error('Error fetching businesses:', error);
        toast({
          title: "Error",
          description: "Failed to fetch businesses. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (query) {
      fetchBusinesses();
    }
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast({
        title: "Please enter a search term",
        description: "Tell us what service you're looking for",
        variant: "destructive",
      });
      return;
    }
    // The useEffect will handle the search
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What service are you looking for?"
                className="flex-1"
              />
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : businesses.length > 0 ? (
          <div className="space-y-4">
            {businesses.map((business) => (
              <motion.div
                key={business._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {business.images?.[0] && (
                    <img
                      src={typeof business.images[0] === 'string' 
                        ? business.images[0] 
                        : (business.images[0] as { url: string }).url}
                      alt={business.business_name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{business.business_name}</h3>
                    <p className="text-gray-600 mb-2">{business.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1">{business.rating.toFixed(1)}</span>
                        <span className="text-gray-400 ml-1">({business.reviews_count})</span>
                      </div>
                      {business.distance && (
                        <span className="text-gray-500">
                          {business.distance < 1
                            ? `${(business.distance * 1000).toFixed(0)}m`
                            : `${business.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button>View Details</Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your search terms or location</p>
          </div>
        )}
      </div>
    </div>
  );
} 