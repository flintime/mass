'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ServicesPage from '../services/[id]/page'; // Import the existing services page component

export default function BusinessProfilePage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id;

  useEffect(() => {
    console.log(`Rendering business profile for direct URL with ID: ${businessId}`);
    
    // Check if this is a valid page or not
    // We could add validation here if needed in the future
  }, [businessId]);

  // Use the same component as the services/[id] page
  // This maintains consistency and prevents code duplication
  return <ServicesPage />;
} 