'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  User
} from 'lucide-react';

interface Booking {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  time: string;
  address: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
}

export default function BusinessBookings() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      // TODO: Replace with actual API call
      // Mock data for demonstration
      setBookings([
        {
          id: 1,
          customerName: "John Doe",
          customerEmail: "john@example.com",
          customerPhone: "123-456-7890",
          serviceName: "House Cleaning",
          date: "2024-01-20",
          time: "14:00",
          address: "123 Main St, City, State",
          status: "pending",
          price: 120
        },
        {
          id: 2,
          customerName: "Jane Smith",
          customerEmail: "jane@example.com",
          customerPhone: "098-765-4321",
          serviceName: "Window Cleaning",
          date: "2024-01-20",
          time: "16:30",
          address: "456 Oak Ave, City, State",
          status: "confirmed",
          price: 80
        },
        {
          id: 3,
          customerName: "Mike Johnson",
          customerEmail: "mike@example.com",
          customerPhone: "555-555-5555",
          serviceName: "Deep Cleaning",
          date: "2024-01-21",
          time: "10:00",
          address: "789 Pine St, City, State",
          status: "completed",
          price: 200
        }
      ]);
      setIsLoading(false);
    } catch (error) {
      setError('Failed to load bookings');
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: number, newStatus: Booking['status']) => {
    try {
      // TODO: Replace with actual API call
      setBookings(bookings.map(booking =>
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      ));
    } catch (error) {
      setError('Failed to update booking status');
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'confirmed':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-5 w-5" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(booking => booking.status === statusFilter);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bookings</h1>
            <p className="text-gray-500">Manage your service bookings</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="space-y-4 md:space-y-2">
                  <div className="flex items-start space-x-4">
                    <User className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <h3 className="font-medium">{booking.customerName}</h3>
                      <p className="text-sm text-gray-500">{booking.serviceName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {booking.date}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {booking.time}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {booking.address}
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                  <div className={`flex items-center ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    <span className="ml-2 capitalize">{booking.status}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-500">
                      <User className="h-4 w-4 mr-2" />
                      {selectedBooking.customerName}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Mail className="h-4 w-4 mr-2" />
                      {selectedBooking.customerEmail}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Phone className="h-4 w-4 mr-2" />
                      {selectedBooking.customerPhone}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Service Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Service:</span> {selectedBooking.serviceName}</p>
                    <p><span className="text-gray-500">Price:</span> ${selectedBooking.price}</p>
                    <p><span className="text-gray-500">Date:</span> {selectedBooking.date}</p>
                    <p><span className="text-gray-500">Time:</span> {selectedBooking.time}</p>
                    <p><span className="text-gray-500">Address:</span> {selectedBooking.address}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Status</h3>
                  <Select
                    value={selectedBooking.status}
                    onValueChange={(value: Booking['status']) => handleUpdateStatus(selectedBooking.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 