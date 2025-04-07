'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { 
  Loader2, Camera, MapPin, Settings, Calendar, Clock, 
  CheckCircle2, XCircle, AlertCircle, ChevronRight, Filter
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { AIBackground } from "@/components/ui/ai-background";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  created_at: number;
  location: string;
  memberSince: string;
  mobile?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    mobile: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        location: user.location || '',
        mobile: user.mobile || ''
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const loadUserData = async () => {
    try {
      if (!auth.isAuthenticated()) {
        console.log('User not authenticated, redirecting to signin');
        router.push('/signin');
        return;
      }

      console.log('Fetching user data...');
      const userData = await auth.getCurrentUser();
      console.log('User data received:', userData);
      
      // Log the location field specifically
      console.log('Location field details:', {
        value: userData.location,
        type: typeof userData.location,
        isEmpty: userData.location === '',
        isUndefined: userData.location === undefined,
        isNull: userData.location === null
      });

      // Normalize location display - empty string should display as "Location not set"
      const displayLocation = 
        userData.location === undefined || 
        userData.location === null || 
        userData.location === '' 
          ? 'Location not set' 
          : userData.location;
      
      console.log('Display location set to:', displayLocation);

      setUser({
        ...userData,
        location: displayLocation,
        memberSince: new Date(userData.created_at).toLocaleDateString('en-US', { 
          month: 'long',
          year: 'numeric'
        })
      });
      
      // For the form, use the actual value from the database (normalized to empty string if null/undefined)
      setFormData({
        name: userData.name,
        location: userData.location || '',
        mobile: userData.mobile || ''
      });
      
      console.log('Form data initialized:', {
        name: userData.name,
        location: userData.location || '',
        locationEmpty: (userData.location || '') === '',
        mobile: userData.mobile || ''
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Detailed error:', {
        message: errorMessage,
        error
      });
      toast({
        title: 'Error',
        description: 'Failed to load profile data. Please try signing in again.',
        variant: 'destructive',
      });
      router.push('/signin');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      // Make sure location is a proper string and sanitize any empty values
      const sanitizedLocation = formData.location?.trim() || '';
      
      // Prepare the update data
      const updateData = {
        name: formData.name,
        mobile: formData.mobile,
        location: sanitizedLocation
      };
      
      console.log('Submitting profile update with data:', JSON.stringify(updateData));
      
      const updatedUser = await auth.updateProfile(updateData);
      
      console.log('Profile update response:', JSON.stringify(updatedUser));
      
      // Update the complete user state with new data
      setUser(prev => {
        if (!prev) return null;
        
        const updatedState = {
          ...prev,
          name: updatedUser.name,
          location: updatedUser.location || 'Location not set',
          mobile: updatedUser.mobile
        };
        
        console.log('Updated user state:', JSON.stringify(updatedState));
        return updatedState;
      });
      
      // Update form data to match new values
      setFormData(prev => {
        const updatedFormData = {
          ...prev,
          name: updatedUser.name,
          location: updatedUser.location || '',
          mobile: updatedUser.mobile || ''
        };
        
        console.log('Updated form data:', JSON.stringify(updatedFormData));
        return updatedFormData;
      });
      
      // Show success message
      toast({
        title: '✨ Profile Updated',
        description: 'Your profile has been updated successfully!',
        variant: 'default',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50/50 to-white">
        <div className="relative">
          <AIBackground intensity={0.3} />
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50/50 to-white">
        <div className="relative">
          <AIBackground intensity={0.3} />
          <p className="text-red-500 font-medium">Failed to load profile data. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 to-white py-6 md:py-12">
      <div className="container mx-auto px-4">
        <motion.div 
          className="max-w-4xl mx-auto space-y-6 md:space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
            <motion.div 
              className="flex items-center gap-4 md:gap-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-2xl md:text-3xl font-semibold">
                  {user.name.charAt(0)}
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
                <div className="space-y-1">
                  <p className="text-sm md:text-base text-gray-600 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-500" />
                    {user.location}
                  </p>
                  <p className="text-sm md:text-base text-gray-600 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-500" />
                    Member since {user.memberSince}
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button variant="outline" asChild className="shadow-sm hover:shadow-md transition-all">
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-violet-600" />
                  <span className="hidden md:inline">Settings</span>
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Profile Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-4 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-transparent to-transparent" />
              <form onSubmit={handleSaveProfile} className="relative space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-sm md:text-base text-gray-700 font-medium">Full Name</Label>
                      <Input 
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        className="mt-2 shadow-sm focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm md:text-base text-gray-700 font-medium">Email</Label>
                      <Input 
                        id="email"
                        name="email"
                        type="email"
                        value={user?.email || ''}
                        disabled={true}
                        className="mt-2 bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <Label htmlFor="mobile" className="text-sm md:text-base text-gray-700 font-medium">Mobile Number</Label>
                      <Input 
                        id="mobile"
                        name="mobile"
                        type="tel"
                        placeholder="+1234567890"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        className="mt-2 shadow-sm focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location" className="text-sm md:text-base text-gray-700 font-medium">Location</Label>
                      <Input 
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        placeholder="Enter your location"
                        className="mt-2 shadow-sm focus:ring-2 focus:ring-violet-500"
                        onBlur={(e) => {
                          // Trim the location value on blur
                          if (e.target.value !== e.target.value.trim()) {
                            setFormData(prev => ({
                              ...prev,
                              location: e.target.value.trim()
                            }));
                          }
                          console.log('Location input blurred with value:', e.target.value);
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto min-w-[200px] bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden md:inline">Updating Profile...</span>
                        <span className="md:hidden">Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden md:inline">Save Changes</span>
                        <span className="md:hidden">Save</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 