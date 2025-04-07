import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Calendar, User } from "lucide-react";

export default function RealTimeUpdates() {
  // Mock data - replace with real-time data later
  const recentBookings = [
    {
      id: 1,
      customerName: "Sarah Johnson",
      service: "Deep Cleaning",
      time: "2:00 PM",
      status: "Confirmed",
      date: "Today"
    },
    {
      id: 2,
      customerName: "Mike Chen",
      service: "Regular Cleaning",
      time: "3:30 PM",
      status: "Pending",
      date: "Today"
    },
    {
      id: 3,
      customerName: "Emma Davis",
      service: "Office Cleaning",
      time: "10:00 AM",
      status: "Completed",
      date: "Today"
    },
    {
      id: 4,
      customerName: "John Smith",
      service: "Deep Cleaning",
      time: "1:00 PM",
      status: "Cancelled",
      date: "Yesterday"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
        <CardDescription>Real-time updates of your latest bookings</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{booking.customerName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{booking.service}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.date}</span>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.time}</span>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 