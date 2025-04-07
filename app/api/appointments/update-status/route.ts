import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { ChatRoom } from '@/models/chat';
import { connectToDatabase } from '@/lib/mongodb';
import { sendRescheduleApprovalEmail, sendAppointmentCancellationEmail } from '@/lib/resend';
import { Business } from '@/models/Business';
import { SenderType } from '@/app/models/chat.model';
import User from '@/backend/src/models/user.model';

// Get user ID from JWT token in Authorization header
function getUserIdFromToken(token: string): string | null {
  try {
    // Extract user ID from token (simplified for now)
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.userId || payload.sub;
    }
    return null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('=======================================');
    console.log('Received request to update appointment status');
    
    // Verify authentication
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    console.log('User ID from token:', userId);

    // Parse request body
    const { appointmentId, status, preferred_date, preferred_time, rejectSuggestion, isRescheduleAcceptance, sendEmails } = await req.json();
    console.log('Request data:', { 
      appointmentId, 
      status, 
      preferred_date, 
      preferred_time,
      rejectSuggestion,
      isRescheduleAcceptance,
      sendEmails,
      userId 
    });

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    if (!status || !['requested', 'confirmed', 'canceled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();
    console.log('Connected to database');

    // Find the appointment
    const chatRoom = await ChatRoom.findOne({
      "appointments._id": new mongoose.Types.ObjectId(appointmentId),
      "appointments.user_id": new mongoose.Types.ObjectId(userId)
    });

    if (!chatRoom) {
      return NextResponse.json({ error: 'Appointment not found or does not belong to this user' }, { status: 404 });
    }

    // Find the appointment in the chat room
    const appointment = chatRoom.appointments.find((apt: any) => apt._id.toString() === appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found in chat room' }, { status: 404 });
    }

    console.log('Found appointment:', {
      id: appointment._id,
      status: appointment.status,
      suggestedTime: appointment.suggestedTime || 'Not set'
    });

    // Update fields based on the request
    const updateFields: any = {
      'appointments.$.status': status,
      'appointments.$.updatedAt': new Date()
    };

    // If accepting new time, update preferred_date and preferred_time
    if (status === 'confirmed' && preferred_date && preferred_time) {
      console.log('Accepting suggested time with new preferred date and time:', {
        preferred_date,
        preferred_time,
        original: {
          preferred_date: appointment.preferred_date,
          preferred_time: appointment.preferred_time
        },
        suggested: appointment.suggestedTime
      });
      
      // Log before and after values for clarity
      console.log('BEFORE UPDATE - Original appointment time:', {
        preferred_date: appointment.preferred_date,
        preferred_time: appointment.preferred_time
      });
      
      console.log('UPDATING TO - New appointment time:', {
        preferred_date,
        preferred_time
      });
      
      // Check if this is a rescheduled appointment being confirmed
      const isRescheduled = appointment.status === 'reschedule_requested';
      console.log('Is this a rescheduled appointment being confirmed?', isRescheduled);
      
      updateFields['appointments.$.preferred_date'] = preferred_date;
      updateFields['appointments.$.preferred_time'] = preferred_time;
      
      // Set wasRescheduled flag to true when confirming a reschedule request
      if (isRescheduled) {
        updateFields['appointments.$.wasRescheduled'] = true;
        console.log('Setting wasRescheduled flag to true');
      }
      
      // Remove suggestedTime if we're accepting it
      updateFields['appointments.$.suggestedTime'] = undefined;
      
      console.log('Update fields for preferred date/time:', {
        new_preferred_date: updateFields['appointments.$.preferred_date'],
        new_preferred_time: updateFields['appointments.$.preferred_time'],
        wasRescheduled: updateFields['appointments.$.wasRescheduled'],
        suggestedTime_removal: updateFields['appointments.$.suggestedTime'] === undefined ? 'Yes' : 'No'
      });
    }

    // If rejecting suggestion or canceling, remove suggestedTime
    if (rejectSuggestion || status === 'canceled') {
      updateFields['appointments.$.suggestedTime'] = undefined;
    }

    console.log('Update fields:', updateFields);
    
    // Log the MongoDB update operation in detail
    console.log('MongoDB update operation:', {
      filter: {
        '_id': chatRoom._id,
        'appointments._id': new mongoose.Types.ObjectId(appointmentId)
      },
      update: {
        $set: updateFields
      },
      options: { new: true }
    });

    let updatedChatRoom;
    
    // For appointments with reschedule_requested status, use aggregation pipeline to ensure reliable updates
    if ((appointment.status === 'reschedule_requested' && status === 'confirmed') || isRescheduleAcceptance) {
      console.log('Using aggregation pipeline for reschedule acceptance');
      console.log('Original appointment status:', appointment.status);
      console.log('Original appointment suggestedTime:', appointment.suggestedTime);
      
      // Make sure we have the required data for the update
      if (!preferred_date || !preferred_time) {
        console.error('Missing preferred_date or preferred_time for reschedule acceptance');
        return NextResponse.json({ 
          error: 'Preferred date and time are required when accepting a reschedule request' 
        }, { status: 400 });
      }
      
      // Define the aggregation pipeline update
      const updatePipeline = [
        {
          $set: {
            appointments: {
              $map: {
                input: '$appointments',
                as: 'appointment',
                in: {
                  $cond: [
                    { $eq: ['$$appointment._id', new mongoose.Types.ObjectId(appointmentId)] },
                    {
                      $mergeObjects: [
                        '$$appointment',
                        {
                          status: 'confirmed',
                          preferred_date: preferred_date,
                          preferred_time: preferred_time,
                          wasRescheduled: true,
                          updatedAt: new Date(),
                          suggestedTime: '$$REMOVE'
                        }
                      ]
                    },
                    '$$appointment'
                  ]
                }
              }
            }
          }
        }
      ];
      
      console.log('Aggregation pipeline:', JSON.stringify(updatePipeline, null, 2));
      
      // Use updateOne with aggregation pipeline for more reliable updates of nested arrays
      const updateResult = await ChatRoom.updateOne(
        {
          _id: chatRoom._id,
          'appointments._id': new mongoose.Types.ObjectId(appointmentId)
        },
        updatePipeline
      );
      
      console.log('Aggregation pipeline update result:', updateResult);
      
      if (updateResult.modifiedCount === 0) {
        return NextResponse.json({ error: 'Failed to update appointment with aggregation pipeline' }, { status: 500 });
      }
      
      // Fetch the updated document
      updatedChatRoom = await ChatRoom.findOne({
        _id: chatRoom._id
      });
      
      if (!updatedChatRoom) {
        console.error('Failed to retrieve updated chat room after aggregation update');
        return NextResponse.json({ error: 'Failed to retrieve updated appointment' }, { status: 500 });
      }
      
      console.log('Retrieved updated chat room after aggregation update');
    } else {
      // Use the traditional approach for other updates
      updatedChatRoom = await ChatRoom.findOneAndUpdate(
        {
          _id: chatRoom._id,
          'appointments._id': new mongoose.Types.ObjectId(appointmentId)
        },
        {
          $set: updateFields
        },
        { new: true }
      );
    }

    if (!updatedChatRoom) {
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }

    // Find the updated appointment
    const updatedAppointment = updatedChatRoom.appointments.find(
      (apt: any) => apt._id.toString() === appointmentId
    );

    if (!updatedAppointment) {
      console.error('Appointment not found after update, appointmentId:', appointmentId);
      console.log('Available appointment IDs:', updatedChatRoom.appointments.map((apt: any) => apt._id.toString()));
      return NextResponse.json({ error: 'Appointment not found after update' }, { status: 500 });
    }
    
    console.log('Found updated appointment:', {
      id: updatedAppointment._id.toString(),
      status: updatedAppointment.status,
      preferred_date: updatedAppointment.preferred_date, 
      preferred_time: updatedAppointment.preferred_time,
      wasRescheduled: updatedAppointment.wasRescheduled || false,
      hasSuggestedTime: !!updatedAppointment.suggestedTime
    });

    // Check if the preferred date and time were correctly updated
    if (status === 'confirmed' && preferred_date && preferred_time) {
      console.log('AFTER UPDATE - Verifying preferred date and time were updated:');
      console.log('Expected values:', {
        preferred_date,
        preferred_time,
        status: 'confirmed',
        suggestedTime: 'Should be removed',
        wasRescheduled: appointment.status === 'reschedule_requested' ? true : false
      });
      console.log('Actual values:', {
        preferred_date: updatedAppointment.preferred_date,
        preferred_time: updatedAppointment.preferred_time,
        status: updatedAppointment.status,
        suggestedTime: updatedAppointment.suggestedTime ? 'Still present' : 'Removed as expected',
        wasRescheduled: updatedAppointment.wasRescheduled ? 'Set to true' : 'Not set'
      });
      console.log('Values match?', {
        preferred_date_match: updatedAppointment.preferred_date === preferred_date,
        preferred_time_match: updatedAppointment.preferred_time === preferred_time,
        status_match: updatedAppointment.status === 'confirmed',
        suggestedTime_removed: updatedAppointment.suggestedTime === undefined,
        wasRescheduled_set: appointment.status === 'reschedule_requested' ? 
          (updatedAppointment.wasRescheduled === true) : true
      });
    }

    // Send notification email to business when a user approves a time change request
    if (status === 'confirmed' && (appointment.status === 'reschedule_requested' || isRescheduleAcceptance)) {
      try {
        console.log('Sending reschedule approval email to business');
        
        // Get the business details to find their email
        const business = await Business.findById(chatRoom.businessId);
        if (!business || !business.email) {
          console.log('Business not found or has no email:', chatRoom.businessId);
        } else {
          // Prepare data for the email
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const actionUrl = `${baseUrl}/business/dashboard/appointments`;
          
          // Send the email notification
          const notificationResult = await sendRescheduleApprovalEmail({
            businessEmail: business.email,
            appointmentDetails: {
              service: updatedAppointment.service,
              originalDate: appointment.preferred_date,
              originalTime: appointment.preferred_time,
              newDate: updatedAppointment.preferred_date,
              newTime: updatedAppointment.preferred_time
            },
            customerDetails: {
              name: updatedAppointment.customerName,
              phone: updatedAppointment.customerPhone
            },
            actionUrl
          });
          
          console.log('Reschedule approval email notification result:', notificationResult);
          
          // Add a chat message indicating acceptance of the time change request
          const acceptanceMessage = {
            _id: new mongoose.Types.ObjectId(),
            content: `${updatedAppointment.customerName} has accepted your request to reschedule the ${updatedAppointment.service} appointment to ${updatedAppointment.preferred_date} at ${updatedAppointment.preferred_time}.`,
            senderId: userId,
            senderType: SenderType.USER,
            chatRoomId: chatRoom._id.toString(),
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Add the message to the chat room
          await ChatRoom.findByIdAndUpdate(
            chatRoom._id,
            {
              $push: { messages: acceptanceMessage },
              $set: { lastActivity: new Date() }
            }
          );
          
          console.log('Added reschedule acceptance message to chat');
        }
      } catch (notificationError) {
        // Don't fail the whole request if notification fails
        console.error('Failed to send reschedule approval email or add chat message:', notificationError);
      }
    }

    // Send notification email to business when a user cancels an appointment
    if (status === 'canceled') {
      try {
        console.log('Sending cancellation notifications for user-canceled appointment');
        console.log('Send emails flag:', sendEmails);
        
        // Get the business details
        const business = await Business.findById(chatRoom.businessId);
        if (!business) {
          console.log('Business not found:', chatRoom.businessId);
        } else {
          console.log('Found business:', business.business_name, 'with email:', business.email);
          
          // Add a chat message to the chat room
          const cancellationMessage = {
            _id: new mongoose.Types.ObjectId(),
            content: `${updatedAppointment.customerName} has canceled the appointment for ${updatedAppointment.service} on ${updatedAppointment.preferred_date} at ${updatedAppointment.preferred_time}.`,
            senderId: userId,
            senderType: SenderType.USER,
            chatRoomId: chatRoom._id.toString(),
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Add the message to the chat room
          await ChatRoom.findByIdAndUpdate(
            chatRoom._id,
            {
              $push: { messages: cancellationMessage },
              $set: { lastActivity: new Date() }
            }
          );
          
          console.log('Added cancellation message to chat');
          
          // Send email to the business if they have an email
          if (business.email) {
            // Prepare the URL for the business to view their appointments
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const businessActionUrl = `${baseUrl}/business/dashboard/appointments`;
            
            // Send the cancellation email to the business
            const businessEmailResult = await sendAppointmentCancellationEmail({
              recipientEmail: business.email,
              recipientType: 'business',
              appointmentDetails: {
                service: updatedAppointment.service,
                date: updatedAppointment.preferred_date,
                time: updatedAppointment.preferred_time
              },
              canceledBy: 'user',
              cancelerName: updatedAppointment.customerName,
              otherPartyDetails: {
                name: business.business_name || 'Business',
                phone: business.phone?.toString()
              },
              actionUrl: businessActionUrl
            });
            
            console.log('Cancellation email sent to business:', businessEmailResult);
            
            // Get user email to send confirmation
            try {
              // Use the imported User model directly instead of from mongoose.models
              console.log('User model check:', {
                modelExists: !!User,
                modelType: typeof User,
                modelName: User?.modelName || 'undefined'
              });
              
              const user = await User.findById(userId);
              
              console.log('User lookup result:', user ? 'Found' : 'Not found', 
                'with ID:', userId, 
                'Email:', user?.email || 'No email found');
              
              if (user && user.email) {
                const userActionUrl = `${baseUrl}/profile/appointments`;
                
                // Send confirmation email to the user
                const userEmailResult = await sendAppointmentCancellationEmail({
                  recipientEmail: user.email,
                  recipientType: 'user',
                  appointmentDetails: {
                    service: updatedAppointment.service,
                    date: updatedAppointment.preferred_date,
                    time: updatedAppointment.preferred_time
                  },
                  canceledBy: 'user',
                  cancelerName: updatedAppointment.customerName,
                  otherPartyDetails: {
                    name: business.business_name || 'Business',
                    phone: business.phone?.toString()
                  },
                  actionUrl: userActionUrl
                });
                
                console.log('Cancellation confirmation email sent to user:', userEmailResult, 'Email address:', user.email);
              } else {
                console.error('Unable to send user email: user or user.email not found');
              }
            } catch (userError) {
              console.error('Error retrieving user for email notification:', userError);
            }
          }
        }
      } catch (notificationError) {
        // Don't fail the whole request if notification fails
        console.error('Failed to send cancellation notifications:', notificationError);
      }
    }

    console.log('Appointment updated successfully:', {
      id: updatedAppointment._id,
      status: updatedAppointment.status,
      preferred_date: updatedAppointment.preferred_date,
      preferred_time: updatedAppointment.preferred_time,
      suggestedTime: updatedAppointment.suggestedTime || 'Not set'
    });

    // Log the updated appointment details before returning
    console.log('Final updated appointment:', {
      id: updatedAppointment._id.toString(),
      status: updatedAppointment.status,
      preferred_date: updatedAppointment.preferred_date,
      preferred_time: updatedAppointment.preferred_time,
      suggestedTime: updatedAppointment.suggestedTime || 'Not set'
    });

    // Return the updated appointment
    return NextResponse.json({
      _id: updatedAppointment._id.toString(),
      status: updatedAppointment.status,
      preferred_date: updatedAppointment.preferred_date,
      preferred_time: updatedAppointment.preferred_time,
      customerName: updatedAppointment.customerName,
      customerPhone: updatedAppointment.customerPhone,
      suggestedTime: updatedAppointment.suggestedTime,
      wasRescheduled: updatedAppointment.wasRescheduled || false,
      createdAt: updatedAppointment.createdAt,
      updatedAt: updatedAppointment.updatedAt
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 