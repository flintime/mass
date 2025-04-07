'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { businessAuth } from '@/lib/businessAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const BUSINESS_CATEGORIES = [
  'Home Services',
  'Beauty & Personal Services',
  'Pet Care',
  'Auto Services'
] as const;

interface Service {
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface BusinessState {
  business_name: string;
  email: string;
  Business_Category: string;
  Business_Subcategories: string[];
  description: string;
  Website?: string;
  phone: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export default function BusinessSettings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [business, setBusiness] = useState<BusinessState | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    category: '',
    description: '',
    website: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const [currentService, setCurrentService] = useState<Service>({
    name: '',
    description: '',
    price: 0,
    duration: 30
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!businessAuth.isAuthenticated()) {
          router.push('/business/signin');
          return;
        }

        const businessInfo = await businessAuth.getCurrentUser();
        setBusiness(businessInfo);
        setFormData({
          businessName: businessInfo.business_name,
          email: businessInfo.email,
          category: businessInfo.Business_Category,
          description: businessInfo.description,
          website: businessInfo.Website || '',
          phone: businessInfo.phone.toString(),
          address: businessInfo.address,
          city: businessInfo.city,
          state: businessInfo.state,
          zipCode: businessInfo.zip_code
        });
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/business/signin');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleServiceChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCurrentService(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'duration' ? Number(value) : value
    }));
  };

  const addService = () => {
    if (
      !currentService.name ||
      !currentService.description ||
      !currentService.price ||
      !currentService.duration
    ) {
      toast({
        title: 'Error',
        description: 'Please fill in all service fields',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Implement adding a new service
  };

  const removeService = (index: number) => {
    // TODO: Implement removing a service
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await businessAuth.updateProfile({
        business_name: formData.businessName,
        email: formData.email,
        Business_Category: formData.category,
        Business_Subcategories: [], // Empty array since we don't use subcategories anymore
        description: formData.description,
        Website: formData.website,
        phone: Number(formData.phone),
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode
      });

      toast({
        title: 'Success',
        description: 'Your business profile has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Business Settings</h1>
          <Button variant="ghost" onClick={() => router.push('/business/dashboard/chat')}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    required
                    value={formData.zipCode}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <div className="space-y-4">
              {/* TODO: Implement displaying services */}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serviceName">Service Name</Label>
                <Input
                  id="serviceName"
                  name="name"
                  placeholder="Enter service name"
                  value={currentService.name}
                  onChange={handleServiceChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceDescription">Service Description</Label>
                <Textarea
                  id="serviceDescription"
                  name="description"
                  placeholder="Describe the service"
                  value={currentService.description}
                  onChange={handleServiceChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="servicePrice">Price ($)</Label>
                  <Input
                    id="servicePrice"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                    value={currentService.price}
                    onChange={handleServiceChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceDuration">Duration (minutes)</Label>
                  <Input
                    id="serviceDuration"
                    name="duration"
                    type="number"
                    min="15"
                    step="15"
                    placeholder="Enter duration"
                    value={currentService.duration}
                    onChange={handleServiceChange}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addService}
              >
                Add Service
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 