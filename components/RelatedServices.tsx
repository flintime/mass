import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin, DollarSign } from 'lucide-react';
import { services } from '@/lib/services';
import type { Service } from '@/types/service';
import Link from 'next/link';
import Image from 'next/image';

interface RelatedServicesProps {
  serviceId: string | number;
  limit?: number;
}

export function RelatedServices({ serviceId, limit = 3 }: RelatedServicesProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [relatedServices, setRelatedServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchRelatedServices = async () => {
      try {
        const data = await services.getRelatedServices(serviceId, limit);
        setRelatedServices(data);
      } catch (error) {
        console.error('Failed to fetch related services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedServices();
  }, [serviceId, limit]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse flex gap-4">
              <div className="bg-gray-200 w-24 h-24 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (relatedServices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Similar Services</h2>
      <div className="grid gap-4">
        {relatedServices.map((service) => (
          <Card key={service.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex gap-4">
              {service.images?.[0] && (
                <div className="relative w-24 h-24 flex-shrink-0">
                  <Image
                    src={service.images[0]}
                    alt={service.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{service.name}</h3>
                <p className="text-sm text-violet-600">{service.category}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  {service.rating && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>{service.rating}</span>
                    </div>
                  )}
                  {service.pricing.basePrice && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span>From {service.pricing.currency}{service.pricing.basePrice}</span>
                    </div>
                  )}
                  {service.distance && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{service.distance.toFixed(1)} miles</span>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Link href={`/services/${service.id}`}>
                    <Button variant="outline" size="sm">View Details</Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 