'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Calendar,
  Clock,
  Phone,
  MapPin,
  Building,
  Check,
  X,
  Info,
  ArrowLeft,
  Loader2,
  MessageCircle,
  CalendarClock,
  User,
  CalendarPlus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from "@/components/ui/separator";
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BusinessInfo {
  id: string;
  name: string;
  uniqueId: string;
  phone: string;
  address: string;
  city: string;
  state: string;
}

interface Appointment {
  _id: string;
  service: string;
  preferred_date: string;
  preferred_time: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  status: 'requested' | 'confirmed' | 'canceled' | 'reschedule_requested' | 'completed';
  suggestedTime?: {
    date: string;
    time: string;
    suggestedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  chatRoomId: string;
  businessInfo: BusinessInfo;
  wasRescheduled?: boolean;
}

export default function UserAppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [allBookings, setAllBookings] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 9;
  
  // Additional filters
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [businessFilter, setBusinessFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [businessSearchTerm, setBusinessSearchTerm] = useState<string>('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState<string>('');
  const [businessOptions, setBusinessOptions] = useState<{id: string, name: string}[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [filteredBusinessOptions, setFilteredBusinessOptions] = useState<{id: string, name: string}[]>([]);
  const [filteredServiceOptions, setFilteredServiceOptions] = useState<string[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  
  // References for handling outside clicks
  const businessDropdownRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  
  // State for cancel confirmation dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<Appointment | null>(null);
  
  useEffect(() => {
    checkAuth();
    fetchBookings();
  }, [statusFilter]);
  
  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close business dropdown if clicked outside
      if (
        businessDropdownRef.current && 
        !businessDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBusinessDropdown(false);
      }
      
      // Close service dropdown if clicked outside
      if (
        serviceDropdownRef.current && 
        !serviceDropdownRef.current.contains(event.target as Node)
      ) {
        setShowServiceDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Initialize filtered options
  useEffect(() => {
    setFilteredBusinessOptions(businessOptions);
    setFilteredServiceOptions(serviceOptions);
  }, [businessOptions, serviceOptions]);
  
  // Apply all filters whenever they change
  useEffect(() => {
    applyFilters();
  }, [statusFilter, dateRangeStart, dateRangeEnd, businessFilter, serviceFilter, businessSearchTerm, serviceSearchTerm, allBookings]);
  
  // Filter business options based on search term
  useEffect(() => {
    if (businessSearchTerm.trim() === '') {
      setFilteredBusinessOptions(businessOptions);
    } else {
      const filtered = businessOptions.filter(business => 
        business.name.toLowerCase().includes(businessSearchTerm.toLowerCase())
      );
      setFilteredBusinessOptions(filtered);
    }
  }, [businessSearchTerm, businessOptions]);
  
  // Filter service options based on search term
  useEffect(() => {
    if (serviceSearchTerm.trim() === '') {
      setFilteredServiceOptions(serviceOptions);
    } else {
      const filtered = serviceOptions.filter(service => 
        service.toLowerCase().includes(serviceSearchTerm.toLowerCase())
      );
      setFilteredServiceOptions(filtered);
    }
  }, [serviceSearchTerm, serviceOptions]);
  
  const checkAuth = async () => {
    const currentUser = await auth.getCurrentUser();
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view your bookings",
        variant: "destructive"
      });
      router.push('/signin');
      return;
    }
    setUser(currentUser);
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      const token = await auth.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/user/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      
      // Handle API response that could be either an array directly or an object with bookings property
      const bookingsArray = Array.isArray(data) ? data : (data.bookings || []);
      
      // Debug logging for reschedule_requested bookings
      bookingsArray.forEach((apt: Appointment) => {
        if (apt.status === 'reschedule_requested') {
          console.log('Reschedule requested booking:', {
            id: apt._id,
            service: apt.service,
            status: apt.status,
            hasSuggestedTime: !!apt.suggestedTime,
            suggestedTime: JSON.stringify(apt.suggestedTime),
            suggestedTimeType: apt.suggestedTime ? typeof apt.suggestedTime : 'undefined',
            suggestedTimeKeys: apt.suggestedTime ? Object.keys(apt.suggestedTime) : [],
            fullBooking: JSON.stringify(apt)
          });
        }
      });
      
      // Store all bookings for filtering
      setAllBookings(bookingsArray);
      
      // Extract business and service options for filters
      const businesses = new Map<string, {id: string, name: string}>();
      const services = new Set<string>();
      
      bookingsArray.forEach((apt: Appointment) => {
        if (apt.businessInfo?.id && apt.businessInfo?.name) {
          businesses.set(apt.businessInfo.id, {
            id: apt.businessInfo.id,
            name: apt.businessInfo.name
          });
        }
        
        if (apt.service) {
          services.add(apt.service);
        }
      });
      
      setBusinessOptions(Array.from(businesses.values()));
      setServiceOptions(Array.from(services));
      
      // Apply initial filters
      applyFilters();
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filteredBookings = [...allBookings];
    
    // Sort bookings by date (upcoming first)
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
    
    filteredBookings.sort((a, b) => {
      const dateA = new Date(a.preferred_date);
      const dateB = new Date(b.preferred_date);
      
      // Check if dates are in the future or past
      const aIsFuture = dateA >= now;
      const bIsFuture = dateB >= now;
      
      if (aIsFuture && !bIsFuture) {
        // A is future, B is past -> A comes first
        return -1;
      }
      if (!aIsFuture && bIsFuture) {
        // A is past, B is future -> B comes first
        return 1;
      }
      
      // Both are future or both are past, sort by date
      return dateA.getTime() - dateB.getTime();
    });
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredBookings = filteredBookings.filter(
        (apt: Appointment) => apt.status === statusFilter
      );
    }
    
    // Apply date range filter
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart);
      filteredBookings = filteredBookings.filter((apt) => {
        const bookingDate = new Date(apt.preferred_date);
        return bookingDate >= startDate;
      });
    }
    
    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd);
      // Set to end of day
      endDate.setHours(23, 59, 59);
      filteredBookings = filteredBookings.filter((apt) => {
        const bookingDate = new Date(apt.preferred_date);
        return bookingDate <= endDate;
      });
    }
    
    // Apply business filter (by ID or by search term)
    if (businessFilter) {
      // Exact match by ID if we have a selected business
      filteredBookings = filteredBookings.filter(
        (apt) => apt.businessInfo?.id === businessFilter
      );
    } else if (businessSearchTerm.trim()) {
      // Search by name if we have just a search term
      filteredBookings = filteredBookings.filter(
        (apt) => apt.businessInfo?.name.toLowerCase().includes(businessSearchTerm.toLowerCase())
      );
    }
    
    // Apply service filter (exact match or search)
    if (serviceFilter) {
      // Exact match when selected from dropdown
      filteredBookings = filteredBookings.filter(
        (apt) => apt.service === serviceFilter
      );
    } else if (serviceSearchTerm.trim()) {
      // Search by partial match
      filteredBookings = filteredBookings.filter(
        (apt) => apt.service.toLowerCase().includes(serviceSearchTerm.toLowerCase())
      );
    }
    
    setBookings(filteredBookings);
    // Reset to first page when filters change
    setCurrentPage(1);
  };
  
  const resetFilters = () => {
    setDateRangeStart('');
    setDateRangeEnd('');
    setBusinessFilter('');
    setServiceFilter('');
    setBusinessSearchTerm('');
    setServiceSearchTerm('');
    setStatusFilter('all');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-200">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <Check className="w-3 h-3 mr-1.5 text-green-600 opacity-75" />
              </div>
              <Check className="w-3 h-3 mr-1.5 text-green-600 relative" />
            </div>
            Completed
          </Badge>
        );
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-200">
            <Check className="w-3 h-3 mr-1.5" />
            Confirmed
          </Badge>
        );
      case 'canceled':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border border-red-200">
            <X className="w-3 h-3 mr-1.5" />
            Canceled
          </Badge>
        );
      case 'reschedule_requested':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200">
            <CalendarClock className="w-3 h-3 mr-1.5" />
            Time Change
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200">
            <Info className="w-3 h-3 mr-1.5" />
            Requested
          </Badge>
        );
    }
  };

  const getCardClassName = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-100 shadow-sm bg-gradient-to-br from-green-50/50 to-emerald-50/50';
      case 'confirmed':
        return 'border-green-100 shadow-sm';
      case 'reschedule_requested':
        return 'border-amber-100 shadow-sm';
      case 'canceled':
        return 'border-gray-100 shadow-sm opacity-75';
      default:
        return 'border-blue-100 shadow-sm';
    }
  };

  const formatAppointmentDate = (dateStr: string) => {
    try {
      // Check if date string is empty or invalid
      if (!dateStr || dateStr === 'Invalid Date' || dateStr === '') {
        return 'Date not specified';
      }
      
      // Some date strings might be in YYYY-MM-DD format directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // For YYYY-MM-DD format
        const [year, month, day] = dateStr.split('-').map(Number);
        // Month is 0-indexed in JavaScript Date
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) {
          return 'Invalid date';
        }
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // For other date formats, try direct parsing
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  // Get current bookings for the page
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = bookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(bookings.length / bookingsPerPage);

  // Change page
  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Handle canceling a booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      setIsUpdating(true);
      
      const token = auth.getToken();
      const response = await fetch('/api/appointments/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId: bookingId, 
          status: 'canceled',
          sendEmails: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      setBookings(prevBookings => {
        return prevBookings.map(apt => {
          if (apt._id === bookingId) {
            return {
              ...apt,
              status: 'canceled'
            };
          }
          return apt;
        });
      });
      
      toast({
        title: "Booking Canceled",
        description: "Your booking request has been canceled successfully."
      });
      
      const bookingToMessage = bookings.find(a => a._id === bookingId);
      if (bookingToMessage?.chatRoomId) {
        await sendChatMessage(
          bookingId,
          `I've canceled my ${bookingToMessage.service} booking request.`
        );
      }
      
    } catch (error) {
      console.error("Error canceling booking:", error);
      toast({
        title: "Error",
        description: "Failed to cancel the booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to send chat messages
  const sendChatMessage = async (bookingId: string, message: string) => {
    try {
      const booking = bookings.find(a => a._id === bookingId);
      if (!booking?.chatRoomId) {
        throw new Error('Chat room not found');
      }
      
      const token = auth.getToken();
      const response = await fetch(`/api/chat/rooms/${booking.chatRoomId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: message,
          senderType: 'USER'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return true;
    } catch (error) {
      console.error('Error sending chat message:', error);
      return false;
    }
  };

  // Handle opening the cancel confirmation dialog
  const openCancelDialog = (bookingId: string) => {
    setBookingToCancel(bookingId);
    setShowCancelDialog(true);
  };
  
  // Handle actual booking cancellation after confirmation
  const confirmCancelBooking = () => {
    if (!bookingToCancel) {
      toast({
        title: "Error",
        description: "Could not identify which booking to cancel",
        variant: "destructive"
      });
      setShowCancelDialog(false);
      return;
    }
    
    const booking = bookings.find(a => a._id === bookingToCancel);
    
    if (!booking) {
      toast({
        title: "Error",
        description: "Could not find the booking to cancel",
        variant: "destructive"
      });
      setShowCancelDialog(false);
      return;
    }
    
    if (booking.status === 'reschedule_requested') {
      handleCancelBooking(bookingToCancel);
    } else {
      handleCancelBooking(bookingToCancel);
    }
    
    setShowCancelDialog(false);
  };

  // Handle accepting the rescheduled time suggestion
  const handleAcceptReschedule = async (bookingId: string, suggestedTime: { date: string; time: string } | undefined) => {
    try {
      setIsUpdating(true);
      
      if (!suggestedTime || !suggestedTime.date || !suggestedTime.time) {
        throw new Error('Invalid suggested time data. Cannot accept reschedule.');
      }
      
      const token = auth.getToken();
      const response = await fetch('/api/appointments/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId: bookingId, 
          status: 'confirmed',
          preferred_date: suggestedTime.date,
          preferred_time: suggestedTime.time,
          isRescheduleAcceptance: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to accept new booking time');
      }

      // Update booking in local state
      setBookings(prevBookings => {
        return prevBookings.map(apt => {
          if (apt._id === bookingId) {
            return {
              ...apt,
              status: 'confirmed',
              preferred_date: suggestedTime.date,
              preferred_time: suggestedTime.time,
              suggestedTime: undefined,
              wasRescheduled: true
            };
          }
          return apt;
        });
      });
      
      toast({
        title: "Success",
        description: "You've accepted the new booking time",
      });
      
      await sendChatMessage(
        bookingId,
        `I've accepted the new time for my ${bookings.find(a => a._id === bookingId)?.service} booking on ${formatAppointmentDate(suggestedTime.date)} at ${suggestedTime.time}.`
      );
      
    } catch (error) {
      console.error("Error accepting reschedule:", error);
      toast({
        title: "Error",
        description: "Failed to accept the new booking time. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle rejecting the rescheduled time suggestion
  const handleRejectReschedule = async (bookingId: string) => {
    try {
      setIsUpdating(true);
      
      const token = auth.getToken();
      const response = await fetch('/api/appointments/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId: bookingId, 
          status: 'canceled',
          rejectSuggestion: true,
          sendEmails: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to decline new booking time');
      }

      setBookings(prevBookings => {
        return prevBookings.map(apt => {
          if (apt._id === bookingId) {
            return {
              ...apt,
              status: 'canceled',
              suggestedTime: undefined
            };
          }
          return apt;
        });
      });
      
      toast({
        title: "Booking Canceled",
        description: "You've declined the suggested booking time and canceled the booking",
      });
      
      await sendChatMessage(
        bookingId,
        `I'm canceling my ${bookings.find(a => a._id === bookingId)?.service} booking as I cannot make the suggested time.`
      );
      
    } catch (error) {
      console.error("Error rejecting reschedule:", error);
      toast({
        title: "Error",
        description: "Failed to decline the new booking time. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,rgba(255,255,255,0.8),rgba(255,255,255,0.8))] bg-fixed"></div>
      
      <div className="container relative mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col gap-6">
          <div className="space-y-6 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                My Bookings
              </h1>
              
              <p className="text-sm text-muted-foreground flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-indigo-500 flex-shrink-0" />
                <span>Manage your bookings</span>
              </p>
            </div>
          
            <div className="w-full">
              <Tabs defaultValue="all" className="w-full" onValueChange={setStatusFilter}>
                <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 bg-slate-100/50 backdrop-blur-sm">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                  <TabsTrigger value="requested" className="text-xs sm:text-sm">Requested</TabsTrigger>
                  <TabsTrigger value="confirmed" className="text-xs sm:text-sm">Confirmed</TabsTrigger>
                  <TabsTrigger value="completed" className="hidden sm:block text-xs sm:text-sm">Completed</TabsTrigger>
                  <TabsTrigger value="reschedule_requested" className="hidden sm:block text-xs sm:text-sm">Changes</TabsTrigger>
                </TabsList>
                
                {/* Second row of tabs for mobile only */}
                <TabsList className="w-full grid grid-cols-2 sm:hidden mt-2 bg-slate-100/50 backdrop-blur-sm">
                  <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
                  <TabsTrigger value="reschedule_requested" className="text-xs">Changes</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 text-xs sm:text-sm py-1.5 h-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                {showFilters ? 'Hide Filters' : 'Smart Filters'}
              </Button>
              
              {(dateRangeStart || dateRangeEnd || businessFilter || serviceFilter) && (
                <Button 
                  variant="ghost" 
                  onClick={resetFilters}
                  className="text-xs sm:text-sm text-indigo-500 py-1.5 h-auto"
                >
                  Reset Filters
                </Button>
              )}
            </div>
            
            {showFilters && (
              <Card className="mb-4 backdrop-blur-sm bg-white/50 border border-slate-200/50 shadow-sm">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date Range Start */}
                    <div className="space-y-2">
                      <Label htmlFor="date-range-start" className="text-xs sm:text-sm">From Date</Label>
                      <Input
                        id="date-range-start"
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    
                    {/* Date Range End */}
                    <div className="space-y-2">
                      <Label htmlFor="date-range-end" className="text-xs sm:text-sm">To Date</Label>
                      <Input
                        id="date-range-end"
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    
                    {/* Business Filter */}
                    <div className="space-y-2 relative" ref={businessDropdownRef}>
                      <Label htmlFor="business-filter" className="text-xs sm:text-sm">Business</Label>
                      <div className="relative">
                        <Input
                          id="business-filter"
                          type="text"
                          placeholder="Search for business..."
                          value={businessSearchTerm}
                          onChange={(e) => {
                            setBusinessSearchTerm(e.target.value);
                            setShowBusinessDropdown(true);
                          }}
                          onFocus={() => setShowBusinessDropdown(true)}
                          className="h-9 text-sm"
                        />
                        {businessFilter && (
                          <button
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => {
                              setBusinessFilter('');
                              setBusinessSearchTerm('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      {showBusinessDropdown && filteredBusinessOptions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
                          {filteredBusinessOptions.map((business) => (
                            <div
                              key={business.id}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${
                                businessFilter === business.id ? 'bg-blue-50 font-medium' : ''
                              }`}
                              onClick={() => {
                                setBusinessFilter(business.id);
                                setBusinessSearchTerm(business.name);
                                setShowBusinessDropdown(false);
                              }}
                            >
                              {business.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Service Filter */}
                    <div className="space-y-2 relative" ref={serviceDropdownRef}>
                      <Label htmlFor="service-filter" className="text-xs sm:text-sm">Service</Label>
                      <div className="relative">
                        <Input
                          id="service-filter"
                          type="text"
                          placeholder="Search for service..."
                          value={serviceSearchTerm}
                          onChange={(e) => {
                            setServiceSearchTerm(e.target.value);
                            setShowServiceDropdown(true);
                          }}
                          onFocus={() => setShowServiceDropdown(true)}
                          className="h-9 text-sm"
                        />
                        {serviceFilter && (
                          <button
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => {
                              setServiceFilter('');
                              setServiceSearchTerm('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      {showServiceDropdown && filteredServiceOptions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
                          {filteredServiceOptions.map((service) => (
                            <div
                              key={service}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${
                                serviceFilter === service ? 'bg-blue-50 font-medium' : ''
                              }`}
                              onClick={() => {
                                setServiceFilter(service);
                                setServiceSearchTerm(service);
                                setShowServiceDropdown(false);
                              }}
                            >
                              {service}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Separator className="bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 h-[1px]" />

          {loading ? (
            <div className="flex justify-center items-center h-64">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-indigo-300 animate-pulse blur-xl opacity-70"></div>
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 relative z-10" />
            </div>
              </div>
            ) : currentBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-indigo-200 rounded-full blur-md"></div>
                  <Calendar className="h-12 w-12 text-indigo-600 relative z-10" />
                </div>
                <h3 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">No Bookings Found</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                You don't have any {statusFilter !== 'all' ? statusFilter : ''} bookings yet.
              </p>
                <Button className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm">
                  <CalendarPlus className="h-3.5 w-3.5 mr-2" />
                  Book New Service
                </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {currentBookings.map((booking) => {
                return (
                  <Card 
                    key={`${booking._id}-${booking.status}-${!!booking.suggestedTime}`} 
                      className={`overflow-hidden transition-all backdrop-blur-sm ${getCardClassName(booking.status)} hover:shadow-md hover:translate-y-[-2px] border border-slate-200/50`}
                  >
                      <div className="absolute top-0 right-0 h-12 w-12 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-xl"></div>
                      
                    <CardHeader className="pb-2 px-3 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-1 rounded-md">
                              <Calendar className="h-4 w-4 text-indigo-600" />
                            </div>
                          <CardTitle className="text-sm sm:text-base">
                            {booking.service || 'Service not specified'}
                          </CardTitle>
                        </div>
                        {getStatusBadge(booking.status || 'requested')}
                      </div>
                        <CardDescription className="mt-1 flex items-center text-xs sm:text-sm">
                          <Building className="h-3 w-3 text-slate-400 mr-1" />
                        {booking.businessInfo?.name || 'Unknown Business'}
                      </CardDescription>
                    </CardHeader>
                      
                    <CardContent className="pb-3 px-3 sm:px-6">
                      <div className="space-y-2">
                        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium">Date & Time</span>
                          </div>
                          <span className={`text-xs sm:text-sm ${booking.status === 'confirmed' && booking.updatedAt && new Date(booking.updatedAt).getTime() > Date.now() - 3600000 ? 'font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded' : ''}`}>
                            {booking.preferred_date ? formatAppointmentDate(booking.preferred_date) : 'Date not specified'} at {booking.preferred_time || 'Time not specified'}
                          </span>
                        </div>
                        
                        {/* Show a notice if the booking was recently confirmed from a reschedule request */}
                        {booking.status === 'confirmed' && 
                         booking.wasRescheduled && (
                          <div className="mt-2 p-2 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="bg-green-100 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0">
                                <Check className="h-3 w-3 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-green-700">
                                  New time confirmed for this booking.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Show suggested alternative time if status is reschedule_requested */}
                        {booking.status === 'reschedule_requested' && 
                         !!booking.suggestedTime && 
                         typeof booking.suggestedTime === 'object' && 
                         'date' in booking.suggestedTime && 
                         'time' in booking.suggestedTime && 
                         !!booking.suggestedTime.date && 
                         !!booking.suggestedTime.time && (
                          <div className="mt-2 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="bg-amber-100 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0">
                                <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs sm:text-sm font-medium text-amber-800">Suggested Alternative Time</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                  {formatAppointmentDate(booking.suggestedTime.date)} at {booking.suggestedTime.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {booking.businessInfo && (
                          <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium">Location</span>
                            </div>
                            <span className="text-xs sm:text-sm">
                              {[
                                booking.businessInfo.address,
                                booking.businessInfo.city,
                                booking.businessInfo.state
                              ].filter(Boolean).join(', ') || 'Address not available'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">Customer</span>
                          </div>
                          <span className="text-xs sm:text-sm">
                            {booking.customerName || 'Name not provided'} • {booking.customerPhone || 'Phone not provided'}
                          </span>
                        </div>
                        
                        {typeof booking.notes === 'string' && booking.notes.trim() && (
                          <div className="flex items-start gap-2">
                            <MessageCircle className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-xs sm:text-sm font-medium">Notes</span>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{booking.notes}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">Booked on</span>
                          </div>
                          <span className="text-xs sm:text-sm">
                            {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'Date unknown'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-1 px-3 sm:px-6 flex flex-col">
                      {booking.status === 'reschedule_requested' && 
                       !!booking.suggestedTime && 
                       typeof booking.suggestedTime === 'object' && 
                       'date' in booking.suggestedTime && 
                       'time' in booking.suggestedTime && 
                       !!booking.suggestedTime.date && 
                       !!booking.suggestedTime.time ? (
                        <div className="space-y-2 w-full">
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              variant="default" 
                                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-xs sm:text-sm py-1.5 h-auto"
                              onClick={() => {
                                if (!booking.suggestedTime || !booking.suggestedTime.date || !booking.suggestedTime.time) {
                                  toast({
                                    title: "Error",
                                    description: "No suggested time available for this booking.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                handleAcceptReschedule(booking._id, booking.suggestedTime);
                              }}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 sm:mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              className="w-full border-red-200 text-red-700 hover:text-red-800 hover:bg-red-50 hover:border-red-300 text-xs sm:text-sm py-1.5 h-auto"
                              onClick={() => openCancelDialog(booking._id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 sm:mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <X className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                                  Cancel
                                </>
                              )}
                            </Button>
                          </div>

                          <Button 
                            variant="outline" 
                            className="w-full text-xs sm:text-sm py-1.5 h-auto"
                            onClick={() => router.push(`/chat/${booking.chatRoomId}`)}
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                            Message Business
                          </Button>
                        </div>
                      ) : booking.status === 'reschedule_requested' ? (
                        <div className="space-y-2 w-full">
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                              <p className="text-xs sm:text-sm text-amber-800">
                                Reschedule requested, but no alternative time was provided.
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              variant="outline" 
                              className="w-full border-red-200 text-red-700 hover:text-red-800 hover:bg-red-50 hover:border-red-300 text-xs sm:text-sm py-1.5 h-auto"
                                onClick={() => openCancelDialog(booking._id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 sm:mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <X className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                                  Cancel 
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        ) : booking.status === 'requested' ? (
                          <div className="space-y-2 w-full">
                            <div className="flex justify-between gap-2">
                              <Button 
                                variant="outline" 
                                className="flex-1 border-indigo-200 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 text-xs sm:text-sm py-1.5 h-auto"
                                onClick={() => router.push(`/chat/${booking.chatRoomId}`)}
                              >
                                <MessageCircle className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                                Message
                              </Button>
                              <Button 
                                variant="outline" 
                                className="flex-1 border-red-200 text-red-700 hover:text-red-800 hover:bg-red-50 hover:border-red-300 text-xs sm:text-sm py-1.5 h-auto"
                                onClick={() => openCancelDialog(booking._id)}
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 sm:mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                                    Cancel
                                  </>
                                )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                            className="w-full text-xs sm:text-sm py-1.5 h-auto"
                            onClick={() => router.push(`/chat/${booking.chatRoomId}`)}
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1.5 sm:mr-2" />
                          Message Business
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

            {/* Pagination - Enhanced for Mobile */}
            {!loading && bookings.length > bookingsPerPage && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-9 active:scale-95 touch-manipulation"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <Button
                      key={number}
                      variant={currentPage === number ? "default" : "outline"}
                      onClick={() => paginate(number)}
                      className={`h-8 w-8 p-0 sm:h-9 sm:w-9 text-xs sm:text-sm active:scale-95 touch-manipulation ${
                        currentPage === number 
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600" 
                          : ""
                      }`}
                      aria-label={`Page ${number}`}
                      aria-current={currentPage === number ? "page" : undefined}
                    >
                      {number}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-9 active:scale-95 touch-manipulation"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Dialogs */}
          {/* Cancel Confirmation Dialog */}
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent className="sm:max-w-md bg-white/80 backdrop-blur-md border border-indigo-100">
              <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Cancellation
                </DialogTitle>
                <DialogDescription>
                  {(() => {
                    const booking = bookings.find(a => a._id === bookingToCancel);
                    if (booking?.status === 'reschedule_requested') {
                      return "Are you sure you want to decline the reschedule request? This will cancel your booking.";
                    } else {
                      return "Are you sure you want to cancel this booking request?";
                    }
                  })()}
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCancelDialog(false);
                  }}
                >
                  No, Keep It
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmCancelBooking}
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Yes, Cancel Booking
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
} 