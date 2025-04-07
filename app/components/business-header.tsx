'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogOut, MessageCircle, ChevronDown } from 'lucide-react';
import { businessAuth } from '@/lib/businessAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import useMobileDetect from '../../hooks/useMobileDetect';

export default function BusinessHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [businessName, setBusinessName] = useState('');
  const { isMobile } = useMobileDetect();
  const isSubscriptionPage = pathname === '/business/subscription';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadBusinessName = async () => {
      try {
        const user = await businessAuth.getCurrentUser();
        if (user && user.business_name) {
          setBusinessName(user.business_name);
        }
      } catch (error) {
        console.error('Error loading business name:', error);
      }
    };

    loadBusinessName();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
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

  return (
    <nav className="bg-white shadow-sm">
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
          </div>
          
          {/* Desktop menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <p className="text-sm text-gray-500">{businessName}</p>
            
            {/* Chat Button - hide on subscription page */}
            {!isSubscriptionPage && (
              <Link href="/business/chat" passHref>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 relative"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="ml-2">Messages</span>
                </Button>
              </Link>
            )}
            
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
          
          {/* Mobile menu */}
          <div className="sm:hidden flex items-center relative" ref={dropdownRef}>
            <button 
              onClick={toggleDropdown}
              className="flex items-center gap-1 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-sm">{businessName || 'Business'}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50">
                {!isSubscriptionPage && (
                  <Link 
                    href="/business/chat" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Messages
                  </Link>
                )}
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleSignOut();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 