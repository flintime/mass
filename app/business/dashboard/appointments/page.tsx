'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, isTomorrow, addDays, parse, formatDistanceToNow, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Clock3,
  Loader2,
  CalendarClock,
  CalendarRange,
  CalendarCheck,
  CalendarX,
  MessageSquare,
  MoreHorizontal,
  ChevronDown,
  CheckCheck,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/components/ui/use-toast';
import { businessAuth } from '@/lib/businessAuth';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import useMobileDetect from '@/hooks/useMobileDetect';
import useResponsiveHeader from '../../../hooks/useResponsiveHeader';
import '../mobile.css';
import './mobile.css';

interface Appointment {
  _id: string;
  service: string;
  preferred_date: string;
  preferred_time: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  status: 'requested' | 'confirmed' | 'canceled' | 'completed' | 'reschedule_requested';
  suggestedTime?: {
    date: string;
    time: string;
    suggestedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  chatRoomId?: string;
}

interface ChatRoom {
  _id: string;
  appointments: Appointment[];
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isMobile } = useResponsiveHeader(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [alternativeTime, setAlternativeTime] = useState('');
  const [alternativeDate, setAlternativeDate] = useState('');
  const [updatingAppointment, setUpdatingAppointment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [displayDate, setDisplayDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [specificDateFilter, setSpecificDateFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter, specificDateFilter]);

  const fetchAppointments = async () => {
    try {
      if (!businessAuth.isAuthenticated()) {
        router.push('/business/signin');
        return;
      }

      const token = businessAuth.getToken();
      console.log('Fetching appointments with token:', token ? 'Present' : 'Missing');

      const response = await fetch('/api/business/chat/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to fetch chat rooms');
      }

      const chatRooms: ChatRoom[] = await response.json();
      console.log('Fetched chat rooms:', chatRooms.length);
      
      // Extract all appointments from chat rooms
      let allAppointments: Appointment[] = [];
      chatRooms.forEach(room => {
        if (room.appointments && room.appointments.length > 0) {
          console.log(`Found ${room.appointments.length} appointments in room ${room._id}`);
          
          // Log each appointment with its suggestedTime for debugging
          room.appointments.forEach((apt, index) => {
            console.log(`Appointment ${index} in room ${room._id}:`, {
              id: apt._id,
              status: apt.status,
              service: apt.service,
              suggestedTime: apt.suggestedTime || 'Not set',
              hasSuggestedTime: !!apt.suggestedTime
            });
            
            // Process the appointment before adding to the list
            if (apt.status === 'reschedule_requested' && !apt.suggestedTime) {
              console.warn(`Appointment ${apt._id} has reschedule_requested status but no suggestedTime! Adding empty one.`);
              // Add an empty suggestedTime object to prevent UI errors
              apt.suggestedTime = {
                date: apt.preferred_date,
                time: apt.preferred_time,
                suggestedAt: new Date().toISOString()
              };
            }
          });
          
          // Add chatRoomId to each appointment
          const appointmentsWithChatRoom = room.appointments.map(apt => ({
            ...apt,
            chatRoomId: room._id
          }));
          allAppointments = [...allAppointments, ...appointmentsWithChatRoom];
        }
      });

      console.log('Total appointments found:', allAppointments.length);

      // Apply filters
      let filteredAppointments = allAppointments;
      
      if (statusFilter !== 'all') {
        filteredAppointments = filteredAppointments.filter(apt => apt.status === statusFilter);
      }

      if (dateFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);  // Set to start of day
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        switch (dateFilter) {
          case 'today':
            filteredAppointments = filteredAppointments.filter(apt => {
              // Parse the date properly accounting for ISO format
              const aptDate = new Date(apt.preferred_date);
              // Compare only the date portions
              return aptDate.toDateString() === today.toDateString();
            });
            break;
          case 'tomorrow':
            filteredAppointments = filteredAppointments.filter(apt => {
              const aptDate = new Date(apt.preferred_date);
              return aptDate.toDateString() === tomorrow.toDateString();
            });
            break;
          case 'week':
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            filteredAppointments = filteredAppointments.filter(apt => {
              const aptDate = new Date(apt.preferred_date);
              // Set to start of day for proper comparison
              aptDate.setHours(0, 0, 0, 0);
              return aptDate >= today && aptDate <= nextWeek;
            });
            break;
          case 'month':
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            filteredAppointments = filteredAppointments.filter(apt => {
              const aptDate = new Date(apt.preferred_date);
              // Set to start of day for proper comparison
              aptDate.setHours(0, 0, 0, 0);
              return aptDate >= today && aptDate <= nextMonth;
            });
            break;
          case 'specific':
            if (specificDateFilter) {
              filteredAppointments = filteredAppointments.filter(apt => {
                const aptDate = new Date(apt.preferred_date);
                const specificDate = new Date(specificDateFilter);
                return aptDate.toDateString() === specificDate.toDateString();
              });
            }
            break;
        }
      }

      // Sort appointments by date and time
      filteredAppointments.sort((a, b) => {
        // Create Date objects with proper parsing
        let dateA: Date, dateB: Date;
        
        try {
          // Handle date and time separately to avoid issues
          const dateObjA = new Date(a.preferred_date);
          const [hoursA, minutesA] = a.preferred_time.split(':').map(Number);
          dateA = new Date(dateObjA);
          dateA.setHours(hoursA || 0, minutesA || 0, 0, 0);
        } catch (e) {
          console.error('Error parsing date A:', e);
          dateA = new Date(0); // Default to epoch if parsing fails
        }
        
        try {
          const dateObjB = new Date(b.preferred_date);
          const [hoursB, minutesB] = b.preferred_time.split(':').map(Number);
          dateB = new Date(dateObjB);
          dateB.setHours(hoursB || 0, minutesB || 0, 0, 0);
        } catch (e) {
          console.error('Error parsing date B:', e);
          dateB = new Date(0); // Default to epoch if parsing fails
        }
        
        return dateA.getTime() - dateB.getTime();
      });

      setAppointments(filteredAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      setUpdatingAppointment(appointmentId);
      const token = businessAuth.getToken();
      const apiUrl = `/api/business/chat/appointment/status`;
      
      console.log(`Updating appointment status:`, {
        appointmentId,
        newStatus,
        apiUrl,
        hasToken: !!token
      });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          appointmentId,
          status: newStatus 
        })
      });

      console.log('Status update response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error updating appointment status:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to update appointment status');
      }

      const updatedAppointment = await response.json();
      console.log('Appointment updated successfully:', updatedAppointment);

      toast({
        title: "Success",
        description: `Appointment ${newStatus} successfully`,
      });

      // Refresh appointments
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingAppointment(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'canceled':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'completed':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'reschedule_requested':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'canceled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'completed':
        return <CheckCheck className="w-5 h-5 text-blue-600" />;
      case 'reschedule_requested':
        return <Clock3 className="w-5 h-5 text-purple-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const formatAppointmentDate = (dateStr: string, timeStr: string) => {
    try {
      // Check if dateStr is in ISO format (from API) or regular date string format
      let date;
      if (dateStr.includes('T')) {
        // Handle ISO format directly
        date = new Date(dateStr);
      } else {
        // Try parsing with different formats if needed
        date = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isNaN(date.getTime())) {
          // Fallback to direct parsing if format doesn't match
          date = new Date(dateStr);
        }
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateStr);
        return 'Invalid date';
      }
      
      return `${format(date, 'PPP')} at ${timeStr}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'Date string:', dateStr);
      return 'Invalid date';
    }
  };

  const suggestAlternativeTime = async (appointmentId: string, newDate: string, newTime: string) => {
    console.log('===== SUGGEST ALTERNATIVE TIME STARTED =====');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('Input parameters:', { appointmentId, newDate, newTime });
    
    // Find the original appointment at the start
    const originalAppointment = appointments.find(apt => apt._id === appointmentId);
    console.log('Original appointment before suggesting time:', JSON.stringify(originalAppointment, null, 2));
    
    // Add detailed logging for appointment fields
    if (originalAppointment) {
      console.log('Critical appointment fields for rescheduling:');
      console.log('- service:', originalAppointment.service);
      console.log('- preferred_date:', originalAppointment.preferred_date);
      console.log('- preferred_time:', originalAppointment.preferred_time);
      console.log('- status:', originalAppointment.status);
      console.log('- chatRoomId:', originalAppointment.chatRoomId);
    }
    
    if (!originalAppointment?.chatRoomId) {
      console.error('ERROR: Missing chatRoomId in appointment');
      toast({
        title: "Error",
        description: "Appointment not found or missing chat room",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const token = businessAuth.getToken();
      console.log('Auth token present:', !!token);
      
      // Create the suggestedTime object
      const suggestedTimeData = {
        date: newDate,
        time: newTime,
        suggestedAt: new Date().toISOString()
      };

      console.log('Created suggestedTimeData:', JSON.stringify(suggestedTimeData, null, 2));
      console.log('Will update appointment with ID:', appointmentId);

      // Optimistically update the local UI state immediately
      setAppointments(prevAppointments => {
        return prevAppointments.map(apt => {
          if (apt._id === appointmentId) {
            const updatedAppointment: Appointment = {
              ...apt,
              status: 'reschedule_requested',
              suggestedTime: suggestedTimeData
            };
            console.log('Optimistically updated appointment:', updatedAppointment);
            return updatedAppointment;
          }
          return apt;
        });
      });

      // Close the dialog immediately for better UX
      setShowModifyDialog(false);
      
      // Properly parse the date string for the message
      let formattedDate;
      try {
        // Try to parse the date string, which should be in yyyy-MM-dd format from the date input
        const parsedDate = parse(newDate, 'yyyy-MM-dd', new Date());
        formattedDate = format(parsedDate, 'PPP'); // Format to "Jan 1, 2021"
      } catch (error) {
        console.error('Error parsing alternative date:', error);
        formattedDate = format(new Date(newDate), 'PPP'); // Fallback
      }

      // Update status with suggested time first, then send message to ensure they're properly linked
      try {
        console.log('About to call updateAppointmentStatusWithSuggestedTime with data:', {
          appointmentId,
          suggestedTimeData
        });
        
        const statusUpdateResult = await updateAppointmentStatusWithSuggestedTime(appointmentId, suggestedTimeData);
        console.log('Status update completed successfully, result:', statusUpdateResult);
        
        // Now send the chat message
        const chatResult = await sendChatMessage(originalAppointment.chatRoomId, formattedDate, newTime, originalAppointment.service);
        console.log('Chat message sent successfully');
        
        // After successful updates, refresh appointments to get the latest data
        console.log('Refreshing appointments to get latest data');
        await fetchAppointments();
        
        // Verify the appointment was updated correctly
        const updatedAppointment = appointments.find(apt => apt._id === appointmentId);
        console.log('Appointment after refresh:', updatedAppointment);
        
        // Check if suggestedTime was correctly loaded after refresh
        if (updatedAppointment?.suggestedTime) {
          console.log('SuggestedTime exists after refresh:', updatedAppointment.suggestedTime);
        } else {
          console.warn('SuggestedTime missing after refresh, using manual update');
          // If the suggestedTime is missing after refresh, manually update the appointment list
          setAppointments(prev => prev.map(apt => {
            if (apt._id === appointmentId) {
              return {
                ...apt,
                status: 'reschedule_requested',
                suggestedTime: suggestedTimeData
              };
            }
            return apt;
          }));
        }
      } catch (error) {
        console.error('Error in sequential operations:', error);
        throw error; // Re-throw to be caught by the outer try-catch
      }

      toast({
        title: "Success",
        description: "Alternative time suggestion sent to customer",
      });

      // Clear the form state (dialog is already closed)
      setSelectedAppointment(null);
      setAlternativeTime('');
      setAlternativeDate('');
    } catch (error) {
      console.error('Error suggesting alternative time:', error);
      
      // Revert the optimistic update if the server request fails
      setAppointments(prevAppointments => {
        return prevAppointments.map(apt => {
          if (apt._id === appointmentId) {
            return originalAppointment; // Restore original appointment data
          }
          return apt;
        });
      });
      
      toast({
        title: "Error",
        description: "Failed to send alternative time suggestion. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Helper function to send chat message
  const sendChatMessage = async (chatRoomId: string, formattedDate: string, newTime: string, service: string) => {
    const token = businessAuth.getToken();
    const message = `The business suggests a new time:\n${formattedDate} at ${newTime}.\nPlease go to My Appointments to approve or decline this new time.`;

    const response = await fetch(`/api/chat/rooms/${chatRoomId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message,
        senderType: 'BUSINESS'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error sending chat message:', errorData);
      throw new Error(errorData.error || 'Failed to send chat message');
    }
    
    return response;
  };

  // Helper function to update appointment status with suggested time
  const updateAppointmentStatusWithSuggestedTime = async (appointmentId: string, suggestedTimeData: any) => {
    console.log('===== UPDATE APPOINTMENT WITH SUGGESTED TIME =====');
    const token = businessAuth.getToken();
    const apiUrl = `/api/business/chat/appointment/status`;
    
    console.log('Sending update with suggestedTime:', JSON.stringify({ 
      appointmentId, 
      status: 'reschedule_requested',
      suggestedTimeData 
    }, null, 2));
    
    // Make up to 3 attempts to save the data
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Attempt ${attempt} to update appointment with suggested time`);
      
      try {
        const updateResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            appointmentId,
            status: 'reschedule_requested',
            suggestedTime: suggestedTimeData,
            attempt: attempt
          })
        });

        const responseStatus = {
          status: updateResponse.status,
          statusText: updateResponse.statusText,
          ok: updateResponse.ok
        };
        console.log(`Attempt ${attempt} status:`, responseStatus);

        let responseData;
        try {
          responseData = await updateResponse.json();
          console.log(`Attempt ${attempt} response data:`, JSON.stringify(responseData, null, 2));
          
          // Check if the response contains the suggestedTime
          if (responseData?.suggestedTime) {
            console.log('Success! SuggestedTime found in response data.');
            return responseData;
          } else {
            console.warn(`Attempt ${attempt}: SuggestedTime missing from response, will retry`);
            // Only retry if we haven't reached the maximum attempts
            if (attempt < 3) {
              console.log('Will retry in 500ms...');
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
              continue;
            } else {
              console.log('Maximum attempts reached, using local suggestedTime data');
              responseData.suggestedTime = suggestedTimeData;
              return responseData;
            }
          }
        } catch (e) {
          console.warn(`Error parsing response JSON in attempt ${attempt}:`, e);
          if (attempt < 3) {
            console.log('Will retry in 500ms due to parsing error...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            continue;
          } else {
            console.log('Maximum attempts reached after parsing errors, using local data');
            return { 
              _id: appointmentId,
              status: 'reschedule_requested', 
              suggestedTime: suggestedTimeData 
            };
          }
        }
        
      } catch (error) {
        console.error(`Network error in attempt ${attempt}:`, error);
        if (attempt < 3) {
          console.log('Will retry in 500ms due to network error...');
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
          continue;
        } else {
          console.error('All attempts failed, throwing error');
          throw new Error('Failed to update appointment status after multiple attempts');
        }
      }
    }
    
    // If we reach here, all attempts have failed but without throwing
    throw new Error('Failed to properly update appointment with suggested time');
  };

  const handleCancelClick = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setShowCancelDialog(true);
  };

  const confirmCancellation = async () => {
    if (appointmentToCancel) {
      try {
        console.log('Confirming cancellation for appointment:', appointmentToCancel);
        
        const token = businessAuth.getToken();
        const apiUrl = `/api/business/chat/appointment/status`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            appointmentId: appointmentToCancel,
            status: 'canceled' 
          })
        });

        console.log('Cancellation response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Appointment canceled successfully",
          });
          
          // Refresh appointments
          fetchAppointments();
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error canceling appointment:', errorData);
          toast({
            title: "Error",
            description: "Failed to cancel appointment. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error in cancellation:', error);
        toast({
          title: "Error",
          description: "Failed to cancel appointment. Please try again.",
          variant: "destructive"
        });
      }
      
      setShowCancelDialog(false);
      setAppointmentToCancel(null);
    }
  };

  // New function to get appointment counts by status
  const getAppointmentCounts = () => {
    const total = appointments.length;
    const requested = appointments.filter(apt => apt.status === 'requested').length;
    const confirmed = appointments.filter(apt => apt.status === 'confirmed').length;
    const canceled = appointments.filter(apt => apt.status === 'canceled').length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const rescheduleRequested = appointments.filter(apt => apt.status === 'reschedule_requested').length;
    const upcoming = appointments.filter(apt => {
      const aptDate = new Date(`${apt.preferred_date} ${apt.preferred_time}`);
      const now = new Date();
      return aptDate > now && (apt.status === 'confirmed' || apt.status === 'requested' || apt.status === 'reschedule_requested');
    }).length;
    
    return { total, requested, confirmed, canceled, completed, rescheduleRequested, upcoming };
  };

  // New function to get relative date display
  const getRelativeDateDisplay = (dateStr: string) => {
    try {
      // Handle ISO format or regular date string
      let date;
      if (dateStr.includes('T')) {
        date = new Date(dateStr);
      } else {
        // Try parsing with different formats if needed
        date = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isNaN(date.getTime())) {
          // Fallback to direct parsing
          date = new Date(dateStr);
        }
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date in getRelativeDateDisplay:', dateStr);
        return 'Invalid date';
      }

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Compare only the date part (without time)
      const dateString = date.toDateString();
      const todayString = today.toDateString();
      const tomorrowString = tomorrow.toDateString();

      if (dateString === todayString) {
        return 'Today';
      } else if (dateString === tomorrowString) {
        return 'Tomorrow';
      } else {
        return format(date, 'EEE, MMM d');
      }
    } catch (error) {
      console.error('Error getting relative date:', error, 'Date string:', dateStr);
      return 'Invalid date';
    }
  };

  // Helper function to convert ISO date (YYYY-MM-DD) to American format (MM/DD/YYYY) for display
  const isoToAmericanDate = (isoDate: string): string => {
    try {
      if (!isoDate) return '';
      const date = parseISO(isoDate);
      return format(date, 'MM/dd/yyyy');
    } catch (error) {
      console.error('Error converting ISO to American date:', error);
      return '';
    }
  };

  // Helper function to convert American format (MM/DD/YYYY) back to ISO format (YYYY-MM-DD) for storage
  const americanToIsoDate = (americanDate: string): string => {
    try {
      if (!americanDate) return '';
      const date = parse(americanDate, 'MM/dd/yyyy', new Date());
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error converting American to ISO date:', error);
      return '';
    }
  };

  // Update selectedDate when alternativeDate changes
  useEffect(() => {
    if (alternativeDate) {
      try {
        setSelectedDate(parseISO(alternativeDate));
      } catch (error) {
        console.error('Error parsing date:', error);
        setSelectedDate(null);
      }
    } else {
      setSelectedDate(null);
    }
  }, [alternativeDate]);

  // Handle date selection from the DatePicker
  const handleDateSelection = (date: Date | null) => {
    setSelectedDate(date);
    setDateError(''); // Clear previous errors
    
    if (!date) {
      setDateError('Date is required');
      setAlternativeDate('');
      return;
    }
    
    // Check if it's at least today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      setDateError('Date must be today or in the future');
      return;
    }
    
    // Convert to ISO format for the actual storage
    const isoDate = format(date, 'yyyy-MM-dd');
    setAlternativeDate(isoDate);
    
    // Format for display
    setDisplayDate(format(date, 'MM/dd/yyyy'));
  };

  // Function to handle specific date filter selection
  const handleFilterDateChange = (date: Date | null) => {
    if (date) {
      // Format date as ISO string (YYYY-MM-DD)
      const formattedDate = format(date, 'yyyy-MM-dd');
      setSpecificDateFilter(formattedDate);
      setFilterDate(date);
      setDateFilter('specific');
      setShowDatePicker(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl mobile-loading">
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <p className="text-lg text-gray-500">Loading appointments...</p>
        </div>
      </div>
    );
  }

  const counts = getAppointmentCounts();

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-300 mobile-container">
      {/* Custom Mobile Header - REMOVED */}
      
      {/* Header Section with Stats */}
      <div className="mb-8">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl -z-10"></div>
          <div className={`px-8 py-10 mobile-header ${isMobile ? 'py-6 px-4' : ''}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className={`text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2 mb-2 ${isMobile ? 'text-xl' : ''}`}>
                  <CalendarClock className={`text-blue-600 ${isMobile ? 'h-5 w-5' : 'h-8 w-8'}`} />
                  Bookings
                </h1>
                <p className="text-gray-500 max-w-2xl">
                  Manage your customer bookings, confirm appointments, and suggest alternative times.
                </p>
              </div>
              <div className="flex gap-3 mobile-header-actions">
                <Button
                  onClick={() => setDateFilter('today')}
                  variant="outline"
                  className="border-blue-200 bg-white hover:bg-blue-50"
                >
                  <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                  Today's Bookings
                </Button>
                <Button
                  onClick={() => fetchAppointments()}
                  variant="outline" 
                  className="border-blue-200 bg-white hover:bg-blue-50"
                >
                  <svg className="mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                    <path d="M16 21h5v-5"></path>
                  </svg>
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={`${isMobile ? 'mobile-stats-container' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4'} mb-8`}>
          <Card className={`border-0 shadow-sm transition-all hover:shadow-md ${isMobile ? 'mobile-stat-card' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>Total Bookings</CardDescription>
              <CardTitle className="text-2xl">{counts.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm transition-all hover:shadow-md ${isMobile ? 'mobile-stat-card' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming</CardDescription>
              <CardTitle className="text-2xl">{counts.upcoming}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"></div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm transition-all hover:shadow-md ${isMobile ? 'mobile-stat-card' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>Requested</CardDescription>
              <CardTitle className="text-2xl">{counts.requested}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"></div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm transition-all hover:shadow-md ${isMobile ? 'mobile-stat-card' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>Confirmed</CardDescription>
              <CardTitle className="text-2xl">{counts.confirmed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"></div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm transition-all hover:shadow-md ${isMobile ? 'mobile-stat-card' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>Reschedule</CardDescription>
              <CardTitle className="text-2xl">{counts.rescheduleRequested}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-purple-400 to-violet-600 rounded-full"></div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm transition-all hover:shadow-md ${isMobile ? 'mobile-stat-card' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl">{counts.completed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full"></div>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm transition-all hover:shadow-md ${isMobile ? 'mobile-stat-card' : ''}`}>
            <CardHeader className="pb-2">
              <CardDescription>Canceled</CardDescription>
              <CardTitle className="text-2xl">{counts.canceled}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"></div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and tabs */}
      <div className={`flex ${isMobile ? 'flex-col mobile-my-2' : 'flex-row'} gap-6 mb-6`}>
        <Tabs 
          defaultValue="all" 
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setStatusFilter(value);
          }}
          className={`w-full ${isMobile ? 'mobile-tabs' : 'md:w-auto'}`}
        >
          <TabsList className={`grid grid-cols-6 ${isMobile ? 'mobile-tab-list' : 'w-full md:w-auto'}`}>
            <TabsTrigger value="all" className={`text-sm px-4 ${isMobile ? 'mobile-tab' : ''}`}>All</TabsTrigger>
            <TabsTrigger value="requested" className={`text-sm px-4 ${isMobile ? 'mobile-tab' : ''}`}>Requested</TabsTrigger>
            <TabsTrigger value="confirmed" className={`text-sm px-4 ${isMobile ? 'mobile-tab' : ''}`}>Confirmed</TabsTrigger>
            <TabsTrigger value="reschedule_requested" className={`text-sm px-4 ${isMobile ? 'mobile-tab' : ''}`}>Reschedule</TabsTrigger>
            <TabsTrigger value="completed" className={`text-sm px-4 ${isMobile ? 'mobile-tab' : ''}`}>Completed</TabsTrigger>
            <TabsTrigger value="canceled" className={`text-sm px-4 ${isMobile ? 'mobile-tab' : ''}`}>Canceled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={`flex gap-4 ${isMobile ? 'mobile-filters' : 'ml-auto'}`}>
          <Select
            value={dateFilter}
            onValueChange={(value) => {
              setDateFilter(value);
              if (value === 'specific') {
                setShowDatePicker(true);
              } else {
                setShowDatePicker(false);
              }
            }}
          >
            <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[180px]'} border-gray-200 bg-white shadow-sm`}>
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Filter by date">
                {dateFilter === 'specific' && filterDate 
                  ? format(filterDate, 'MMM d, yyyy') 
                  : "Filter by date"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="date-all" value="all">All Dates</SelectItem>
              <SelectItem key="date-today" value="today">Today</SelectItem>
              <SelectItem key="date-tomorrow" value="tomorrow">Tomorrow</SelectItem>
              <SelectItem key="date-week" value="week">This Week</SelectItem>
              <SelectItem key="date-month" value="month">This Month</SelectItem>
              <SelectItem key="date-specific" value="specific">Specific Date</SelectItem>
            </SelectContent>
          </Select>
          
          {showDatePicker && (
            <div className="relative">
              <DatePicker
                selected={filterDate}
                onChange={handleFilterDateChange}
                dateFormat="MMM d, yyyy"
                placeholderText="Select date"
                className="w-full p-2 border rounded-md border-gray-300"
                wrapperClassName={`w-full ${isMobile ? 'w-full mobile-datepicker-wrapper' : 'w-[180px]'}`}
                popperPlacement={isMobile ? "bottom" : "bottom-end"}
                showPopperArrow={false}
                onClickOutside={() => {
                  if (!filterDate) {
                    setDateFilter('all');
                    setShowDatePicker(false);
                  }
                }}
                calendarClassName={isMobile ? "mobile-calendar" : ""}
                withPortal={isMobile}
                portalId="date-picker-portal"
              />
            </div>
          )}
          
          {dateFilter === 'specific' && filterDate && !showDatePicker && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => {
                setDateFilter('all');
                setSpecificDateFilter(null);
                setFilterDate(null);
              }}
            >
              <XCircle className="h-4 w-4" />
              <span className="sr-only">Clear date filter</span>
            </Button>
          )}
        </div>
      </div>

      {/* Appointments Grid */}
      <div className={`grid gap-6 ${isMobile ? 'mobile-appointments-grid' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {appointments.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-dashed border-gray-200 bg-gray-50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-800 mb-2">No bookings found</h3>
                <p className="text-gray-500 text-center">There are no bookings matching your current filters.</p>
                <Button variant="outline" className="mt-6" onClick={() => {
                  setStatusFilter('all');
                  setDateFilter('all');
                  setActiveTab('all');
                  setSpecificDateFilter(null);
                  setFilterDate(null);
                  setShowDatePicker(false);
                }}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          appointments.map((appointment, index) => (
            <Card 
              key={appointment._id ? `appointment-${appointment._id}` : `appointment-fallback-${index}`} 
              className={`border-0 shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden group ${isMobile ? 'mobile-appointment-card' : ''}`}
            >
              <div className={`h-1.5 w-full ${
                appointment.status === 'confirmed' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                appointment.status === 'canceled' ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                appointment.status === 'completed' ? 'bg-gradient-to-r from-blue-400 to-indigo-600' :
                appointment.status === 'reschedule_requested' ? 'bg-gradient-to-r from-purple-400 to-violet-500' :
                'bg-gradient-to-r from-amber-400 to-orange-500'
              }`}></div>
              
              <CardHeader className="bg-white border-b border-gray-100 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {appointment.service}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      {getRelativeDateDisplay(appointment.preferred_date)}, {appointment.preferred_time}
                    </CardDescription>
                  </div>
                  <Badge className={`
                    px-2.5 py-0.5 flex items-center gap-1.5 text-xs capitalize rounded-full
                    ${appointment.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-50' :
                      appointment.status === 'canceled' ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-50' :
                      appointment.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50' :
                      appointment.status === 'reschedule_requested' ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-50' :
                      'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50'}
                  `}>
                    {appointment.status === 'confirmed' ? <CheckCircle className="w-3 h-3" /> :
                      appointment.status === 'canceled' ? <XCircle className="w-3 h-3" /> :
                      appointment.status === 'completed' ? <CheckCheck className="w-3 h-3" /> :
                      appointment.status === 'reschedule_requested' ? <Clock3 className="w-3 h-3" /> :
                      <AlertCircle className="w-3 h-3" />
                    }
                    {appointment.status === 'reschedule_requested' ? 'Reschedule Requested' : appointment.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className={`bg-white pt-4 pb-2 ${isMobile ? 'mobile-px-3' : ''}`}>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center gap-2.5 text-sm">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900 font-medium">{appointment.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{appointment.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <CalendarRange className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">Created on {format(new Date(appointment.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    
                    {typeof appointment.notes === 'string' && appointment.notes.trim() && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="text-gray-700">
                          <span className="font-medium text-gray-900">Notes:</span>
                          <p className="mt-0.5 whitespace-pre-wrap">{appointment.notes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Original appointment time with visual indicator when reschedule is requested */}
                    {appointment.status === 'reschedule_requested' && (
                      <div className="mt-2 flex items-center gap-2.5 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 line-through">
                            Original: {format(new Date(appointment.preferred_date), 'MMM d')} at {appointment.preferred_time}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Change Requested</span>
                        </div>
                      </div>
                    )}
                    
                    {appointment.status === 'reschedule_requested' && appointment.suggestedTime && (
                      <>
                        <div className="my-3 border-t border-dashed border-gray-200"></div>
                        <div className="p-3 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="bg-purple-100 h-8 w-8 rounded-full flex items-center justify-center">
                              <Clock3 className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-purple-800">Suggested Alternative Time</div>
                              <div className="text-sm text-purple-700 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(parseISO(appointment.suggestedTime.date), 'EEEE, MMMM d, yyyy')}
                              </div>
                              <div className="text-sm text-purple-700 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {appointment.suggestedTime.time}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-purple-500 flex items-center gap-1 pl-10">
                            <CalendarClock className="h-3 w-3" />
                            Suggested {formatDistanceToNow(parseISO(appointment.suggestedTime.suggestedAt))} ago
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className={`bg-white pt-2 pb-4 flex ${isMobile ? 'flex-col mobile-card-footer' : 'flex-col'} gap-2`}>
                {appointment.status === 'requested' && (
                  <div className={`flex gap-2 w-full ${isMobile ? 'flex-col' : ''}`}>
                    <Button
                      onClick={() => updateAppointmentStatus(appointment._id, 'confirmed')}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      disabled={updatingAppointment === appointment._id}
                    >
                      {updatingAppointment === appointment._id ? (
                        <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Updating...</>
                      ) : (
                        <><CheckCircle className="mr-2 h-3.5 w-3.5" /> Confirm</>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleCancelClick(appointment._id)}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={updatingAppointment === appointment._id}
                    >
                      {updatingAppointment === appointment._id ? (
                        <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Updating...</>
                      ) : (
                        <><XCircle className="mr-2 h-3.5 w-3.5" /> Cancel</>
                      )}
                    </Button>
                  </div>
                )}
                {appointment.status === 'confirmed' && (
                  <Button
                    onClick={() => updateAppointmentStatus(appointment._id, 'completed')}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                    disabled={updatingAppointment === appointment._id}
                  >
                    {updatingAppointment === appointment._id ? (
                      <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Updating...</>
                    ) : (
                      <><CheckCheck className="mr-2 h-3.5 w-3.5" /> Mark as Completed</>
                    )}
                  </Button>
                )}
                {(appointment.status === 'requested') && (
                  <Button
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      // Set default values for the dialog
                      // Initialize with the appointment's preferred date if valid, or today's date
                      try {
                        const preferredDate = new Date(appointment.preferred_date);
                        if (!isNaN(preferredDate.getTime())) {
                          // Format as YYYY-MM-DD for the backend, but set the actual Date object for the DatePicker
                          setAlternativeDate(format(preferredDate, 'yyyy-MM-dd'));
                          setSelectedDate(preferredDate);
                        } else {
                          // Fallback to today's date
                          const today = new Date();
                          setAlternativeDate(format(today, 'yyyy-MM-dd'));
                          setSelectedDate(today);
                        }
                      } catch (error) {
                        console.error('Error setting default date:', error);
                        const today = new Date();
                        setAlternativeDate(format(today, 'yyyy-MM-dd'));
                        setSelectedDate(today);
                      }
                      // Initialize with the appointment's preferred time if available
                      setAlternativeTime(appointment.preferred_time || '');
                      setShowModifyDialog(true);
                    }}
                    variant="outline"
                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                  >
                    <Clock3 className="h-3.5 w-3.5" />
                    Suggest Alternative Time
                  </Button>
                )}
                {appointment.status === 'completed' && (
                  <div className="w-full mb-2 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <CheckCheck className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">Service Completed</h4>
                          <p className="text-xs text-blue-600">
                            Completed on {format(new Date(appointment.updatedAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="flex h-2 w-2 rounded-full bg-blue-400"></span>
                        <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                        <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                      </div>
                    </div>
                  </div>
                )}
                {appointment.chatRoomId && (
                  <Button
                    onClick={() => router.push(`/business/chat/${appointment.chatRoomId}`)}
                    variant="ghost"
                    className="w-full flex items-center justify-center gap-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    View Conversation
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Suggest Alternative Time Dialog */}
      <Dialog open={showModifyDialog} onOpenChange={setShowModifyDialog}>
        <DialogContent className={`sm:max-w-md ${isMobile ? 'mobile-dialog' : ''}`}>
          <DialogHeader>
            <DialogTitle>Suggest Alternative Time</DialogTitle>
            <DialogDescription>
              Suggest a different time for this appointment. The customer will be notified via chat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="alternative-date">Alternative Date</Label>
              <DatePicker
                id="alternative-date"
                selected={selectedDate}
                onChange={handleDateSelection}
                dateFormat="MM/dd/yyyy"
                placeholderText="Select a date"
                minDate={new Date()} // Prevent selecting dates before today
                className={`w-full p-2 border rounded-md ${dateError ? 'border-red-500' : 'border-gray-300'}`}
                wrapperClassName="w-full"
                popperPlacement="bottom-start"
                showPopperArrow={false}
                calendarClassName={isMobile ? "mobile-calendar" : ""}
                withPortal={isMobile}
                portalId="dialog-date-picker-portal"
              />
              {dateError ? (
                <p className="text-xs text-red-500">{dateError}</p>
              ) : (
                <p className="text-xs text-gray-500">Please select a date from the calendar</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternative-time">Alternative Time</Label>
              <Input
                id="alternative-time"
                type="time"
                value={alternativeTime}
                onChange={(e) => setAlternativeTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowModifyDialog(false);
                setSelectedAppointment(null);
                setAlternativeTime('');
                setAlternativeDate('');
                setDateError('');
                setDisplayDate('');
                setSelectedDate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAppointment && alternativeDate && alternativeTime) {
                  suggestAlternativeTime(selectedAppointment._id, alternativeDate, alternativeTime);
                }
              }}
              disabled={!alternativeDate || !alternativeTime || !!dateError}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Send Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Appointment Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className={`sm:max-w-md ${isMobile ? 'mobile-dialog' : ''}`}>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Cancel Appointment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              Canceling this appointment will notify the customer and remove it from your confirmed appointments.
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setAppointmentToCancel(null);
              }}
              className="flex-1"
            >
              No, Keep Appointment
            </Button>
            <Button
              onClick={confirmCancellation}
              variant="destructive"
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
            >
              Yes, Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 