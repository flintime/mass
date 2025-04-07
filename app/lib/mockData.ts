const mockServices = [
  {
    id: '1',
    name: 'Premium House Cleaning',
    category: 'home services',
    description: 'Professional house cleaning service with eco-friendly products.',
    rating: 4.8,
    price: 80,
    distance: 2.5,
    image: '/placeholder.svg?height=200&width=300',
    availableNow: true,
    reviews: [
      {
        id: 1,
        author: "John Doe",
        avatar: "/placeholder.svg?height=40&width=40",
        rating: 5,
        date: "2023-05-15",
        content: "Excellent service! They were punctual, professional, and did a fantastic job."
      },
      {
        id: 2,
        author: "Jane Smith",
        avatar: "/placeholder.svg?height=40&width=40",
        rating: 4,
        date: "2023-05-10",
        content: "Very good service overall. There was a slight delay but they communicated well."
      },
    ],
    faqs: [
      { 
        question: "What is included in the basic service?", 
        answer: "Our basic service includes dusting, vacuuming, mopping, and bathroom cleaning. For more comprehensive options, please check our premium services." 
      },
      { 
        question: "How long does a typical cleaning session take?", 
        answer: "A typical cleaning session takes about 2-3 hours, but this can vary depending on the size of your home and the specific services requested." 
      },
    ],
    images: [
      '/placeholder.svg?height=400&width=600',
      '/placeholder.svg?height=400&width=600&text=Image+2',
      '/placeholder.svg?height=400&width=600&text=Image+3',
    ],
    address: "123 Cleaning St, Sparkle City, SC 12345",
    highlights: [
      "Eco-friendly cleaning products",
      "Trained and vetted cleaning professionals",
      "100% satisfaction guarantee",
    ],
    certifications: ["Green Cleaning Certified", "BBB Accredited Business"],
    services: [
      { id: "1", name: "Basic Cleaning", price: 80 },
      { id: "2", name: "Deep Cleaning", price: 120 },
      { id: "3", name: "Move-in/Move-out Cleaning", price: 200 },
    ],
  },
  // Add more mock services here as needed
];

export function getServiceData(id: string) {
  const service = mockServices.find(s => s.id === id);
  if (!service) return null;
  return service;
}

