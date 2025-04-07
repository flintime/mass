'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Calendar, Settings, LogOut, MessageSquare, User, MessageCircle, Sparkles, ChevronDown, Store } from 'lucide-react';
import { businessAuth } from '@/lib/businessAuth';
import SubscriptionRequired from '@/app/components/SubscriptionRequired';
import useMobileDetect from '@/hooks/useMobileDetect';
import './mobile.css';

// Add TypeScript declaration for the global variable
declare global {
  interface Window {
    businessAuthInitialized?: boolean;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useMobileDetect();
  const [businessName, setBusinessName] = useState('');
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Dashboard layout - Checking business authentication');
        
        // Initialize authentication state from cookies if needed
        await businessAuth.initialize();
        
        // Check if we have a valid token
        const token = businessAuth.getToken();
        console.log('Dashboard layout - Authentication token present:', !!token);
        
        if (!token) {
          // Double-check with server before redirecting
          const hasServerToken = await businessAuth.checkServerToken();
          console.log('Dashboard layout - Server token check:', hasServerToken);
          
          if (!hasServerToken) {
            console.log('Dashboard layout - No token found, redirecting to signin');
            router.push('/business/signin');
            return;
          }
        }
        
        // Set a global variable to indicate authentication is complete
        // This helps child components know when they can safely access the token
        window.businessAuthInitialized = true;
        
        try {
          // Fetch user data
          console.log('Dashboard layout - Fetching current business user');
          const user = await businessAuth.getCurrentUser();
          console.log('Dashboard layout - User fetch successful:', !!user);
          
          if (!user) {
            console.log('Dashboard layout - User data not found, redirecting to signin');
            router.push('/business/signin');
            return;
          }
          
          setBusinessName(user.business_name);
        } catch (userError) {
          console.error('Dashboard layout - Error fetching user:', userError);
          
          if (userError instanceof Error && 
              userError.message.includes('No authentication token found')) {
            // Clear potentially corrupted token
            businessAuth.signout();
          }
          
          router.push('/business/signin');
        }
      } catch (error) {
        console.error('Dashboard layout - Auth check error:', error);
        router.push('/business/signin');
      }
    };

    checkAuth();
  }, [router]);

  // Handle scroll direction detection for bottom nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY + 10) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollY - 10) {
        setScrollDirection('up');
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
  
  // Add click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await businessAuth.signout();
    router.push('/business/signin');
  };
  
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const navigation = [
    {
      name: 'Chat',
      href: '/business/dashboard/chat',
      icon: MessageCircle,
      current: pathname.startsWith('/business/dashboard/chat')
    },
    {
      name: 'Appointments',
      href: '/business/dashboard/appointments',
      icon: Calendar,
      current: pathname.startsWith('/business/dashboard/appointments')
    },
    {
      name: 'Profile',
      href: '/business/dashboard/profile',
      icon: User,
      current: pathname.startsWith('/business/dashboard/profile')
    },
    {
      name: 'Feed AI',
      href: '/business/dashboard/feed-ai',
      icon: Sparkles,
      current: pathname.startsWith('/business/dashboard/feed-ai')
    },
    {
      name: 'Reviews',
      href: '/business/dashboard/reviews',
      icon: MessageSquare,
      current: pathname.startsWith('/business/dashboard/reviews')
    },
    {
      name: 'Settings',
      href: '/business/dashboard/settings',
      icon: Settings,
      current: pathname.startsWith('/business/dashboard/settings')
    }
  ];

  return (
    <SubscriptionRequired>
      <div className="min-h-screen bg-gray-50">
        {/* Desktop Navigation */}
        <nav className="bg-white shadow-sm hidden sm:block">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <Link href="/" className="flex shrink-0 items-center">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
                    alt="Flintime"
                    width={40}
                    height={40}
                  />
                  <span className="ml-2 text-xl font-semibold text-gray-900">Flintime Business</span>
                </Link>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                        item.current
                          ? 'border-b-2 border-violet-500 text-gray-900'
                          : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                <p className="text-sm text-gray-500">{businessName}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Header */}
        {isMobile && (
          <header className="mobile-dashboard-header sm:hidden">
            <div className="mobile-dashboard-logo flex items-center">
              <Link href="/" className="flex items-center">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
                  alt="Flintime"
                  width={28}
                  height={28}
                />
                <span className="ml-2 text-sm font-semibold text-gray-900">Flintime Business</span>
              </Link>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={toggleDropdown} 
                className="mobile-business-dropdown-trigger"
              >
                <Store className="h-4 w-4 text-violet-500" />
                {businessName && (
                  <span className="mobile-business-name">{businessName}</span>
                )}
                <ChevronDown className={`mobile-dropdown-icon ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="mobile-dropdown-menu">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-800">{businessName}</p>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="mobile-dropdown-item"
                  >
                    <LogOut className="mobile-sign-out-icon" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav 
            className={`mobile-bottom-nav sm:hidden ${
              scrollDirection === 'down' ? 'transform translate-y-full' : ''
            }`}
            style={{
              transform: scrollDirection === 'down' ? 'translateY(100%)' : 'translateY(0)'
            }}
          >
            <div className="mobile-nav-container">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`mobile-nav-item ${item.current ? 'active' : ''}`}
                >
                  <div className="mobile-nav-icon">
                    <item.icon />
                  </div>
                  <span className="mobile-nav-text">{item.name}</span>
                  <div className="mobile-nav-indicator"></div>
                </Link>
              ))}
            </div>
          </nav>
        )}

        {/* Main content */}
        <main className={isMobile ? "dashboard-main-content" : ""}>
          {children}
        </main>
      </div>
    </SubscriptionRequired>
  );
} 