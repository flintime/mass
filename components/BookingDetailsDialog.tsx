import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { Clock, DollarSign, Mail, Phone, Loader2 } from 'lucide-react';
import { notifications } from '@/lib/notifications';

interface Booking {
  id: number;
  service_name: string;
  service_price: number;
  service_duration: number;
  booking_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string;
}

interface BookingDetailsDialogProps {
  booking: Booking;
  trigger?: React.ReactNode;
  onBookingCanceled?: () => void;
}

export function BookingDetailsDialog({
  booking,
  trigger,
  onBookingCanceled
}: BookingDetailsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const handleCancelBooking = async () => {
    setIsCanceling(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel booking');
      }

      // Send cancellation notification
      await notifications.sendBookingCancellation(booking);

      toast({
        title: 'Success',
        description: 'The booking has been canceled.',
      });

      setIsOpen(false);
      onBookingCanceled?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const handleSendReminder = async () => {
    setIsSendingReminder(true);

    try {
      await notifications.sendBookingReminder(booking);

      toast({
        title: 'Success',
        description: 'Reminder sent successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reminder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const bookingDate = new Date(booking.booking_date);
  const date = bookingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const time = bookingDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">View Details</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>
            Appointment with {booking.customer_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-medium">Service Information</h4>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="font-medium">Service:</span> {booking.service_name}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>${booking.service_price}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{booking.service_duration} minutes</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Date & Time</h4>
            <div className="grid gap-1 text-sm">
              <div>{date}</div>
              <div>{time}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Customer Information</h4>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> {booking.customer_name}
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <a
                  href={`mailto:${booking.customer_email}`}
                  className="text-primary hover:underline"
                >
                  {booking.customer_email}
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <a
                  href={`tel:${booking.customer_phone}`}
                  className="text-primary hover:underline"
                >
                  {booking.customer_phone}
                </a>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="space-y-2">
              <h4 className="font-medium">Additional Notes</h4>
              <p className="text-sm text-muted-foreground">{booking.notes}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isCanceling}>
                  {isCanceling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    'Cancel Booking'
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this booking? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, keep it</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelBooking}>
                    Yes, cancel it
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button 
              onClick={handleSendReminder}
              disabled={isSendingReminder}
            >
              {isSendingReminder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reminder'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 