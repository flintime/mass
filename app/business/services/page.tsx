'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Package,
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Service {
  id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  phone: string;
  email: string;
  images: string[];
  features: string[];
  certifications: {
    name: string;
    issuer: string;
    year: string;
  }[];
  availableTimes: string[];
  serviceTypes: {
    name: string;
    duration: number;
    price: number;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  cancellationPolicy: string;
  businessHours: string;
  isActive: boolean;
}

export default function BusinessServices() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      // TODO: Replace with actual API call
      // Mock data for demonstration
      setServices([
        {
          id: 1,
          title: "Professional House Cleaning Service",
          description: "Professional house cleaning service with attention to detail. We provide all cleaning supplies and equipment. Our team is fully trained, insured, and background checked.",
          price: 120,
          location: "San Francisco, CA",
          phone: "+1 (555) 123-4567",
          email: "contact@cleanshine.com",
          images: [
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&q=80",
          ],
          features: [
            "Trained professionals",
            "Eco-friendly products",
            "Insured service",
            "Satisfaction guaranteed",
            "Flexible scheduling",
            "Regular cleaning plans available"
          ],
          certifications: [
            {
              name: "Professional Cleaning Certification",
              issuer: "Cleaning Industry Association",
              year: "2023"
            },
            {
              name: "Health & Safety Standards",
              issuer: "Safety First Organization",
              year: "2023"
            }
          ],
          availableTimes: [
            "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"
          ],
          serviceTypes: [
            {
              name: "Standard Service",
              duration: 120,
              price: 120
            },
            {
              name: "Deep Clean",
              duration: 240,
              price: 200
            }
          ],
          faqs: [
            {
              question: "What is included in your standard service?",
              answer: "Our standard service includes thorough cleaning of all rooms, dusting, vacuuming, mopping, bathroom sanitization, and kitchen cleaning."
            }
          ],
          cancellationPolicy: "Free cancellation up to 24 hours before the scheduled service.",
          businessHours: "Monday to Friday: 8:00 AM - 6:00 PM",
          isActive: true
        },
        {
          id: 2,
          title: "Deep Cleaning Service",
          description: "Thorough deep cleaning service for homes and offices. Perfect for spring cleaning or move-in/move-out situations.",
          price: 200,
          location: "San Francisco, CA",
          phone: "+1 (555) 123-4567",
          email: "contact@cleanshine.com",
          images: [
            "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&q=80",
          ],
          features: [
            "Deep cleaning specialists",
            "Move-in/move-out cleaning",
            "Satisfaction guaranteed"
          ],
          certifications: [
            {
              name: "Professional Cleaning Certification",
              issuer: "Cleaning Industry Association",
              year: "2023"
            }
          ],
          availableTimes: [
            "09:00", "14:00", "15:00"
          ],
          serviceTypes: [
            {
              name: "Standard Deep Clean",
              duration: 300,
              price: 200
            }
          ],
          faqs: [
            {
              question: "How long does a deep cleaning take?",
              answer: "A typical deep cleaning service takes 4-6 hours depending on the size and condition of the space."
            }
          ],
          cancellationPolicy: "48-hour cancellation policy applies.",
          businessHours: "Monday to Friday: 9:00 AM - 5:00 PM",
          isActive: true
        }
      ]);
      setIsLoading(false);
    } catch (error) {
      setError('Failed to load services');
      setIsLoading(false);
    }
  };

  const handleDelete = async (serviceId: number) => {
    try {
      // TODO: Replace with actual API call
      setServices(services.filter(service => service.id !== serviceId));
    } catch (error) {
      setError('Failed to delete service');
    }
  };

  const handleToggleActive = async (serviceId: number) => {
    try {
      // TODO: Replace with actual API call
      setServices(services.map(service =>
        service.id === serviceId ? { ...service, isActive: !service.isActive } : service
      ));
    } catch (error) {
      setError('Failed to update service status');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Services</h1>
            <p className="text-gray-500">Manage your service offerings</p>
          </div>
          <Link href="/business/services/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </Link>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    {service.images[0] ? (
                      <Image
                        src={service.images[0]}
                        alt={service.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Package className="h-16 w-16 text-primary p-3" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{service.title}</h3>
                    <p className="text-sm text-gray-500">${service.price}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/business/services/${service.id}/edit`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(service.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{service.description}</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{service.serviceTypes.length} service types</span>
                  <span>{service.features.length} features</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{service.location}</span>
                  <div className="flex items-center space-x-2">
                    <span>{service.isActive ? 'Active' : 'Inactive'}</span>
                    <Switch
                      checked={service.isActive}
                      onCheckedChange={() => handleToggleActive(service.id)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 