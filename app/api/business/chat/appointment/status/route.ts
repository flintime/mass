import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ChatRoom } from '@/models/chat';
import { Business } from '@/models/Business';
import { 
  sendRescheduleRequestEmail, 
  sendAppointmentConfirmationEmail,
  sendAppointmentCancellationEmail 
} from '@/lib/resend';
import dbConnect from '@/lib/db';
import { notifications } from '@/lib/notifications';
import { SenderType } from '@/app/models/chat.model';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface SuggestedTime {
  date: string;
  time: string;
  suggestedAt?: string;
}

interface Appointment {
  _id: mongoose.Types.ObjectId;
  service: string;
  preferred_date: string;
  preferred_time: string;
  customerName: string;
  customerPhone: string;
  status: 'requested' | 'confirmed' | 'canceled' | 'reschedule_requested' | 'completed';
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
    console.error('Error getting business from token:', error);
    return null;
  }
}

// Function to fetch business name by ID
async function getBusinessName(businessId: string): Promise<string> {
  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }
    
    const business = await Business.findById(businessId);
    return business?.business_name || 'Business';
  } catch (error) {
    console.error('Error fetching business name:', error);
    return 'Business';
  }
}

// Add a new function to send reschedule email notifications
async function sendRescheduleNotification(
  chatRoomId: string, 
  appointmentId: string, 
  businessId: string,
  suggestedTime: SuggestedTime,
  originalAppointment: any
): Promise<boolean> {
  try {
    // Add more debugging to check what's in originalAppointment
    console.log('Original appointment data for email:', JSON.stringify({
      service: originalAppointment.service,
      preferred_date: originalAppointment.preferred_date,
      preferred_time: originalAppointment.preferred_time
    }, null, 2));
    
    // Get the user's email from the MongoDB directly since we can't import the service
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom || !chatRoom.userId) {
      console.log('No user ID found in chat room for sending reschedule notification');
      return false;
    }
    
    // Try to find a user document with this ID and get their email
    const User = mongoose.models.User;
    if (!User) {
      console.log('User model not available');
      return false;
    }
    
    const user = await User.findById(chatRoom.userId);
    if (!user || !user.email) {
      console.log('No user email found for sending reschedule notification');
      return false;
    }

    // Get business details
    const business = await Business.findById(businessId);
    if (!business) {
      console.log('Business not found for sending reschedule notification');
      return false;
    }

    // Prepare the URL for the user to respond to the request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionUrl = `${baseUrl}/profile/appointments`;

    // Ensure we have valid data for all required fields
    const preferredTime = originalAppointment.preferred_time || 'Not specified';
    
    // Send the email notification
    const emailResult = await sendRescheduleRequestEmail({
      userEmail: user.email,
      appointmentDetails: {
        service: originalAppointment.service || 'Your appointment',
        originalDate: originalAppointment.preferred_date || new Date().toISOString().split('T')[0],
        originalTime: preferredTime,
        newDate: suggestedTime.date,
        newTime: suggestedTime.time
      },
      businessDetails: {
        name: business.business_name || 'Business',
        phone: business.phone?.toString()
      },
      actionUrl
    });

    console.log('Reschedule email notification result:', emailResult);
    return emailResult.success;
  } catch (error) {
    console.error('Error sending reschedule notification:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('=========================================');
    console.log('REQUEST RECEIVED AT:', new Date().toISOString());
    console.log('ENDPOINT: Appointment status update');
    
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('ERROR: No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = getBusinessFromToken(token);
    if (!businessId) {
      console.log('ERROR: Invalid token or could not extract businessId');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    console.log('Business ID extracted from token:', businessId);

    const { appointmentId, status, suggestedTime, retryForSuggestedTime } = await req.json();
    console.log('RAW REQUEST BODY:', JSON.stringify({ 
      appointmentId, 
      status, 
      suggestedTime,
      retryForSuggestedTime 
    }, null, 2));

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    if (!status || !['requested', 'confirmed', 'canceled', 'reschedule_requested', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // If status is 'reschedule_requested', suggestedTime should be provided
    if (status === 'reschedule_requested' && !suggestedTime && !retryForSuggestedTime) {
      return NextResponse.json({ error: 'suggestedTime is required when status is reschedule_requested' }, { status: 400 });
    }

    // Validate suggestedTime if provided
    if (suggestedTime) {
      if (!suggestedTime.date || !suggestedTime.time) {
        return NextResponse.json({ error: 'suggestedTime must include date and time' }, { status: 400 });
      }
      
      console.log('Valid suggestedTime received:', JSON.stringify(suggestedTime, null, 2));
    }

    await dbConnect();
    console.log('MongoDB connected');

    // Try multiple approaches to ensure the suggestedTime is saved
    if (status === 'reschedule_requested' && suggestedTime) {
      try {
        // First, try a direct update to ensure the suggestedTime is properly set
        console.log('Attempting direct update of suggestedTime');
        
        // Make sure we have a valid ObjectId
        const appointmentObjectId = new mongoose.Types.ObjectId(appointmentId);
        console.log('Valid appointment ObjectId created:', appointmentObjectId.toString());
        
        // Prepare the suggestedTime data
        const suggestedTimeObject = {
          date: suggestedTime.date,
          time: suggestedTime.time,
          suggestedAt: suggestedTime.suggestedAt || new Date().toISOString()
        };
        console.log('Prepared suggestedTimeObject:', JSON.stringify(suggestedTimeObject, null, 2));
        
        // First attempt: Try to update all matching appointments directly
        const directUpdateResult = await ChatRoom.updateMany(
          { 
            businessId: new mongoose.Types.ObjectId(businessId),
            "appointments._id": appointmentObjectId
          },
          { 
            $set: { 
              "appointments.$.status": status,
              "appointments.$.suggestedTime": suggestedTimeObject,
              "appointments.$.updatedAt": new Date()
            } 
          }
        );
        
        console.log('Direct suggestedTime update result:', directUpdateResult);
        
        // Continue with the regular flow... we've attempted a direct write first
      } catch (error) {
        console.error('Error during direct suggestedTime update:', error);
        // Continue with the normal flow as a fallback
      }
    }

    // Log the appointment ID format
    console.log('Appointment ID details:', {
      original: appointmentId,
      isValidObjectId: mongoose.isValidObjectId(appointmentId),
      asObjectId: new mongoose.Types.ObjectId(appointmentId).toString()
    });

    // First, check if the appointment exists in any chat room
    const allChatRooms = await ChatRoom.find({
      businessId: new mongoose.Types.ObjectId(businessId)
    });

    console.log(`Found ${allChatRooms.length} chat rooms for business`);

    // Log all appointments in the chat rooms
    for (const room of allChatRooms) {
      console.log(`Chat room ${room._id} has ${room.appointments?.length || 0} appointments`);
      if (room.appointments && room.appointments.length > 0) {
        console.log('Appointment IDs in this room:', room.appointments.map((apt: any) => ({
          id: apt._id.toString(),
          service: apt.service,
          status: apt.status
        })));
      }
    }

    // Search for the appointment in all chat rooms
    let foundAppointment = false;
    let foundChatRoomId = null;

    for (const room of allChatRooms) {
      if (!room.appointments) continue;
      
      for (const apt of room.appointments) {
        console.log(`Comparing: ${apt._id.toString()} with ${appointmentId}`);
        if (apt._id.toString() === appointmentId) {
          foundAppointment = true;
          foundChatRoomId = room._id;
          console.log(`Found appointment in chat room: ${room._id}`);
          console.log('Appointment details:', apt);
          break;
        }
      }
      
      if (foundAppointment) break;
    }

    if (!foundAppointment) {
      console.log('Appointment not found in any chat room');
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    console.log('Attempting to update appointment status using findOneAndUpdate');
    
    // Define update object based on status
    const updateFields: any = {
      'appointments.$.status': status,
      'appointments.$.updatedAt': new Date()
    };
    
    // Add suggestedTime if status is 'reschedule_requested'
    if (status === 'reschedule_requested' && suggestedTime) {
      console.log('Adding suggestedTime to updateFields:', suggestedTime);
      
      // Create a proper suggestedTime object with required fields and default values if needed
      const suggestedTimeObject = {
        date: suggestedTime.date,
        time: suggestedTime.time,
        suggestedAt: suggestedTime.suggestedAt || new Date().toISOString()
      };
      
      updateFields['appointments.$.suggestedTime'] = suggestedTimeObject;
      console.log('Update fields with suggestedTime:', updateFields);
    }
    
    // Update the appointment status with the found chat room ID
    console.log('Executing findOneAndUpdate with criteria:', { 
      chatRoomId: foundChatRoomId.toString(), 
      appointmentId 
    });
    
    let updatedChatRoom = await ChatRoom.findOneAndUpdate(
      {
        _id: foundChatRoomId,
        'appointments._id': new mongoose.Types.ObjectId(appointmentId)
      },
      {
        $set: updateFields
      },
      { new: true }
    );
    
    if (updatedChatRoom) {
      console.log('First update method succeeded');
      // Log the updated appointment to verify suggestedTime was saved
      const updatedAppointment = updatedChatRoom.appointments.find(
        (apt: any) => apt._id.toString() === appointmentId
      );
      console.log('Updated appointment:', {
        status: updatedAppointment?.status,
        suggestedTime: updatedAppointment?.suggestedTime || 'Not set'
      });
    } else {
      console.log('First update method failed, trying alternative approach');
      
      // Get the chat room
      const chatRoom = await ChatRoom.findById(foundChatRoomId);
      
      if (!chatRoom) {
        return NextResponse.json(
          { error: 'Chat room not found' },
          { status: 404 }
        );
      }
      
      // Find and update the appointment directly in the array
      const appointmentIndex = chatRoom.appointments.findIndex(
        (apt: any) => apt._id.toString() === appointmentId
      );
      
      if (appointmentIndex === -1) {
        return NextResponse.json(
          { error: 'Appointment not found in chat room' },
          { status: 404 }
        );
      }
      
      console.log('Found appointment at index:', appointmentIndex);
      console.log('Original appointment before update:', {
        status: chatRoom.appointments[appointmentIndex].status,
        suggestedTime: chatRoom.appointments[appointmentIndex].suggestedTime || 'Not set'
      });
      
      // Update the appointment
      chatRoom.appointments[appointmentIndex].status = status;
      chatRoom.appointments[appointmentIndex].updatedAt = new Date();
      
      // Add suggestedTime if status is 'reschedule_requested'
      if (status === 'reschedule_requested' && suggestedTime) {
        console.log('Adding suggestedTime in alternative approach:', suggestedTime);
        
        // Create a proper suggestedTime object with required fields and default values if needed
        const suggestedTimeObject = {
          date: suggestedTime.date,
          time: suggestedTime.time,
          suggestedAt: suggestedTime.suggestedAt || new Date().toISOString()
        };
        
        chatRoom.appointments[appointmentIndex].suggestedTime = suggestedTimeObject;
        // Ensure the suggestedTime is directly set (not as a reference) to avoid potential issues
        console.log('Set suggestedTime object in appointment:', suggestedTimeObject);
      }
      
      // Verify the updates before saving
      console.log('Appointment after update (before save):', {
        status: chatRoom.appointments[appointmentIndex].status,
        suggestedTime: chatRoom.appointments[appointmentIndex].suggestedTime || 'Not set'
      });
      
      // Save the chat room
      try {
        await chatRoom.save();
        console.log('Chat room saved successfully with alternative approach');
      } catch (saveError) {
        console.error('Error saving chat room:', saveError);
        return NextResponse.json(
          { error: 'Failed to save appointment update' },
          { status: 500 }
        );
      }
      
      updatedChatRoom = chatRoom;
      console.log('Updated appointment using alternative approach');
    }

    // Find the updated appointment
    const updatedAppointment = updatedChatRoom.appointments.find(
      (apt: any) => apt._id.toString() === appointmentId
    );

    console.log('Appointment updated successfully:', updatedAppointment);

    // Create a response object that explicitly includes all fields including suggestedTime
    const responseData = {
      _id: updatedAppointment?._id.toString(),
      service: updatedAppointment?.service,
      preferred_date: updatedAppointment?.preferred_date,
      preferred_time: updatedAppointment?.preferred_time,
      customerName: updatedAppointment?.customerName,
      customerPhone: updatedAppointment?.customerPhone,
      status: updatedAppointment?.status,
      createdAt: updatedAppointment?.createdAt,
      updatedAt: updatedAppointment?.updatedAt,
      user_id: updatedAppointment?.user_id,
      business_id: updatedAppointment?.business_id,
      suggestedTime: updatedAppointment?.suggestedTime ? {
        date: updatedAppointment.suggestedTime.date,
        time: updatedAppointment.suggestedTime.time,
        suggestedAt: updatedAppointment.suggestedTime.suggestedAt
      } : (status === 'reschedule_requested' && suggestedTime ? {
        date: suggestedTime.date,
        time: suggestedTime.time,
        suggestedAt: suggestedTime.suggestedAt || new Date().toISOString()
      } : undefined)
    };

    // Check if suggestedTime exists and log it
    if (updatedAppointment?.suggestedTime) {
      console.log('SuggestedTime in updated appointment:', JSON.stringify(updatedAppointment.suggestedTime, null, 2));
    } else {
      console.log('No suggestedTime found in updated appointment');
      
      // If we still don't have suggestedTime saved after all our attempts, do a final verification check
      if (status === 'reschedule_requested' && suggestedTime) {
        console.log('CRITICAL: Final verification - suggestedTime is missing after all attempts, doing one last direct update');
        
        try {
          // Create a clean suggestedTime object
          const finalSuggestedTimeObject = {
            date: suggestedTime.date,
            time: suggestedTime.time,
            suggestedAt: suggestedTime.suggestedAt || new Date().toISOString()
          };
          
          // Do one final direct update to the database
          if (mongoose.connection.db) {
            await mongoose.connection.db.collection('chatrooms').updateOne(
              { 
                _id: new mongoose.Types.ObjectId(foundChatRoomId),
                "appointments._id": new mongoose.Types.ObjectId(appointmentId)
              },
              { 
                $set: { 
                  "appointments.$.suggestedTime": finalSuggestedTimeObject
                } 
              }
            );
            
            console.log('CRITICAL: Final direct database update completed');
          } else {
            console.log('CRITICAL: mongoose.connection.db is undefined, cannot perform final update');
          }
          
          // Include the suggestedTime in the response data even if it didn't make it to the database
          if (!responseData.suggestedTime) {
            responseData.suggestedTime = finalSuggestedTimeObject;
            console.log('CRITICAL: Added suggestedTime to response data as last resort');
          }
        } catch (finalError) {
          console.error('CRITICAL: Even final direct update failed:', finalError);
        }
      }
    }

    // If this is a retry specifically for suggestedTime
    if (retryForSuggestedTime && suggestedTime) {
      console.log('This is a retry specifically for suggestedTime');
      
      // Do a direct update to ensure suggestedTime is properly set
      try {
        const directUpdateResult = await ChatRoom.updateOne(
          { 
            _id: foundChatRoomId,
            "appointments._id": new mongoose.Types.ObjectId(appointmentId)
          },
          { 
            $set: { 
              "appointments.$.suggestedTime": {
                date: suggestedTime.date,
                time: suggestedTime.time,
                suggestedAt: suggestedTime.suggestedAt || new Date().toISOString()
              }
            } 
          }
        );
        
        console.log('Direct suggestedTime update result:', directUpdateResult);
        
        // Fetch the updated appointment
        const updatedRoom = await ChatRoom.findById(foundChatRoomId);
        const directUpdatedAppointment = updatedRoom.appointments.find(
          (apt: any) => apt._id.toString() === appointmentId
        );
        
        console.log('Appointment after direct update:', {
          status: directUpdatedAppointment?.status,
          suggestedTime: directUpdatedAppointment?.suggestedTime || 'Still not set'
        });
        
        if (directUpdatedAppointment) {
          return NextResponse.json({
            ...directUpdatedAppointment.toObject(),
            _id: directUpdatedAppointment._id.toString(),
            suggestedTime: directUpdatedAppointment.suggestedTime
          });
        }
      } catch (error) {
        console.error('Error during direct suggestedTime update:', error);
      }
    }

    console.log('Returning response data with explicit suggestedTime field:', JSON.stringify(responseData, null, 2));

    // Send confirmation message in the chat if status is 'confirmed'
    if (status === 'confirmed') {
      try {
        // Fetch the business name
        const businessName = await getBusinessName(businessId);

        // Add a chat message to the chat room
        const confirmationMessage = {
          _id: new mongoose.Types.ObjectId(),
          content: `Your appointment with ${businessName} for ${updatedAppointment.service} on ${updatedAppointment.preferred_date} at ${updatedAppointment.preferred_time} has been confirmed.`,
          senderId: businessId.toString(),
          senderType: SenderType.BUSINESS,
          chatRoomId: foundChatRoomId.toString(),
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add the message to the chat room
        await ChatRoom.findByIdAndUpdate(
          foundChatRoomId,
          {
            $push: { messages: confirmationMessage },
            $set: { lastActivity: new Date() }
          }
        );

        console.log('Confirmation message sent in chat');

        // Send email notification to user
        try {
          // Get the user's email from MongoDB directly
          const chatRoom = await ChatRoom.findById(foundChatRoomId);
          if (!chatRoom || !chatRoom.userId) {
            console.log('No user ID found in chat room for sending confirmation notification');
          } else {
            // Try to find the user document with this ID and get their email
            const User = mongoose.models.User;
            if (!User) {
              console.log('User model not available');
            } else {
              const user = await User.findById(chatRoom.userId);
              if (!user || !user.email) {
                console.log('No user email found for sending confirmation notification');
              } else {
                // Get business details
                const business = await Business.findById(businessId);
                if (!business) {
                  console.log('Business not found for sending confirmation notification');
                } else {
                  // Prepare the URL for the user to view the appointment
                  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                  const actionUrl = `${baseUrl}/profile/appointments`;

                  // Send the email notification
                  const emailResult = await sendAppointmentConfirmationEmail({
                    userEmail: user.email,
                    appointmentDetails: {
                      service: updatedAppointment.service,
                      date: updatedAppointment.preferred_date,
                      time: updatedAppointment.preferred_time,
                      notes: updatedAppointment.notes
                    },
                    businessDetails: {
                      name: business.business_name || 'Business',
                      address: business.address ? `${business.address}, ${business.city}, ${business.state} ${business.zip_code}` : undefined,
                      phone: business.phone?.toString()
                    },
                    actionUrl
                  });

                  console.log('Appointment confirmation email notification result:', emailResult);
                }
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending appointment confirmation email:', emailError);
          // Continue execution even if email notification fails
        }

        // Also send SMS notification if possible
        if (updatedAppointment.customerPhone) {
          // Format the appointment for notification
          const bookingForNotification = {
            customer_name: updatedAppointment.customerName || 'Customer',
            customer_phone: updatedAppointment.customerPhone,
            customer_email: '', // Email is not available in the current Appointment interface
            service_name: updatedAppointment.service,
            booking_date: new Date(`${updatedAppointment.preferred_date}T${updatedAppointment.preferred_time}`),
            service_duration: '60', // Duration not available in current model
            service_price: 'N/A',   // Price not available in current model
            business_name: businessName // Add business name to the notification
          };
          
          await notifications.sendBookingConfirmation(bookingForNotification);
          console.log('SMS confirmation notification sent to customer');
        }
      } catch (notificationError) {
        // Don't fail the whole request if notification fails
        console.error('Failed to send confirmation message:', notificationError);
      }
    }
    
    // Send cancellation message in the chat if status is 'canceled'
    if (status === 'canceled') {
      try {
        // Fetch the business name
        const businessName = await getBusinessName(businessId);
        const business = await Business.findById(businessId);

        // Add a chat message to the chat room
        const cancellationMessage = {
          _id: new mongoose.Types.ObjectId(),
          content: `${businessName} has canceled your appointment for ${updatedAppointment.service} on ${updatedAppointment.preferred_date} at ${updatedAppointment.preferred_time}.`,
          senderId: businessId.toString(),
          senderType: SenderType.BUSINESS,
          chatRoomId: foundChatRoomId.toString(),
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add the message to the chat room
        await ChatRoom.findByIdAndUpdate(
          foundChatRoomId,
          {
            $push: { messages: cancellationMessage },
            $set: { lastActivity: new Date() }
          }
        );

        console.log('Cancellation message sent in chat');

        // Send email notification to user
        try {
          // Get the user's email from MongoDB directly
          const chatRoom = await ChatRoom.findById(foundChatRoomId);
          if (!chatRoom || !chatRoom.userId) {
            console.log('No user ID found in chat room for sending cancellation notification');
          } else {
            // Try to find the user document with this ID and get their email
            const User = mongoose.models.User;
            if (!User) {
              console.log('User model not available');
            } else {
              const user = await User.findById(chatRoom.userId);
              if (!user || !user.email) {
                console.log('No user email found for sending cancellation notification');
              } else {
                // Prepare the URL for the user to view their appointments
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const actionUrl = `${baseUrl}/profile/appointments`;
                
                // Get business details
                if (!business) {
                  console.log('Business not found for sending cancellation notification');
                } else {
                  // Send the cancellation email to the user
                  const emailResult = await sendAppointmentCancellationEmail({
                    recipientEmail: user.email,
                    recipientType: 'user',
                    appointmentDetails: {
                      service: updatedAppointment.service,
                      date: updatedAppointment.preferred_date,
                      time: updatedAppointment.preferred_time
                    },
                    canceledBy: 'business',
                    cancelerName: business.business_name || 'Business',
                    otherPartyDetails: {
                      name: business.business_name || 'Business',
                      phone: business.phone?.toString()
                    },
                    actionUrl
                  });
                  
                  console.log('Cancellation email sent to user:', emailResult);
                  
                  // Also send a confirmation email to the business
                  if (business.email) {
                    const businessActionUrl = `${baseUrl}/business/dashboard/appointments`;
                    
                    const businessEmailResult = await sendAppointmentCancellationEmail({
                      recipientEmail: business.email,
                      recipientType: 'business',
                      appointmentDetails: {
                        service: updatedAppointment.service,
                        date: updatedAppointment.preferred_date,
                        time: updatedAppointment.preferred_time
                      },
                      canceledBy: 'business',
                      cancelerName: business.business_name || 'Business',
                      otherPartyDetails: {
                        name: updatedAppointment.customerName,
                        phone: updatedAppointment.customerPhone
                      },
                      actionUrl: businessActionUrl
                    });
                    
                    console.log('Cancellation confirmation email sent to business:', businessEmailResult);
                  }
                }
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending cancellation emails:', emailError);
          // Continue execution even if email notification fails
        }
      } catch (notificationError) {
        // Don't fail the whole request if notification fails
        console.error('Failed to send cancellation message:', notificationError);
      }
    }
    
    // Send completion message in the chat if status is 'completed'
    if (status === 'completed') {
      try {
        // Fetch the business name
        const businessName = await getBusinessName(businessId);

        // Add a chat message to the chat room
        const completionMessage = {
          _id: new mongoose.Types.ObjectId(),
          content: `Your appointment with ${businessName} for ${updatedAppointment.service} on ${updatedAppointment.preferred_date} at ${updatedAppointment.preferred_time} has been marked as completed. Thank you for your business!`,
          senderId: businessId.toString(),
          senderType: SenderType.BUSINESS,
          chatRoomId: foundChatRoomId.toString(),
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add the message to the chat room
        await ChatRoom.findByIdAndUpdate(
          foundChatRoomId,
          {
            $push: { messages: completionMessage },
            $set: { lastActivity: new Date() }
          }
        );

        console.log('Completion message sent in chat');
      } catch (notificationError) {
        // Don't fail the whole request if notification fails
        console.error('Failed to send completion message:', notificationError);
      }
    }

    // Send notification email for reschedule requests
    if (status === 'reschedule_requested' && suggestedTime && foundAppointment) {
      try {
        const notificationSent = await sendRescheduleNotification(
          foundChatRoomId.toString(),
          appointmentId,
          businessId,
          suggestedTime,
          foundAppointment
        );
        console.log('Reschedule notification email sent:', notificationSent);
      } catch (notificationError) {
        console.error('Error sending reschedule notification email:', notificationError);
        // Continue execution even if notification fails
      }
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 