import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Globe, Star, Clock } from "lucide-react";

interface ServiceProviderProfileProps {
  providerId: number;
}

export default function ServiceProviderProfile({ providerId }: ServiceProviderProfileProps) {
  // Mock data - replace with real API data later
  const provider = {
    name: "Sarah's Cleaning Services",
    avatar: "/business/providers/provider1.jpg",
    rating: 4.8,
    totalReviews: 156,
    description: "Professional cleaning services with over 5 years of experience. Specializing in residential and commercial cleaning.",
    location: "San Francisco, CA",
    phone: "(555) 123-4567",
    email: "contact@sarahscleaning.com",
    website: "www.sarahscleaning.com",
    businessHours: "Mon-Fri: 8AM-6PM",
    services: [
      { name: "Regular Cleaning", price: "$120/session" },
      { name: "Deep Cleaning", price: "$200/session" },
      { name: "Move-in/Move-out", price: "$250/session" },
      { name: "Office Cleaning", price: "Custom" }
    ]
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={provider.avatar} alt={provider.name} />
                <AvatarFallback>{provider.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{provider.name}</CardTitle>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="font-medium">{provider.rating}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ({provider.totalReviews} reviews)
                  </span>
                </div>
              </div>
            </div>
            <Button>Edit Profile</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">{provider.description}</p>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{provider.location}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{provider.phone}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{provider.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>{provider.website}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{provider.businessHours}</span>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Services Offered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {provider.services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium">{service.name}</span>
                      <Badge variant="secondary">{service.price}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

