import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { ChatRoom } from '@/models/chat';
import jwt from 'jsonwebtoken';
import { SenderType } from '@/app/models/chat.model';
import { Business } from '@/models/Business';
import { 
  sendAppointmentConfirmationEmail,
  sendAppointmentCancellationEmail
} from '@/lib/resend';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface Appointment {
  _id: mongoose.Types.ObjectId;
  service: string;
  preferred_date: string;
  preferred_time: string;
  customerName: string;
  customerPhone: string;
  status: 'requested' | 'confirmed' | 'canceled' | 'reschedule_requested';
  suggestedTime?: {
    date: string;
    time: string;
    suggestedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to get business ID from token
function getBusinessFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { businessId: string };
    return decoded.businessId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = getBusinessFromToken(token);
    if (!businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const appointmentId = params.id;
    const { status } = await req.json();

    if (!status || !['requested', 'confirmed', 'canceled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await dbConnect();

    // Find the chat room containing this appointment
    const chatRoom = await ChatRoom.findOne({
      'appointments._id': new mongoose.Types.ObjectId(appointmentId),
      businessId: new mongoose.Types.ObjectId(businessId)
    });

    if (!chatRoom) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Update the appointment status
    const updatedChatRoom = await ChatRoom.findOneAndUpdate(
      {
        'appointments._id': new mongoose.Types.ObjectId(appointmentId),
        businessId: new mongoose.Types.ObjectId(businessId)
      },
      {
        $set: {
          'appointments.$.status': status,
          'appointments.$.updatedAt': new Date()
        }
      },
      { new: true }
    );

    if (!updatedChatRoom) {
      return NextResponse.json(
        { error: 'Failed to update appointment' },
        { status: 500 }
      );
    }

    // Find the updated appointment
    const updatedAppointment = updatedChatRoom.appointments.find(
      (apt: Appointment) => apt._id.toString() === appointmentId
    );

    // Add confirmation message in chat and send email notification if status is confirmed
    if (status === 'confirmed') {
      try {
        // Get business details
        const business = await Business.findById(businessId);
        const businessName = business?.business_name || 'Business';

        // Add confirmation message to chat
        const confirmationMessage = {
          _id: new mongoose.Types.ObjectId(),
          content: `Your appointment with ${businessName} for ${updatedAppointment.service} on ${updatedAppointment.preferred_date} at ${updatedAppointment.preferred_time} has been confirmed.`,
          senderId: businessId.toString(),
          senderType: SenderType.BUSINESS,
          chatRoomId: updatedChatRoom._id.toString(),
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add the message to the chat room
        await ChatRoom.findByIdAndUpdate(
          updatedChatRoom._id,
          {
            $push: { messages: confirmationMessage },
            $set: { lastActivity: new Date() }
          }
        );

        // Send email notification to user
        try {
          // Try to find the user document with this ID and get their email
          if (updatedChatRoom.userId) {
            const User = mongoose.models.User;
            if (User) {
              const user = await User.findById(updatedChatRoom.userId);
              if (user && user.email) {
                // Prepare the URL for the user to view the appointment
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const actionUrl = `${baseUrl}/profile/appointments`;

                // Send the email notification
                await sendAppointmentConfirmationEmail({
                  userEmail: user.email,
                  appointmentDetails: {
                    service: updatedAppointment.service,
                    date: updatedAppointment.preferred_date,
                    time: updatedAppointment.preferred_time,
                    notes: updatedAppointment.notes
                  },
                  businessDetails: {
                    name: businessName,
                    address: business?.address ? `${business.address}, ${business.city}, ${business.state} ${business.zip_code}` : undefined,
                    phone: business?.phone?.toString()
                  },
                  actionUrl
                });

                console.log('Appointment confirmation email sent to user');
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending appointment confirmation email:', emailError);
          // Continue execution even if email notification fails
        }
      } catch (notificationError) {
        console.error('Error sending confirmation notifications:', notificationError);
        // We don't want to fail the request if notifications fail
      }
    }

    // Add cancellation message in chat and send email notification if status is canceled
    if (status === 'canceled') {
      try {
        // Get business details
        const business = await Business.findById(businessId);
        const businessName = business?.business_name || 'Business';

        // Add cancellation message to chat
        const cancellationMessage = {
          _id: new mongoose.Types.ObjectId(),
          content: `${businessName} has canceled your appointment for ${updatedAppointment.service} on ${updatedAppointment.preferred_date} at ${updatedAppointment.preferred_time}.`,
          senderId: businessId.toString(),
          senderType: SenderType.BUSINESS,
          chatRoomId: updatedChatRoom._id.toString(),
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add the message to the chat room
        await ChatRoom.findByIdAndUpdate(
          updatedChatRoom._id,
          {
            $push: { messages: cancellationMessage },
            $set: { lastActivity: new Date() }
          }
        );

        console.log('Cancellation message sent in chat');

        // Send email notification to user
        try {
          // Try to find the user document with this ID and get their email
          if (updatedChatRoom.userId) {
            const User = mongoose.models.User;
            if (User) {
              const user = await User.findById(updatedChatRoom.userId);
              if (user && user.email) {
                // Prepare the URL for the user to view their appointments
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const userActionUrl = `${baseUrl}/profile/appointments`;
                
                // Send the cancellation email to the user
                await sendAppointmentCancellationEmail({
                  recipientEmail: user.email,
                  recipientType: 'user',
                  appointmentDetails: {
                    service: updatedAppointment.service,
                    date: updatedAppointment.preferred_date,
                    time: updatedAppointment.preferred_time
                  },
                  canceledBy: 'business',
                  cancelerName: businessName,
                  otherPartyDetails: {
                    name: businessName,
                    phone: business?.phone?.toString()
                  },
                  actionUrl: userActionUrl
                });
                
                console.log('Cancellation email sent to user');
                
                // Also send a confirmation email to the business
                if (business?.email) {
                  const businessActionUrl = `${baseUrl}/business/dashboard/appointments`;
                  
                  await sendAppointmentCancellationEmail({
                    recipientEmail: business.email,
                    recipientType: 'business',
                    appointmentDetails: {
                      service: updatedAppointment.service,
                      date: updatedAppointment.preferred_date,
                      time: updatedAppointment.preferred_time
                    },
                    canceledBy: 'business',
                    cancelerName: businessName,
                    otherPartyDetails: {
                      name: updatedAppointment.customerName,
                      phone: updatedAppointment.customerPhone
                    },
                    actionUrl: businessActionUrl
                  });
                  
                  console.log('Cancellation confirmation email sent to business');
                }
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending cancellation emails:', emailError);
          // Continue execution even if email notification fails
        }
      } catch (notificationError) {
        console.error('Error sending cancellation notifications:', notificationError);
        // We don't want to fail the request if notifications fail
      }
    }

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 