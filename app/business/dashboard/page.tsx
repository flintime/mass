'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { businessAuth } from '@/lib/businessAuth';

export default function DashboardPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const user = await businessAuth.getCurrentUser();
        setBusiness(user);
      } catch (error) {
        console.error('Error loading business:', error);
      }
    };

    loadBusiness();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {/* Dashboard content */}
    </div>
  );
} 