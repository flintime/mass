import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin, DollarSign, X } from 'lucide-react';
import { services } from '@/lib/services';
import type { Service } from '@/types/service';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ServiceComparisonProps {
  serviceIds: (string | number)[];
  onClose: () => void;
  open: boolean;
}

export function ServiceComparison({ serviceIds, onClose, open }: ServiceComparisonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [comparedServices, setComparedServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      if (!open) return;
      
      setIsLoading(true);
      try {
        const data = await services.compareServices(serviceIds);
        setComparedServices(data);
      } catch (error) {
        console.error('Failed to fetch services for comparison:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [serviceIds, open]);

  const renderComparisonRow = (label: string, getValue: (service: Service) => React.ReactNode) => (
    <div className="grid grid-cols-[200px_repeat(auto-fill,minmax(200px,1fr))] gap-4 py-2 border-b">
      <div className="font-medium">{label}</div>
      {comparedServices.map((service) => (
        <div key={service.id}>{getValue(service)}</div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compare Services</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Images */}
            <div className="grid grid-cols-[200px_repeat(auto-fill,minmax(200px,1fr))] gap-4">
              <div />
              {comparedServices.map((service) => (
                <div key={service.id} className="relative">
                  {service.images?.[0] && (
                    <div className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={service.images[0]}
                        alt={service.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Basic Info */}
            {renderComparisonRow('Name', (service) => (
              <Link href={`/${service.id}`} className="text-violet-600 hover:underline">
                {service.name}
              </Link>
            ))}
            {renderComparisonRow('Category', (service) => service.category)}
            {renderComparisonRow('Rating', (service) => (
              service.rating && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  <span>{service.rating}</span>
                  {service.reviewCount && (
                    <span className="text-gray-500 ml-1">({service.reviewCount})</span>
                  )}
                </div>
              )
            ))}

            {/* Pricing */}
            {renderComparisonRow('Base Price', (service) => (
              <span>{service.pricing.currency}{service.pricing.basePrice}</span>
            ))}
            {renderComparisonRow('Pricing Model', (service) => (
              <span className="capitalize">{service.pricing.model}</span>
            ))}

            {/* Availability */}
            {renderComparisonRow('Available Days', (service) => (
              service.availability?.days.join(', ')
            ))}
            {renderComparisonRow('Hours', (service) => (
              service.availability?.hours
            ))}

            {/* Features */}
            {renderComparisonRow('Features', (service) => (
              <ul className="list-disc list-inside">
                {service.features?.map((feature, index) => (
                  <li key={index} className="text-sm">{feature}</li>
                ))}
              </ul>
            ))}

            {/* Location */}
            {renderComparisonRow('Distance', (service) => (
              service.distance && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{service.distance.toFixed(1)} miles</span>
                </div>
              )
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 