'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, X, Upload } from 'lucide-react';

interface ServiceData {
  id: string;
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

export default function EditService({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceData, setServiceData] = useState<ServiceData>({
    id: params.id,
    title: '',
    description: '',
    price: 0,
    location: '',
    phone: '',
    email: '',
    images: [],
    features: [],
    certifications: [],
    availableTimes: [],
    serviceTypes: [],
    faqs: [],
    cancellationPolicy: '',
    businessHours: '',
    isActive: true
  });

  // Load service data when component mounts
  useEffect(() => {
    const loadServiceData = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        // Mock data for demonstration
        const mockService = {
          id: params.id,
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
            },
            {
              name: "Green Cleaning Certification",
              issuer: "Eco-Friendly Services Board",
              year: "2022"
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
            },
            {
              name: "Premium Service",
              duration: 360,
              price: 300
            }
          ],
          faqs: [
            {
              question: "What is included in your standard service?",
              answer: "Our standard service includes thorough cleaning of all rooms, dusting, vacuuming, mopping, bathroom sanitization, and kitchen cleaning. We use professional-grade eco-friendly cleaning products and bring all necessary equipment."
            },
            {
              question: "How long does a typical service take?",
              answer: "Service duration varies based on the size of your space and specific requirements. A standard home cleaning typically takes 2-4 hours. We'll provide a more accurate estimate after understanding your needs."
            }
          ],
          cancellationPolicy: "Free cancellation up to 24 hours before the scheduled service. Late cancellations may incur a fee of 50% of the service price.",
          businessHours: "Monday to Friday: 8:00 AM - 6:00 PM\nSaturday: 9:00 AM - 4:00 PM\nSunday: Closed",
          isActive: true
        };

        setServiceData(mockService);
      } catch (err) {
        setError('Failed to load service data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadServiceData();
  }, [params.id]);

  // Add new empty fields
  const addFeature = () => {
    setServiceData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const addCertification = () => {
    setServiceData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '', year: '' }]
    }));
  };

  const addServiceType = () => {
    setServiceData(prev => ({
      ...prev,
      serviceTypes: [...prev.serviceTypes, { name: '', duration: 0, price: 0 }]
    }));
  };

  const addFAQ = () => {
    setServiceData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }]
    }));
  };

  const addAvailableTime = () => {
    setServiceData(prev => ({
      ...prev,
      availableTimes: [...prev.availableTimes, '']
    }));
  };

  // Update field values
  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...serviceData.features];
    newFeatures[index] = value;
    setServiceData(prev => ({ ...prev, features: newFeatures }));
  };

  const updateCertification = (index: number, field: keyof typeof serviceData.certifications[0], value: string) => {
    const newCertifications = [...serviceData.certifications];
    newCertifications[index] = { ...newCertifications[index], [field]: value };
    setServiceData(prev => ({ ...prev, certifications: newCertifications }));
  };

  const updateServiceType = (index: number, field: keyof typeof serviceData.serviceTypes[0], value: string | number) => {
    const newServiceTypes = [...serviceData.serviceTypes];
    newServiceTypes[index] = { ...newServiceTypes[index], [field]: value };
    setServiceData(prev => ({ ...prev, serviceTypes: newServiceTypes }));
  };

  const updateFAQ = (index: number, field: keyof typeof serviceData.faqs[0], value: string) => {
    const newFAQs = [...serviceData.faqs];
    newFAQs[index] = { ...newFAQs[index], [field]: value };
    setServiceData(prev => ({ ...prev, faqs: newFAQs }));
  };

  const updateAvailableTime = (index: number, value: string) => {
    const newTimes = [...serviceData.availableTimes];
    newTimes[index] = value;
    setServiceData(prev => ({ ...prev, availableTimes: newTimes }));
  };

  // Remove fields
  const removeFeature = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const removeCertification = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const removeServiceType = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.filter((_, i) => i !== index)
    }));
  };

  const removeFAQ = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  const removeAvailableTime = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      availableTimes: prev.availableTimes.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement API call to update service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      router.push('/business/services');
    } catch (err) {
      setError('Failed to update service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Edit Service</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                  <TabsTrigger value="details">Service Details</TabsTrigger>
                  <TabsTrigger value="faqs">FAQs</TabsTrigger>
                  <TabsTrigger value="additional">Additional Info</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="title">Service Title</Label>
                      <Input
                        id="title"
                        value={serviceData.title}
                        onChange={(e) => setServiceData(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={serviceData.description}
                        onChange={(e) => setServiceData(prev => ({ ...prev, description: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Base Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={serviceData.price}
                          onChange={(e) => setServiceData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={serviceData.location}
                          onChange={(e) => setServiceData(prev => ({ ...prev, location: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={serviceData.phone}
                          onChange={(e) => setServiceData(prev => ({ ...prev, phone: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={serviceData.email}
                          onChange={(e) => setServiceData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Media Tab */}
                <TabsContent value="media" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {serviceData.images.map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={image}
                          alt={`Service image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            const newImages = [...serviceData.images];
                            newImages.splice(index, 1);
                            setServiceData(prev => ({ ...prev, images: newImages }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="aspect-square flex flex-col items-center justify-center gap-2"
                      onClick={() => {
                        // TODO: Implement image upload
                        setServiceData(prev => ({
                          ...prev,
                          images: [...prev.images, 'https://via.placeholder.com/300']
                        }));
                      }}
                    >
                      <Upload className="h-8 w-8" />
                      <span>Upload Image</span>
                    </Button>
                  </div>
                </TabsContent>

                {/* Service Details Tab */}
                <TabsContent value="details" className="space-y-6">
                  {/* Features */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Features</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Feature
                      </Button>
                    </div>
                    {serviceData.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          placeholder="Enter feature"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFeature(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Certifications */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Certifications</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Certification
                      </Button>
                    </div>
                    {serviceData.certifications.map((cert, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2">
                        <Input
                          value={cert.name}
                          onChange={(e) => updateCertification(index, 'name', e.target.value)}
                          placeholder="Certification name"
                        />
                        <Input
                          value={cert.issuer}
                          onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                          placeholder="Issuing organization"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={cert.year}
                            onChange={(e) => updateCertification(index, 'year', e.target.value)}
                            placeholder="Year"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCertification(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Service Types */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Service Types</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addServiceType}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service Type
                      </Button>
                    </div>
                    {serviceData.serviceTypes.map((type, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2">
                        <Input
                          value={type.name}
                          onChange={(e) => updateServiceType(index, 'name', e.target.value)}
                          placeholder="Service type name"
                        />
                        <Input
                          type="number"
                          value={type.duration}
                          onChange={(e) => updateServiceType(index, 'duration', parseInt(e.target.value))}
                          placeholder="Duration (minutes)"
                        />
                        <Input
                          type="number"
                          value={type.price}
                          onChange={(e) => updateServiceType(index, 'price', parseFloat(e.target.value))}
                          placeholder="Price ($)"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeServiceType(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Available Times */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Available Times</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addAvailableTime}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Slot
                      </Button>
                    </div>
                    {serviceData.availableTimes.map((time, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="time"
                          value={time}
                          onChange={(e) => updateAvailableTime(index, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAvailableTime(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* FAQs Tab */}
                <TabsContent value="faqs" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Frequently Asked Questions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addFAQ}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add FAQ
                    </Button>
                  </div>
                  {serviceData.faqs.map((faq, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={faq.question}
                          onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                          placeholder="Question"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFAQ(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                        placeholder="Answer"
                      />
                    </div>
                  ))}
                </TabsContent>

                {/* Additional Info Tab */}
                <TabsContent value="additional" className="space-y-4">
                  <div>
                    <Label htmlFor="businessHours">Business Hours</Label>
                    <Textarea
                      id="businessHours"
                      value={serviceData.businessHours}
                      onChange={(e) => setServiceData(prev => ({ ...prev, businessHours: e.target.value }))}
                      placeholder="Enter your business hours"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                    <Textarea
                      id="cancellationPolicy"
                      value={serviceData.cancellationPolicy}
                      onChange={(e) => setServiceData(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
                      placeholder="Enter your cancellation policy"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={serviceData.isActive}
                      onCheckedChange={(checked) => setServiceData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Service is active and visible to customers</Label>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/business/services')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 