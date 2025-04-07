'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  Camera,
  Clock,
  DollarSign,
  Calendar,
  Save,
  Loader2
} from 'lucide-react';

export default function BusinessProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Mock data - will be replaced with API calls
  const [businessData, setBusinessData] = useState({
    name: 'Clean Pro Services',
    email: 'contact@cleanpro.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    website: 'www.cleanpro.com',
    description: 'Professional cleaning services for homes and offices.',
    businessHours: {
      monday: { open: '09:00', close: '17:00', isOpen: true },
      tuesday: { open: '09:00', close: '17:00', isOpen: true },
      wednesday: { open: '09:00', close: '17:00', isOpen: true },
      thursday: { open: '09:00', close: '17:00', isOpen: true },
      friday: { open: '09:00', close: '17:00', isOpen: true },
      saturday: { open: '10:00', close: '15:00', isOpen: true },
      sunday: { open: '00:00', close: '00:00', isOpen: false },
    },
    services: [
      {
        id: 1,
        name: 'Basic Home Cleaning',
        description: 'Standard cleaning service for homes',
        price: 100,
        duration: 2,
        isActive: true
      },
      {
        id: 2,
        name: 'Deep Cleaning',
        description: 'Thorough cleaning service including hard to reach areas',
        price: 200,
        duration: 4,
        isActive: true
      },
      {
        id: 3,
        name: 'Office Cleaning',
        description: 'Professional cleaning service for office spaces',
        price: 150,
        duration: 3,
        isActive: false
      }
    ],
    notifications: {
      email: true,
      sms: true,
      bookings: true,
      reviews: true,
      promotions: false
    }
  });

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    // Show success message
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Handle image upload
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
            <p className="text-gray-500">Manage your business information and settings</p>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="profile" className="space-y-8">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="hours">Business Hours</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <div className="p-6">
                  <div className="grid gap-6">
                    {/* Profile Image */}
                    <div className="flex items-center gap-4">
                      <div className="relative h-24 w-24 rounded-full bg-gray-100">
                        <div className="absolute bottom-0 right-0">
                          <label
                            htmlFor="profile-image"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90"
                          >
                            <Camera className="h-4 w-4" />
                            <input
                              type="file"
                              id="profile-image"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium">Business Logo</h3>
                        <p className="text-sm text-gray-500">
                          Upload a logo for your business profile
                        </p>
                      </div>
                    </div>

                    {/* Business Information */}
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Business Name</Label>
                        <Input
                          id="name"
                          value={businessData.name}
                          onChange={(e) =>
                            setBusinessData({ ...businessData, name: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={businessData.description}
                          onChange={(e) =>
                            setBusinessData({
                              ...businessData,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={businessData.email}
                            onChange={(e) =>
                              setBusinessData({ ...businessData, email: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={businessData.phone}
                            onChange={(e) =>
                              setBusinessData({ ...businessData, phone: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={businessData.website}
                          onChange={(e) =>
                            setBusinessData({ ...businessData, website: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            value={businessData.address}
                            onChange={(e) =>
                              setBusinessData({
                                ...businessData,
                                address: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={businessData.city}
                            onChange={(e) =>
                              setBusinessData({ ...businessData, city: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={businessData.state}
                            onChange={(e) =>
                              setBusinessData({ ...businessData, state: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="zipCode">ZIP Code</Label>
                          <Input
                            id="zipCode"
                            value={businessData.zipCode}
                            onChange={(e) =>
                              setBusinessData({
                                ...businessData,
                                zipCode: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t p-4">
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services">
              <Card>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium">Services</h3>
                    <Button>Add New Service</Button>
                  </div>
                  <div className="space-y-4">
                    {businessData.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{service.name}</h4>
                            <Badge variant={service.isActive ? 'default' : 'secondary'}>
                              {service.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{service.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              <span>${service.price}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{service.duration} hours</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button
                            variant={service.isActive ? 'destructive' : 'default'}
                            size="sm"
                          >
                            {service.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Business Hours Tab */}
            <TabsContent value="hours">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-6">Business Hours</h3>
                  <div className="space-y-4">
                    {Object.entries(businessData.businessHours).map(([day, hours]) => (
                      <div
                        key={day}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-24 font-medium capitalize">{day}</div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={hours.open}
                              className="w-32"
                              disabled={!hours.isOpen}
                            />
                            <span>to</span>
                            <Input
                              type="time"
                              value={hours.close}
                              className="w-32"
                              disabled={!hours.isOpen}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={hours.isOpen}
                            onCheckedChange={(checked) =>
                              setBusinessData({
                                ...businessData,
                                businessHours: {
                                  ...businessData.businessHours,
                                  [day]: {
                                    ...hours,
                                    isOpen: checked,
                                  },
                                },
                              })
                            }
                          />
                          <span className="text-sm text-gray-500">
                            {hours.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t p-4">
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-6">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-sm text-gray-500">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={businessData.notifications.email}
                        onCheckedChange={(checked) =>
                          setBusinessData({
                            ...businessData,
                            notifications: {
                              ...businessData.notifications,
                              email: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">SMS Notifications</h4>
                        <p className="text-sm text-gray-500">
                          Receive notifications via SMS
                        </p>
                      </div>
                      <Switch
                        checked={businessData.notifications.sms}
                        onCheckedChange={(checked) =>
                          setBusinessData({
                            ...businessData,
                            notifications: {
                              ...businessData.notifications,
                              sms: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Booking Notifications</h4>
                        <p className="text-sm text-gray-500">
                          Get notified about new bookings
                        </p>
                      </div>
                      <Switch
                        checked={businessData.notifications.bookings}
                        onCheckedChange={(checked) =>
                          setBusinessData({
                            ...businessData,
                            notifications: {
                              ...businessData.notifications,
                              bookings: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Review Notifications</h4>
                        <p className="text-sm text-gray-500">
                          Get notified about new reviews
                        </p>
                      </div>
                      <Switch
                        checked={businessData.notifications.reviews}
                        onCheckedChange={(checked) =>
                          setBusinessData({
                            ...businessData,
                            notifications: {
                              ...businessData.notifications,
                              reviews: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Promotional Notifications</h4>
                        <p className="text-sm text-gray-500">
                          Receive promotional updates
                        </p>
                      </div>
                      <Switch
                        checked={businessData.notifications.promotions}
                        onCheckedChange={(checked) =>
                          setBusinessData({
                            ...businessData,
                            notifications: {
                              ...businessData.notifications,
                              promotions: checked,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t p-4">
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 