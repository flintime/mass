import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import mongoose, { Document, Model } from 'mongoose';
import dbConnect from '@/lib/db';
import { ChatRoom } from '@/models/chat';
import UserModel from '../../../models/user';
import jwt from 'jsonwebtoken';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { retrieveRelevantChunks, formatChunksForContext, Document as RagDocument } from '@/app/lib/vector-store';
import { SenderType } from '@/models/chat';
import { connectMongo } from '@/lib/db';
import { socketService } from '@/lib/socket';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get user ID from token
function getUserFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// Helper function to get basic business information
async function getBusinessBasicInfo(businessId: string) {
  try {
    await dbConnect();
    
    // Query the business collection directly
    const connection = mongoose.connection;
    if (!connection.db) {
      console.error('Database connection not established');
      return null;
    }
    
    const business = await connection.db
      .collection('businesses')
      .findOne({ _id: new mongoose.Types.ObjectId(businessId) });
    
    if (!business) {
      console.error(`Business with ID ${businessId} not found`);
      return null;
    }
    
    return business;
  } catch (error) {
    console.error('Error getting business basic info:', error);
    return null;
  }
}

// Define interfaces for User
interface IUser extends Document {
  name: string;
  email: string;
  phoneNumber?: string;
}

interface IUserModel extends Model<IUser> {
  updateProfileFromBooking(userId: string, name: string | null, phoneNumber: string | null): Promise<IUser | null>;
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phoneNumber: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^\+?1?\d{10}$/.test(v.replace(/\D/g, ''));
      },
      message: (props: { value: string }) => `${props.value} is not a valid phone number!`
    }
  }
});

// Add static method for profile updates
userSchema.statics.updateProfileFromBooking = async function(
  userId: string,
  name: string | null,
  phoneNumber: string | null
) {
  const updates: { name?: string; phoneNumber?: string } = {};
  
  if (name) updates.name = name;
  if (phoneNumber) {
    // Clean and validate phone number
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (/^\d{10}$/.test(cleanedPhone)) {
      updates.phoneNumber = cleanedPhone;
    }
  }
  
  if (Object.keys(updates).length > 0) {
    return await this.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
  }
  return null;
};

const User = (mongoose.models.User || mongoose.model<IUser, IUserModel>('User', userSchema)) as IUserModel;

// Helper function to parse business hours
function parseBusinessHours(hoursString: string) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hours: Record<string, { open: string; close: string; isOpen: boolean }> = {};
  
  try {
    const hoursData = JSON.parse(hoursString);
    days.forEach((day: string) => {
      if (hoursData[day]) {
        hours[day] = {
          open: hoursData[day].open || '',
          close: hoursData[day].close || '',
          isOpen: hoursData[day].isOpen || false
        };
      }
    });
  } catch (error: unknown) {
    console.error('Error parsing business hours:', error);
  }
  
  return hours;
}

// Helper function to get available time slots
async function getAvailableTimeSlots(businessId: string, dateStr: string, businessHours: any) {
  const date = new Date(dateStr);
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  // Get the day index (0 = Sunday, 1 = Monday, etc.)
  const dayIndex = date.getDay();
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const normalizedDayOfWeek = daysOfWeek[dayIndex];
  
  console.log(`Getting available time slots for ${normalizedDayOfWeek} (${dateStr})`);
  
  // If no business hours provided, try to get them from business details
  if (!businessHours) {
    console.log('No business hours provided, returning empty slots array');
    return [];
  }
  
  // First check if business is open on this day
  const dayHours = businessHours[normalizedDayOfWeek];
  if (!dayHours) {
    console.log(`No hours configuration found for ${normalizedDayOfWeek}`);
    return [];
  }
  
  if (!dayHours.isOpen) {
    console.log(`Business is closed on ${normalizedDayOfWeek}`);
    return [];
  }
  
  // Then check if business hours are properly set
  if (!dayHours.open || !dayHours.close) {
    console.log(`No available time slots: Hours not set for ${normalizedDayOfWeek}`);
    return [];
  }
  
  const timeSlots = [];
  let currentTime = dayHours.open;
  
  // Get AI feed data to check against custom availability rules
  let feedData = null;
  try {
    await dbConnect();
    feedData = await AIFeed.findOne({ 
      businessId: new mongoose.Types.ObjectId(businessId) 
    }).lean();
  } catch (error) {
    console.error('Error fetching business AI feed data:', error);
  }
  
  // Get business details for additional availability checks
  let businessDetails = null;
  try {
    businessDetails = await getBusinessBasicInfo(businessId);
  } catch (error) {
    console.error('Error fetching business details:', error);
  }
  
  while (currentTime <= dayHours.close) {
    // Check each time slot for availability
    const isAvailable = await checkAvailability(
      businessId,
      dateStr,
      currentTime,
      '', // No specific service for general availability check
      businessDetails,
      feedData
    );
    
    if (isAvailable) {
      timeSlots.push(currentTime);
    }
    
    // Add 30 minutes to current time
    const [hours, minutes] = currentTime.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hours));
    timeDate.setMinutes(parseInt(minutes) + 30);
    currentTime = timeDate.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  console.log(`Found ${timeSlots.length} available time slots for ${normalizedDayOfWeek}`);
  return timeSlots;
}

// Helper function to notify business
async function notifyBusiness(businessId: string, appointment: any, customerDetails: any) {
  try {
    // Get user email if it's provided in the customer details
    const userEmail = customerDetails.customerEmail;
    
    // Skip sending notification if essential data is missing
    if (!customerDetails.customerName || !appointment.service) {
      console.log('Skipping notification due to missing data:', {
        hasName: !!customerDetails.customerName,
        hasService: !!appointment.service
      });
      return;
    }
    
    console.log('Sending notification with data:', {
      service: appointment.service,
      customerName: customerDetails.customerName,
      hasEmail: !!userEmail,
      date: appointment.date || appointment.preferred_date
    });
    
    // Add email notification data for both user and business
    const emailEndpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/email`;
    const emailResponse = await fetch(emailEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'new_appointment',
        businessId,
        appointment: {
          date: appointment.date || appointment.preferred_date,
          time: appointment.time || appointment.preferred_time,
          status: appointment.status || 'requested'
        },
        customerDetails: {
          customerName: customerDetails.customerName,
          customerPhone: customerDetails.customerPhone,
          customerEmail: userEmail,
          service: appointment.service,
          notes: appointment.notes
        }
      })
    });
    
    const emailResult = await emailResponse.json();
    console.log('Email notification result:', emailResult);
    
    // Only send socket notification if email was successful
    if (emailResult.success) {
      // Send real-time notification if socket is available
      const socketEndpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/socket`;
      await fetch(socketEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'new_appointment',
          businessId,
          appointment,
          customerDetails
        })
      });
    }
  } catch (error) {
    console.error('Error sending business notification:', error);
  }
}

// Define the AIFeed schema
const aiFeedSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true
  },
  customTraining: {
    type: String,
    trim: true,
    default: ''
  },
  lastUpdated: Date
});

const AIFeed = mongoose.models.AIFeed || mongoose.model('AIFeed', aiFeedSchema);

// Helper function to extract availability information from AI feed
function extractAvailabilityFromFeed(feedData: string): string {
  const availabilityPattern = /availability:([^]*?)(?=\n\w+:|$)/i;
  const match = feedData.match(availabilityPattern);
  if (match) {
    return match[1].trim();
  }
  return '';
}

// Helper function to check availability for a given date and time
async function checkAvailability(
  businessId: string,
  date: string,
  time: string,
  service: string,
  businessDetails: any,
  feedData: any
): Promise<boolean> {
  console.log(`Checking availability for: businessId=${businessId}, date=${date}, time=${time}, service=${service}`);
  
  // Validate basic inputs first
  if (!businessId || !date || !time) {
    console.log('Missing required availability check parameters');
    return false;
  }
  
  try {
    // Get the day of week from the date
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.log(`Invalid date format: ${date}`);
      return false;
    }
    
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = daysOfWeek[dateObj.getDay()];
    console.log(`Day of week for ${date} is ${dayOfWeek}`);
    
    // Extract business hours from feed data or business details
    const businessHours = feedData?.businessHours || (businessDetails ? parseBusinessHours(businessDetails.hours) : null);
    
    // First, check if the business is open on this day at all
    if (businessHours && businessHours[dayOfWeek]) {
      // Check the isOpen flag first - if false, the business is closed regardless of hours
      if (businessHours[dayOfWeek].isOpen === false) {
        console.log(`Business is closed on ${dayOfWeek}`);
        return false;
      }
      
      const openTime = businessHours[dayOfWeek].open;
      const closeTime = businessHours[dayOfWeek].close;
      
      // If missing hours but marked as open, assume available (default business hours)
      if (!openTime || !closeTime) {
        console.log(`Business is open on ${dayOfWeek} but missing specific hours, using defaults`);
        // Fall through to time slot checking
      } else {
        // Normalize time formats for comparison
        const normalizedRequestTime = normalizeTimeFormat(time);
        const normalizedOpenTime = normalizeTimeFormat(openTime);
        const normalizedCloseTime = normalizeTimeFormat(closeTime);
        
        console.log(`Checking if ${normalizedRequestTime} is between ${normalizedOpenTime} and ${normalizedCloseTime}`);
        
        // Check if requested time is within business hours
        if (!isTimeWithinRange(normalizedRequestTime, normalizedOpenTime, normalizedCloseTime)) {
          console.log(`Requested time ${time} is outside business hours (${openTime} - ${closeTime})`);
          return false;
        }
      }
    } else {
      console.log(`No specific business hours found for ${dayOfWeek}, using default availability check`);
      // If no business hours found, check for the default pattern
      // This is a fallback for businesses that haven't set hours
      
      // If we're checking a Sunday and no specific override, most businesses are closed
      if (dayOfWeek === 'sunday' && (!businessHours || !businessHours.sunday || !businessHours.sunday.isOpen)) {
        console.log('Default check: Business is likely closed on Sunday');
        return false;
      }
    }
    
    // Check existing appointment requests in ChatRoom
    const existingRequest = await ChatRoom.findOne({
      'appointments.business_id': new mongoose.Types.ObjectId(businessId),
      'appointments.preferred_date': date,
      'appointments.preferred_time': time,
      'appointments.status': { $in: ['requested', 'confirmed'] }
    });

    if (existingRequest) {
      console.log(`Time slot ${time} on ${date} already has an appointment`);
      return false; // Time slot already has a request
    }
    
    // If we've made it here, the requested time is available
    console.log(`Time ${time} on ${date} is available for booking`);
    return true;
  } catch (error) {
    console.error('Error checking appointment availability:', error);
    return false;
  }
}

// Helper function to normalize time format
function normalizeTimeFormat(timeStr: string): string {
  // Handle various time formats and convert to 24-hour format for comparison
  let normalized = timeStr.trim().toLowerCase();
  
  // Extract hours, minutes, and AM/PM
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
  const match = normalized.match(timeRegex);
  
  if (!match) {
    // If no match, return original for fallback handling
    return normalized;
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3] ? match[3].toLowerCase() : null;
  
  // Convert to 24-hour format
  if (period === 'pm' && hours < 12) {
    hours += 12;
  } else if (period === 'am' && hours === 12) {
    hours = 0;
  }
  
  // Format as HH:MM
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function to check if a time is within a given range
function isTimeWithinRange(time: string, start: string, end: string): boolean {
  // For simplicity, we're assuming all times are in HH:MM format
  return time >= start && time <= end;
}

// Helper function to get available time slots
async function getAvailableSlots(
  businessId: string,
  date: string,
  service: string,
  businessDetails: any,
  feedData: any
): Promise<string[]> {
  const availableSlots = [];
  const businessHours = parseBusinessHours(businessDetails.hours);
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const dayHours = businessHours[dayOfWeek];

  if (dayHours && dayHours.open && dayHours.close) {
    let currentTime = dayHours.open;
    while (currentTime <= dayHours.close) {
      const isAvailable = await checkAvailability(businessId, date, currentTime, service, businessDetails, feedData);
      if (isAvailable) {
        availableSlots.push(currentTime);
      }
      
      // Add 30 minutes
      const [hours, minutes] = currentTime.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours));
      timeDate.setMinutes(parseInt(minutes) + 30);
      currentTime = timeDate.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  }

  return availableSlots;
}

// Add interface for appointment details
interface AppointmentDetails {
  isAppointmentRequest: boolean;
  service: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  notes?: string;  // Added notes field
  previouslyCollected: string[];
  validationErrors: string[];
  nextStep: string;
  status?: string;
  formMessage?: string;
  _id?: string;
  preferred_date?: string;
  preferred_time?: string;
  isEditing?: boolean;
  collectedField?: string;
  // Address fields for home services
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  serviceLocation?: 'home' | 'business';
  isHomeService?: boolean;
  email?: string;
}

// Update the storeAppointmentRequest function to handle both new and existing appointments
async function storeAppointmentRequest(
  chatRoomId: string,
  businessId: string,
  userId: string,
  appointmentDetails: AppointmentDetails
) {
  try {
    console.log('Processing appointment request:', {
      chatRoomId,
      businessId,
      notesLength: appointmentDetails.notes ? appointmentDetails.notes.length : 0,
      notes: appointmentDetails.notes || '',
      isEditing: appointmentDetails.isEditing
    });

    // First, verify the chatroom exists
    const existingChatRoom = await ChatRoom.findById(chatRoomId);
    if (!existingChatRoom) {
      throw new Error(`ChatRoom not found with ID: ${chatRoomId}`);
    }

    // Check for duplicate appointment requests within the last 5 minutes
    const recentTimeThreshold = new Date();
    recentTimeThreshold.setMinutes(recentTimeThreshold.getMinutes() - 5);
    
    const existingAppointments = existingChatRoom.appointments || [];
    const potentialDuplicate = existingAppointments.find((apt: any) => 
      apt.service === appointmentDetails.service &&
      apt.preferred_date === appointmentDetails.date &&
      apt.preferred_time === appointmentDetails.time &&
      apt.customerName === appointmentDetails.customerName &&
      apt.updatedAt > recentTimeThreshold
    );
    
    if (potentialDuplicate) {
      console.log('Prevented duplicate appointment creation:', {
        existingAppointment: potentialDuplicate._id,
        newRequest: appointmentDetails
      });
      
      // Return the existing appointment instead of creating a new one
      return {
        ...appointmentDetails,
        _id: potentialDuplicate._id,
        user_id: userId,
        business_id: businessId,
        updatedAt: new Date()
      };
    }

    // If we're editing an existing appointment
    if (appointmentDetails.isEditing && appointmentDetails._id) {
      // Log the update for debugging
      console.log('Updating existing appointment:', {
        id: appointmentDetails._id,
        date: appointmentDetails.date,
        time: appointmentDetails.time,
        service: appointmentDetails.service,
        notes: appointmentDetails.notes || ''
      });

      // Update the existing appointment
      const updatedChatRoom = await ChatRoom.findOneAndUpdate(
        {
          _id: chatRoomId,
          'appointments._id': appointmentDetails._id
        },
        {
          $set: {
            'appointments.$.service': appointmentDetails.service,
            'appointments.$.date': appointmentDetails.date, // Add direct date field
            'appointments.$.preferred_date': appointmentDetails.date,
            'appointments.$.time': appointmentDetails.time, // Add direct time field
            'appointments.$.preferred_time': appointmentDetails.time,
            'appointments.$.customerName': appointmentDetails.customerName,
            'appointments.$.customerPhone': appointmentDetails.customerPhone,
            'appointments.$.notes': appointmentDetails.notes || '',  // Added notes field
            'appointments.$.updatedAt': new Date()
          },
          $push: {
            messages: {
              _id: new mongoose.Types.ObjectId(),
              content: `Appointment updated:\nService: ${appointmentDetails.service}\nPreferred Date: ${appointmentDetails.date}\nPreferred Time: ${appointmentDetails.time}\nName: ${appointmentDetails.customerName}\nPhone: ${appointmentDetails.customerPhone}${appointmentDetails.notes ? '\nNotes: ' + appointmentDetails.notes : ''}\nStatus: ${appointmentDetails.status}`,
              senderId: businessId,
              senderType: 'BUSINESS',
              chatRoomId: chatRoomId,
              read: false,
              isAI: true,
              isAppointmentRequest: true,
              appointmentDetails: {
                ...appointmentDetails,
                user_id: userId,
                business_id: businessId,
                updatedAt: new Date()
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        },
        { new: true }
      );

      if (!updatedChatRoom) {
        throw new Error('Failed to update existing appointment');
      }

      return {
        ...appointmentDetails,
        _id: appointmentDetails._id,
        user_id: userId,
        business_id: businessId,
        updatedAt: new Date()
      };
    }

    // If it's a new appointment, create a new one
    const appointmentRequest = {
      _id: new mongoose.Types.ObjectId(),
      user_id: new mongoose.Types.ObjectId(userId),
      business_id: new mongoose.Types.ObjectId(businessId),
      service: appointmentDetails.service,
      // Use date field directly instead of preferred_date to prevent renaming issues
      date: appointmentDetails.date, 
      preferred_date: appointmentDetails.date,
      time: appointmentDetails.time,
      preferred_time: appointmentDetails.time,
      customerName: appointmentDetails.customerName,
      customerPhone: appointmentDetails.customerPhone,
      notes: appointmentDetails.notes || '',  // Ensure notes are properly set
      status: 'requested',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating new appointment request with date and notes:', {
      date: appointmentDetails.date,
      time: appointmentDetails.time,
      notes: appointmentDetails.notes,
      appointmentId: appointmentRequest._id
    });

    // Add new appointment request to chatroom
    const updatedChatRoom = await ChatRoom.findByIdAndUpdate(
      chatRoomId,
      {
        $push: {
          appointments: appointmentRequest,
          messages: {
            _id: new mongoose.Types.ObjectId(),
            content: `New appointment request:\nService: ${appointmentDetails.service}\nPreferred Date: ${appointmentDetails.date}\nPreferred Time: ${appointmentDetails.time}\nName: ${appointmentDetails.customerName}\nPhone: ${appointmentDetails.customerPhone}${appointmentDetails.notes ? '\nNotes: ' + appointmentDetails.notes : ''}\nStatus: requested`,
            senderId: businessId,
            senderType: 'BUSINESS',
            chatRoomId: chatRoomId,
            read: false,
            isAI: true,
            isAppointmentRequest: true,
            appointmentDetails: {
              ...appointmentRequest,
              notes: appointmentDetails.notes || '' // Ensure notes are included in message details
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedChatRoom) {
      throw new Error('Failed to create new appointment request');
    }

    // Get the user document to get their email
    let userEmail = appointmentDetails.email;
    try {
      if (!userEmail) {
        const User = mongoose.models.User;
        if (User) {
          const userDoc = await User.findById(userId);
          if (userDoc && userDoc.email) {
            userEmail = userDoc.email;
          }
        }
      }
    } catch (emailError) {
      console.error('Error fetching user email:', emailError);
      // Continue without email if we can't find it
    }

    // Notify the business about the new appointment
    try {
      await notifyBusiness(
        businessId, 
        appointmentRequest,
        {
          customerName: appointmentDetails.customerName,
          customerPhone: appointmentDetails.customerPhone,
          // Include the email we found or the one from appointmentDetails
          customerEmail: userEmail,
          service: appointmentDetails.service,
          notes: appointmentDetails.notes
        }
      );
      console.log('Business notifications sent successfully');
    } catch (notificationError) {
      console.error('Failed to send business notifications:', notificationError);
      // Continue execution even if notification fails
    }

    return appointmentRequest;
  } catch (error: any) {
    console.error('Error storing appointment request:', error);
    throw error;
  }
}

// Completely rewritten extractAppointmentDetails function
async function extractAppointmentDetails(
  message: string, 
  context?: any,
  businessId?: string,
  businessDetails?: any,
  feedData?: any,
  userContext?: {
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  },
  lastAppointmentDetails?: AppointmentDetails,
  chatRoomId?: string
) {
  console.log('Checking for appointment request in message...');
  
  // Log context information
  if (context) {
    console.log('Context type:', Array.isArray(context) ? 'Array' : typeof context);
    if (Array.isArray(context) && context.length > 0) {
      console.log('Last context item role:', context[context.length - 1].role);
      console.log('Context items count:', context.length);
    }
  }
  
  // Debug lastAppointmentDetails
    if (lastAppointmentDetails) {
    console.log('Using last appointment details as base:', JSON.stringify({
      service: lastAppointmentDetails.service,
      date: lastAppointmentDetails.date,
      time: lastAppointmentDetails.time,
      previouslyCollected: lastAppointmentDetails.previouslyCollected
    }));
  } else {
    console.log('Using last appointment details as base: { service: undefined, date: undefined, previouslyCollected: undefined }');
  }

  // Add pre-processing for common relative date terms
  let processedMessage = message;
  
  // First try to handle relative date terms directly
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Check for relative date terms and normalize them
  const lowerMessage = message.toLowerCase().trim();
  let extractedDate = null;
  
  if (
    lowerMessage === 'tomorrow' || 
    lowerMessage === 'tommorow' || // Common misspelling
    lowerMessage === 'tommorrow' || // Common misspelling
    lowerMessage === 'tomorow' || // Common misspelling
    lowerMessage.includes('book for tomorrow') || 
    lowerMessage.includes('schedule for tomorrow') ||
    lowerMessage.includes('book tomorrow') || 
    lowerMessage.includes('schedule tomorrow')
  ) {
    extractedDate = formatDateToYYYYMMDD(tomorrow);
    console.log(`Detected "tomorrow" reference in message, normalized to: ${extractedDate}`);
  } else if (
    lowerMessage === 'today' || 
    lowerMessage.includes('book for today') || 
    lowerMessage.includes('schedule for today') ||
    lowerMessage.includes('book today') || 
    lowerMessage.includes('schedule today')
  ) {
    extractedDate = formatDateToYYYYMMDD(today);
    console.log(`Detected "today" reference in message, normalized to: ${extractedDate}`);
  } else if (
    lowerMessage === 'day after tomorrow' || 
    lowerMessage.includes('day after tomorrow') || 
    lowerMessage.includes('book for day after tomorrow')
  ) {
    extractedDate = formatDateToYYYYMMDD(dayAfterTomorrow);
    console.log(`Detected "day after tomorrow" reference in message, normalized to: ${extractedDate}`);
  }

  // Create initial details template, using lastAppointmentDetails if available
  let initialDetails: AppointmentDetails = {
      isAppointmentRequest: false,
    service: lastAppointmentDetails?.service || '',
    date: extractedDate || lastAppointmentDetails?.date || '',
    time: lastAppointmentDetails?.time || '',
    customerName: lastAppointmentDetails?.customerName || '',
    customerPhone: lastAppointmentDetails?.customerPhone || '',
    notes: lastAppointmentDetails?.notes || '',  // Add notes field
    previouslyCollected: [...(lastAppointmentDetails?.previouslyCollected || [])],
    validationErrors: [...(lastAppointmentDetails?.validationErrors || [])],
    nextStep: lastAppointmentDetails?.nextStep || 'service'
  };

  // If we've directly extracted a date, mark it as collected
  if (extractedDate && !initialDetails.previouslyCollected.includes('date')) {
    initialDetails.previouslyCollected.push('date');
    initialDetails.date = extractedDate;
    
    // If we have a date, update nextStep accordingly
    if (initialDetails.service && initialDetails.date) {
      initialDetails.nextStep = 'time';
    }
    
    console.log(`Added directly extracted date: ${extractedDate} to collected fields`);
  }

  // Ensure we include userContext data if available
    if (userContext) {
      if (userContext.customerName && !initialDetails.customerName) {
        initialDetails.customerName = userContext.customerName;
        if (!initialDetails.previouslyCollected.includes('name')) {
          initialDetails.previouslyCollected.push('name');
        }
      }
      if (userContext.customerPhone && !initialDetails.customerPhone) {
        initialDetails.customerPhone = userContext.customerPhone;
        if (!initialDetails.previouslyCollected.includes('phone')) {
          initialDetails.previouslyCollected.push('phone');
        }
      }
    }

  console.log('Calling OpenAI API to extract appointment details...');
  const startTime = Date.now();
  try {
    // For directly extracted dates, we can skip the full OpenAI extraction
    if (extractedDate && initialDetails.service) {
      console.log('Using directly extracted date, skipping full OpenAI extraction');
      
      // Make sure we track what is collected
      initialDetails.isAppointmentRequest = true;
      
      // Update nextStep field based on what we've collected
      initialDetails.nextStep = determineNextStep(initialDetails);
      
      console.log('Determined next step after date extraction:', initialDetails.nextStep);
      
      return initialDetails;
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are an AI assistant helping with appointment scheduling for a business.
          Analyze the user message to determine if they might be requesting to schedule an appointment or service.
          
          Extract the following details if present:
          1. Is this an appointment request? (even informal like "I need help with...")
          2. Service requested (if mentioned, match to services like "Water Heater Installation" or "Leaky shower/tub valve repairs/replacements")
          3. Date for appointment (in YYYY-MM-DD format, ALWAYS use the current year ${new Date().getFullYear()} if not explicitly specified)
             - Be very careful with date formats and make sure the month and day are correct
             - If a date like "April 9th" is mentioned, ensure the month is 04 (April) and day is 09
             - DO NOT swap the month and day values
             - Use the current year (${new Date().getFullYear()}) unless another year is explicitly stated
             - For relative dates: "tomorrow" = ${formatDateToYYYYMMDD(tomorrow)}, "today" = ${formatDateToYYYYMMDD(today)}
          4. Time for appointment
          5. Customer name (if provided)
          6. Customer phone (if provided)
          7. Address information (if provided, especially for home services):
             - Complete address including street, city, state, and zip code in a single field
          8. Notes or special requirements (specifically look for):
             - Any mentions of specific issues (e.g., "leaking faucet", "broken pipe")
             - Access instructions (e.g., "gate code is 1234", "enter from the back")
             - Special considerations (e.g., "I have a dog", "please call before arriving")
             - Specific areas of focus (e.g., "focus on the master bathroom", "especially the kitchen sink")
             - Equipment needs (e.g., "need a ladder", "bring special tools")
             - Urgency indicators (e.g., "it's very urgent", "emergency situation")
             - Any text that follows phrases like "notes:", "also,", "by the way", "please note", "additionally"
          
          Return your response as a JSON object with the following structure:
          {
            "isAppointmentRequest": boolean,
            "service": string | null,
            "date": string | null (YYYY-MM-DD),
            "time": string | null (HH:MM AM/PM),
            "customerName": string | null,
            "customerPhone": string | null,
            "address": string | null, // Complete address including street, city, state, zip code
            "notes": string | null,
            "previouslyCollected": string[], // Add any fields you've detected from ["service","date","time","name","phone","address","notes"]
            "validationErrors": string[] // Any errors with the input
          }
          
          For notes, extract any specific requirements, access instructions, or special requests the user mentions.
          If the user explicitly says "no notes" or similar, set notes to an empty string and mark it as collected.
          Pay special attention to notes that appear at the end of messages after other appointment details.
          
          CRITICAL: For date parsing, be extremely precise and use the exact date mentioned by the user.
          When parsing relative dates:
          - "tomorrow" or variations like "tommorow" should be converted to ${formatDateToYYYYMMDD(tomorrow)}
          - "today" should be converted to ${formatDateToYYYYMMDD(today)}
          - "day after tomorrow" should be converted to ${formatDateToYYYYMMDD(dayAfterTomorrow)}
          
          ONLY respond with the JSON object, nothing else.`
        },
        {
          role: "user", 
          content: message
        }
      ]
    });

    const endTime = Date.now();
    console.log(`OpenAI API call for extraction completed in ${endTime - startTime}ms`);
    
    const content = completion.choices[0].message.content || '{}';
    let details: any = {};
    
    try {
      details = JSON.parse(content);
      
      // Additional post-processing for relative dates that OpenAI might have missed
      if (!details.date && (
        message.toLowerCase().includes('tomorrow') || 
        message.toLowerCase().includes('tommorow') ||
        message.toLowerCase().includes('tommorrow') ||
        message.toLowerCase().includes('tomorow')
      )) {
        details.date = formatDateToYYYYMMDD(tomorrow);
        if (!details.previouslyCollected) details.previouslyCollected = [];
        if (!details.previouslyCollected.includes('date')) {
          details.previouslyCollected.push('date');
        }
        console.log(`Post-processing detected "tomorrow", set date to: ${details.date}`);
      }
      
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      console.log("Response content:", content);
      
      // Try to recover with direct date extraction if possible
      if (extractedDate) {
        details = {
          isAppointmentRequest: true,
          service: initialDetails.service || null,
          date: extractedDate,
          time: null,
          customerName: null,
          customerPhone: null,
          notes: null,
          previouslyCollected: initialDetails.service ? ['service', 'date'] : ['date'],
          validationErrors: []
        };
        console.log("Recovery: Using directly extracted date after JSON parse failure");
      } else {
      return initialDetails;
      }
    }
    
    console.log("Initial extracted details from OpenAI:", details);
    
    // CRITICAL FIX: Merge the OpenAI extracted details with initialDetails from lastAppointmentDetails
    // Only override fields if they're present in the extracted details and not empty/null
    
    // Ensure date uses current year
    let dateValue = details.date;
    if (dateValue && typeof dateValue === 'string') {
      // Check if the date has a year that's not the current year
      const currentYear = new Date().getFullYear();
      const dateYear = parseInt(dateValue.split('-')[0], 10);
      
      if (dateYear !== currentYear) {
        console.log(`Correcting year in date: ${dateValue} -> year changed to ${currentYear}`);
        // Replace the year with current year
        const dateParts = dateValue.split('-');
        if (dateParts.length === 3) {
          dateParts[0] = currentYear.toString();
          dateValue = dateParts.join('-');
        }
      }
      
      // Now validate consistency with previous date if available
      if (initialDetails.date) {
        dateValue = validateDateConsistency(dateValue, initialDetails.date);
      }
    }
    
    const mergedDetails: AppointmentDetails = {
      isAppointmentRequest: details?.isAppointmentRequest === true ? true : initialDetails.isAppointmentRequest,
      service: details?.service && details.service !== null && details.service !== "" ? details.service : initialDetails.service,
      date: dateValue && dateValue !== null && dateValue !== "" ? dateValue : initialDetails.date,
      time: details?.time && details.time !== null && details.time !== "" ? details.time : initialDetails.time,
      customerName: details?.customerName && details.customerName !== null && details.customerName !== "" ? details.customerName : initialDetails.customerName,
      customerPhone: details?.customerPhone && details.customerPhone !== null && details.customerPhone !== "" ? details.customerPhone : initialDetails.customerPhone,
      notes: details?.notes && details.notes !== null ? details.notes : initialDetails.notes,
      // Add address related fields
      address: details?.address || initialDetails.address,
      city: details?.city || initialDetails.city,
      state: details?.state || initialDetails.state,
      zipCode: details?.zipCode || initialDetails.zipCode,
      isHomeService: initialDetails.isHomeService, // Preserve the home service flag
      serviceLocation: details?.serviceLocation || initialDetails.serviceLocation,
      previouslyCollected: [...new Set([...initialDetails.previouslyCollected, ...(details?.previouslyCollected || [])])],
      validationErrors: [...(details?.validationErrors || [])],
      nextStep: details?.nextStep || determineNextStep(initialDetails)
    };
    
    // Handle explicit "no notes" responses
    if (message.toLowerCase().includes('no notes') || 
        message.toLowerCase().includes('no special requirements') || 
        message.toLowerCase().includes('no additional notes') ||
        message.toLowerCase().includes('no specific notes') ||
        message.toLowerCase().includes('nothing to add') ||
        message.toLowerCase().includes('nothing special') ||
        message.toLowerCase().includes('no requirements')) {
      mergedDetails.notes = '';
      if (!mergedDetails.previouslyCollected.includes('notes')) {
        mergedDetails.previouslyCollected.push('notes');
      }
      console.log('Detected explicit "no notes" response');
    } else {
      // Check if this is a direct response to a notes question
      // This needs to be BEFORE the pattern matching to take precedence
      console.log('Checking if message is a direct response to notes prompt...');
      
      // Process context to extract previous messages for better detection
      const processedContext = Array.isArray(context) ? context : 
                             (typeof context === 'string' ? [{role: 'system', content: context}] : []);
      
      // Get the last few messages to check if we were asking about notes
      const lastFewMessages = processedContext.slice(-3);
      const wasAskedForNotes = lastFewMessages.some(msg => 
        msg && typeof msg.content === 'string' && (
          msg.content.toLowerCase().includes('would you like to add any notes') ||
          msg.content.toLowerCase().includes('any notes or specific requirements') ||
          msg.content.toLowerCase().includes('any special requirements') ||
          msg.content.toLowerCase().includes('notes or requirements') ||
          msg.content.toLowerCase().includes('add any notes') ||
          (msg.content.toLowerCase().includes('notes') && 
           msg.content.toLowerCase().includes('appointment'))
        )
      );
      
      // Check if previous system message indicated we were collecting notes
      const previouslyCollectingNotes = lastAppointmentDetails && 
                                       lastAppointmentDetails.nextStep === 'notes';
      
      console.log('Was previously asked for notes:', wasAskedForNotes);
      console.log('Was previously collecting notes:', previouslyCollectingNotes);
      
      // If we were explicitly asking for notes and got a response
      if ((wasAskedForNotes || previouslyCollectingNotes) && message.trim().length > 0) {
        console.log('Direct response to notes prompt detected:', message);
        // Use the entire message as the notes content
        mergedDetails.notes = message.trim();
        if (!mergedDetails.previouslyCollected.includes('notes')) {
          mergedDetails.previouslyCollected.push('notes');
        }
      } else {
        // Not a direct response, so try pattern matching as fallback
        console.log('Not a direct notes response, trying pattern matching...');
        // Look for notes in specific patterns that might be missed
        const notesPatterns = [
          /by the way[,:]?\s+(.*)/i,
          /please note[,:]?\s+(.*)/i,
          /also[,:]?\s+(.*)/i,
          /notes?[,:]?\s+(.*)/i,
          /special instructions?[,:]?\s+(.*)/i,
          /additional(?:ly)?[,:]?\s+(.*)/i,
          /oh and[,:]?\s+(.*)/i,
          /one more thing[,:]?\s+(.*)/i,
          /i need\s+(.*)/i,           // Added to catch "I need X" patterns
          /please\s+(.*)/i,           // Added to catch "Please X" requests
          /make sure\s+(.*)/i,        // Added to catch "Make sure X" instructions
          /specifically\s+(.*)/i,     // Added to catch "Specifically X" requirements
          /only\s+(.*)/i,             // Added to catch "Only X" requirements
          /must\s+(.*)/i,             // Added to catch "Must X" requirements
          /can you\s+(.*)/i,          // Added to catch "Can you X" requests
          /(\w+\s+\w+\s+only)/i       // Added to catch "X brand only" type notes
        ];
        
        // Check if we can extract notes from patterns
        if (!mergedDetails.notes || mergedDetails.notes === '') {
          for (const pattern of notesPatterns) {
            const match = message.match(pattern);
            if (match && match[1] && match[1].trim()) {
              console.log(`Found notes using pattern: ${pattern}`, match[1]);
              mergedDetails.notes = match[1].trim();
              if (!mergedDetails.previouslyCollected.includes('notes')) {
                mergedDetails.previouslyCollected.push('notes');
              }
              break;
            }
          }
        }
      }
    }

    // If the notes field is very short (less than 3 words) and not meaningful, it might be noise
    // But we should keep obvious model names, brands or specific requests
    if (mergedDetails.notes && 
        mergedDetails.notes.split(/\s+/).length < 3 && 
        !mergedDetails.notes.toLowerCase().includes('only') &&
        !mergedDetails.notes.toLowerCase().includes('brand') &&
        !mergedDetails.notes.match(/[A-Z][a-z]+/) // Check for proper nouns/brand names
       ) {
      console.log(`Notes "${mergedDetails.notes}" might be too short, checking if it's meaningful...`);
      // If it's just one or two generic words, it might not be a real note
      const genericWords = ['yes', 'no', 'ok', 'okay', 'sure', 'fine', 'good', 'thanks', 'thank you'];
      if (genericWords.includes(mergedDetails.notes.toLowerCase())) {
        console.log('Notes appear to be just an acknowledgement, not treating as notes');
        mergedDetails.notes = '';
        // Remove notes from previously collected if it was added
        mergedDetails.previouslyCollected = mergedDetails.previouslyCollected.filter(item => item !== 'notes');
      }
    }

    // Track notes collection - needs to be after all note detection logic
    if (mergedDetails.notes !== undefined && 
        mergedDetails.notes !== null && 
        mergedDetails.notes !== '' && 
        !mergedDetails.previouslyCollected.includes('notes')) {
      mergedDetails.previouslyCollected.push('notes');
      console.log('Added notes to previously collected fields:', mergedDetails.notes);
    }
    
    // Ensure we track all fields with values as "collected"
    if (mergedDetails.service && !mergedDetails.previouslyCollected.includes('service')) {
      mergedDetails.previouslyCollected.push('service');
    }
    
    if (mergedDetails.date && !mergedDetails.previouslyCollected.includes('date')) {
      mergedDetails.previouslyCollected.push('date');
    }
    
    if (mergedDetails.time && !mergedDetails.previouslyCollected.includes('time')) {
      mergedDetails.previouslyCollected.push('time');
    }
    
    if (mergedDetails.customerName && !mergedDetails.previouslyCollected.includes('name')) {
      mergedDetails.previouslyCollected.push('name');
    }
    
    if (mergedDetails.customerPhone && !mergedDetails.previouslyCollected.includes('phone')) {
      mergedDetails.previouslyCollected.push('phone');
    }
    
    // If the current message provided useful appointment info, mark as a request
    if (details.isAppointmentRequest || 
        details.service || 
        details.date || 
        details.time || 
        details.customerName ||
        details.customerPhone ||
        (details.previouslyCollected && details.previouslyCollected.length > 0)) {
      mergedDetails.isAppointmentRequest = true;
    }
    
    // If we have any appointment info at all from previous messages, maintain the appointment request status
    if (initialDetails.service || initialDetails.date || initialDetails.time || 
        (initialDetails.previouslyCollected && initialDetails.previouslyCollected.length > 0)) {
      mergedDetails.isAppointmentRequest = true;
    }
    
    // Make sure we update the nextStep field based on what's collected
    mergedDetails.nextStep = determineNextStep(mergedDetails);
    
    console.log("Final extracted details:", mergedDetails);
    
    if (mergedDetails.isAppointmentRequest) {
      console.log("Detected appointment request:", {
        service: mergedDetails.service,
        date: mergedDetails.date,
        time: mergedDetails.time,
        nextStep: mergedDetails.nextStep,
        previouslyCollected: mergedDetails.previouslyCollected
      });
    }
    
    // Add direct response detection for notes
    // This is to handle cases where the user directly answers the notes prompt
    const lastFewMessages = Array.isArray(context) ? context.slice(-3) : [];
    const wasAskedForNotes = lastFewMessages.some(msg => 
      msg && typeof msg.content === 'string' && (
        msg.content.toLowerCase().includes('would you like to add any notes') ||
        msg.content.toLowerCase().includes('any notes or specific requirements') ||
        msg.content.toLowerCase().includes('any special requirements') ||
        msg.content.toLowerCase().includes('notes or requirements')
      )
    );

    // If the user was just asked for notes and they replied with something other than "no notes"
    if (wasAskedForNotes && 
        !message.toLowerCase().includes('no notes') && 
        !message.toLowerCase().includes('no special requirements') && 
        !message.toLowerCase().includes('no additional notes') &&
        !message.toLowerCase().includes('no specific notes') &&
        !message.toLowerCase().includes('nothing to add') &&
        !message.toLowerCase().includes('nothing special') &&
        !message.toLowerCase().includes('no requirements') &&
        message.trim().length > 0) {
      
      console.log('Detected direct response to notes prompt:', message);
      mergedDetails.notes = message.trim();
      if (!mergedDetails.previouslyCollected.includes('notes')) {
        mergedDetails.previouslyCollected.push('notes');
      }
    }
    
    return mergedDetails;
        } catch (error) {
    console.error("Error in extracting appointment details:", error);
    return initialDetails;
  }
}

// Helper function to determine the next step in appointment flow
function determineNextStep(details: AppointmentDetails): string {
  if (!details.service) return 'service';
  if (!details.date) return 'date';
  if (!details.time) return 'time';
  if (!details.customerName) return 'customerName';
  if (!details.customerPhone) return 'customerPhone';
  // Check only for the main address field for home services
  if (details.isHomeService && !details.address) return 'address';
  if (!details.notes) return 'notes';  // Add notes step
  return 'review'; // All fields collected
}

// Helper function to generate form messages
async function generateFormMessage(
  details: AppointmentDetails,
  businessId?: string,
  businessDetails?: any,
  feedData?: any
) {
  try {
    // Check if this is a home service
    const isHomeService = businessDetails?.Business_Category === 'Home Services' || 
                        (businessDetails?.Business_Subcategories && 
                         Array.isArray(businessDetails.Business_Subcategories) && 
                         businessDetails.Business_Subcategories.some((sub: string) => 
                           ['Plumbing', 'HVAC', 'Cleaning', 'Electrical', 'Landscaping', 'Pest Control', 
                            'Home Repair', 'Painting', 'Roofing', 'Flooring', 'Installation'].includes(sub)));
    
    // Set isHomeService in the details
    details.isHomeService = isHomeService;
    
    // For home services, add address to the required fields
    const requiredFieldOrder = isHomeService 
      ? ['service', 'date', 'time', 'name', 'phone', 'address'] 
      : ['service', 'date', 'time', 'name', 'phone'];
    
    // If all collected, show complete message
    if (details.nextStep === 'complete') {
      const addressInfo = isHomeService && details.address 
        ? `\n✓ Service Address: ${details.address}`
        : '';
      
      return `Great! I've got everything I need to schedule your appointment:
✓ Service: ${details.service}
✓ Date: ${details.date}
✓ Time: ${details.time}
✓ Name: ${details.customerName}
✓ Phone: ${details.customerPhone}${addressInfo}${details.notes ? '\n✓ Notes: ' + details.notes : ''}

I'll get this scheduled for you right away! You'll receive a confirmation shortly, and one of our team members will give you a call to confirm all the details. Is there anything else you need help with today?`;
    }
    
    // Build a message about what we have so far
    let message = "";
    
    // Different intro based on current step
    if (details.previouslyCollected.length === 0) {
      message = "I'd love to help you schedule an appointment! Let me get that set up for you.\n\n";
    } else {
      message = "Thanks! ";
      if (details.previouslyCollected.length === 1) {
        message += "Just a few more quick details and we'll have you all set.\n\n";
      } else if (details.previouslyCollected.length === 2) {
        message += "We're almost there! Just a couple more things to finalize your appointment.\n\n";
      } else {
        message += "Almost done! Just a few final details to get you scheduled.\n\n";
      }
    }
    
    // Add details we've collected
    if (details.previouslyCollected.length > 0) {
      message += 'Here\'s what I have so far:\n';
      if (details.service) message += `✓ Service: ${details.service}\n`;
      if (details.date) message += `✓ Date: ${details.date}\n`;
      if (details.time) message += `✓ Time: ${details.time}\n`;
      if (details.customerName) message += `✓ Name: ${details.customerName}\n`;
      if (details.customerPhone) message += `✓ Phone: ${details.customerPhone}\n`;
      if (isHomeService && details.address) {
        message += `✓ Service Address: ${details.address}\n`;
      }
      if (details.notes) message += `✓ Notes: ${details.notes}\n`;
      message += '\n';
    }
    
    // Ask for specific missing information with context
    switch(details.nextStep) {
      case 'service':
        message += `What type of service are you looking to schedule?`;
        if (businessDetails?.services) {
          message += `\n\nWe specialize in:\n${businessDetails.services.map((s: any) => `- ${s.name || s}`).join('\n')}`;
        }
              break;
        
      case 'date':
        message += `When would you like us to come out for your ${details.service || 'service'}?`;
        
        // Enhanced business hours display
        if (businessDetails?.hours) {
          try {
            const parsedHours = parseBusinessHours(businessDetails.hours);
            let openDays = '';
            
            // Generate a user-friendly message showing which days we're open
            const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const openDaysList = daysOfWeek
              .filter(day => parsedHours[day] && parsedHours[day].isOpen)
              .map(day => {
                const hours = parsedHours[day];
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                return `- ${dayName}: ${hours.open} - ${hours.close}`;
              });
              
            if (openDaysList.length > 0) {
              openDays = `\n\nWe're available:\n${openDaysList.join('\n')}`;
              message += openDays;
            }
          } catch (error) {
            console.error('Error parsing business hours for form message:', error);
          }
        }
        
        // If there was a past date error, provide more guidance
        if (details.validationErrors.some(error => error.includes('past'))) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          message += `\n\nI can schedule you for tomorrow (${tomorrowStr}) or any day after that - what works best for you?`;
        }
              break;
        
      case 'time':
        message += `What time would work best for you on ${details.date}?`;
        
        // Try to get available time slots if we have enough info
        if (details.date && businessId && businessDetails?.hours) {
          try {
            // Parse business hours
            const parsedHours = parseBusinessHours(businessDetails.hours);
            
            // Get day of week from date
            const appointmentDate = new Date(details.date);
            const dayIndex = appointmentDate.getDay();
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayOfWeek = daysOfWeek[dayIndex];
            
            // Check if we're open on this day
            if (parsedHours[dayOfWeek] && parsedHours[dayOfWeek].isOpen) {
              // Format business hours for this day
              const dayHours = parsedHours[dayOfWeek];
              message += `\n\nWe have appointments available between ${dayHours.open} and ${dayHours.close} on that day.`;
              
              // Get available slots
            const timeSlots = await getAvailableTimeSlots(
              businessId,
              details.date,
                parsedHours
            );
              
            if (timeSlots && timeSlots.length > 0) {
                // For better UX, limit to 8 slots if there are many
                const displayedSlots = timeSlots.length > 8 ? 
                  [...timeSlots.slice(0, 8), '...and additional times available'] : 
                  timeSlots;
                  
                message += `\n\nHere are some available time slots:\n`;
                message += displayedSlots.map(slot => `- ${slot}`).join('\n');
              } else {
                message += `\n\nI apologize, but we're fully booked for ${details.date}. Would you like to look at another day? I'm happy to check availability for a different date.`;
              }
            } else {
              message += `\n\nI apologize, but we're not available for appointments on that day. Would you like to look at our availability for another day? I'm happy to help find a time that works for you.`;
            }
          } catch (e) {
            console.error('Error getting available time slots:', e);
          }
        }
              break;
        
      case 'name':
        message += `Could I get your name for the appointment?`;
              break;
        
      case 'phone':
        // Check if we actually have a phone number already but it wasn't properly detected
        if (details.customerPhone && details.customerPhone.replace(/\D/g, '').length === 10) {
          // We already have a valid phone number, so proceed to confirmation
          details.nextStep = 'complete';
          return `Perfect! I have your phone number (${details.customerPhone}). Let me confirm all your appointment details:
✓ Service: ${details.service}
✓ Date: ${details.date}
✓ Time: ${details.time}
✓ Name: ${details.customerName}
✓ Phone: ${details.customerPhone}

I'll get this scheduled for you right away! You'll receive a confirmation shortly. Is there anything else you need help with?`;
        }
        message += `And lastly, what's the best phone number for us to reach you at?`;
        break;
        
      case 'notes':
        message += "Would you like to add any notes or specific requirements for your appointment? For example:\n";
        message += "- Specific issues to address (like 'leaking faucet', 'broken pipe')\n";
        message += "- Access instructions (gate codes, entry points, parking information)\n";
        message += "- Special considerations (pets, children, allergies)\n";
        message += "- Areas to focus on (which rooms, specific fixtures)\n";
        message += "- Any urgency or priority information\n\n";
        message += "If you don't have any special notes, just say 'no notes' and we'll proceed with scheduling your appointment.";
              break;
      
      case 'address':
        message += `Since this service will be performed at your location, I'll need your address. Please provide your complete address including street, city, state, and zip code.`;
        break;
      
      // ... handle any additional cases if needed ...
      
      // ... rest of the existing switch cases ...
    }
    
    // Add any validation errors
    if (details.validationErrors.length > 0) {
      message += '\n\nI noticed a couple things we need to address:\n';
      details.validationErrors.forEach((error: string) => {
        message += `- ${error}\n`;
      });
    }
    
    return message;
  } catch (error) {
    console.error('Error generating form message:', error);
    return `I'd be happy to help you schedule an appointment. What details can I help you with?`;
  }
}

// Helper function to convert role strings
function convertRole(role: string): 'user' | 'assistant' {
  switch (role.toLowerCase()) {
    case 'user':
      return 'user';
    case 'assistant':
    case 'ai':
    case 'bot':
      return 'assistant';
    default:
      return 'user';
  }
}

// Helper function to ensure document types are compatible
function convertToRagDocument(doc: any): RagDocument {
  // If it's already the right type, return it
  if (doc.pageContent !== undefined && 
      doc.metadata !== undefined && 
      typeof doc.metadata.businessId === 'string' && 
      typeof doc.metadata.type === 'string' && 
      typeof doc.metadata.source === 'string') {
    return doc as RagDocument;
  }
  
  // Create a new document with the correct format
  return {
    pageContent: typeof doc.pageContent === 'string' ? doc.pageContent : String(doc.pageContent || ''),
    metadata: {
      businessId: typeof doc.metadata?.businessId === 'string' ? doc.metadata.businessId : String(doc.metadata?.businessId || ''),
      type: typeof doc.metadata?.type === 'string' ? doc.metadata.type : 'unknown',
      source: typeof doc.metadata?.source === 'string' ? doc.metadata.source : 'converted',
      // Optional fields
      ...(doc.metadata?.serviceId && { serviceId: String(doc.metadata.serviceId) }),
      ...(doc.metadata?.faqId && { faqId: String(doc.metadata.faqId) }),
      ...(doc.metadata?.promoId && { promoId: String(doc.metadata.promoId) }),
      ...(doc.metadata?.responseId && { responseId: String(doc.metadata.responseId) }),
      ...(doc.metadata?.score !== undefined && { score: Number(doc.metadata.score) })
    }
  };
}

// Helper function to convert arrays of documents
function convertToRagDocuments(docs: any[]): RagDocument[] {
  return docs.map(convertToRagDocument);
}

// New helper function to ensure dates use current year and validate date format
function normalizeDate(dateStr: string | null | undefined): string | null | undefined {
  if (!dateStr) return dateStr;
  
  try {
    console.log(`Normalizing date: "${dateStr}"`);
    
    // Check if the date string is in YYYY-MM-DD format
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateStr.match(datePattern);
    
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      const currentYear = new Date().getFullYear();
      
      // Validate month and day
      if (month < 1 || month > 12) {
        console.error(`⚠️ Invalid month in date: ${dateStr}, month: ${month}`);
        return dateStr; // Return original to avoid breaking things
      }
      
      // Check days in month (simple version)
      const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (day < 1 || day > maxDays[month - 1]) {
        console.error(`⚠️ Invalid day in date: ${dateStr}, day: ${day}, month: ${month}`);
        return dateStr; // Return original to avoid breaking things
      }
      
      // If year is not current, update it only if it's a future date for appointments
      if (year !== currentYear) {
        // Only change years that are clearly wrong (like 2023, not plausible future dates)
        if (year < currentYear || year > currentYear + 10) {
          console.log(`📅 Normalizing date year from ${year} to ${currentYear} (original: ${dateStr})`);
        return `${currentYear}-${match[2]}-${match[3]}`;
        } else {
          console.log(`🔄 Keeping future year ${year} as valid (original: ${dateStr})`);
        }
      }
      
      // Additional check to prevent timezone issues changing dates
      const dateObj = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`);
      const localMonth = dateObj.getMonth() + 1; // getMonth() is 0-indexed
      const localDay = dateObj.getDate();
      
      if (localMonth !== month || localDay !== day) {
        console.error(`⚠️ Date object conversion changed the date! Original: ${month}-${day}, Date object: ${localMonth}-${localDay}`);
        // Force the date string to match what was provided
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    } else {
      console.log(`Date ${dateStr} is not in YYYY-MM-DD format, using as is`);
    }
    
    return dateStr;
  } catch (error) {
    console.error('Error normalizing date:', error);
    return dateStr;
  }
}

// New helper function to validate date consistency when extracting from messages
function validateDateConsistency(date: string | null | undefined, previousDate: string | null | undefined): string | null | undefined {
  if (!date || !previousDate) return date;
  
  try {
    // If we already had a date and now have a new one, log it for debugging
    if (previousDate && date && previousDate !== date) {
      console.log(`Date changed from "${previousDate}" to "${date}" - checking for potential issues`);
      
      // Check if the formats are YYYY-MM-DD
      const prevPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
      const newPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
      const prevMatch = previousDate.match(prevPattern);
      const newMatch = date.match(newPattern);
      
      if (prevMatch && newMatch) {
        const prevYear = prevMatch[1];
        const prevMonth = parseInt(prevMatch[2]);
        const prevDay = parseInt(prevMatch[3]);
        
        const newYear = newMatch[1];
        const newMonth = parseInt(newMatch[2]);
        const newDay = parseInt(newMatch[3]);
        
        // Month names for clearer logging
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // If only the month changed drastically (not consecutive months)
        if (prevYear === newYear && prevDay === newDay && prevMonth !== newMonth) {
          if (newMonth > 12 || Math.abs(prevMonth - newMonth) > 2) {
            console.log(`Month appears incorrect in new date. Original: ${monthNames[prevMonth-1]} (${prevMonth}), New: ${newMonth > 12 ? 'INVALID' : monthNames[newMonth-1]} (${newMonth}). Keeping original date: ${previousDate}`);
            return previousDate;
          }
        }
        
        // If the month and day appear to be swapped (common mistake)
        if (prevYear === newYear && prevMonth === newDay && prevDay === newMonth) {
          console.log(`Month and day appear to be swapped. Original: month=${monthNames[prevMonth-1]} (${prevMonth}), day=${prevDay}. New: month=${newMonth > 12 ? 'INVALID' : monthNames[newMonth-1]} (${newMonth}), day=${newDay}. Keeping original date: ${previousDate}`);
          return previousDate;
        }
        
        // If the new date has an invalid month (over 12)
        if (newMonth > 12) {
          console.log(`New date has invalid month (${newMonth}). Keeping original date: ${previousDate}`);
          return previousDate;
        }
        
        // Month/day confusion check (October/April specific case)
        if (prevMonth === 4 && newMonth === 10) { // April → October
          console.log(`Potential 04 (April) to 10 (October) confusion. Keeping April: ${previousDate}`);
          return previousDate;
        }
        
        if (prevMonth === 10 && newMonth === 4) { // October → April
          console.log(`Potential 10 (October) to 04 (April) confusion. Keeping October: ${previousDate}`);
          return previousDate;
        }
      }
    }
    
    return date;
  } catch (error) {
    console.error('Error validating date consistency:', error);
    return date;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Log the received request data
    const requestData = await req.json();
    console.log('Received AI response request data:', {
      hasBusinessId: !!requestData.businessId,
      hasMessages: !!requestData.messages,
      hasMessage: !!requestData.message,
      isMessagesArray: Array.isArray(requestData.messages),
      contextLength: requestData.context ? JSON.stringify(requestData.context).length : 0,
      hasChatRoomId: !!requestData.chatRoomId,
      hasLastAppointmentDetails: !!requestData.lastAppointmentDetails,
      appointmentContextEnabled: !!requestData.appointmentContextEnabled,
      keys: Object.keys(requestData)
    });
    
    // Extract data - support both message formats
    const { businessId, messages, message, context, chatRoomId, businessDetails, lastAppointmentDetails: initialAppointmentDetails, appointmentContextEnabled } = requestData;
    
    // Clone appointment details to make it mutable
    let appointmentDetails = initialAppointmentDetails ? JSON.parse(JSON.stringify(initialAppointmentDetails)) : null;

    // Check if we have existing appointment details from the frontend
    if (appointmentDetails && Object.keys(appointmentDetails).length > 0) {
      console.log('Using appointment details from frontend:', {
        service: appointmentDetails.service,
        date: appointmentDetails.date,
        previouslyCollected: appointmentDetails.previouslyCollected
      });
       
      // Ensure previous details aren't lost by checking if they contain meaningful data
      if (appointmentDetails.service || appointmentDetails.date || appointmentDetails.time) {
        // Ensure the fields are properly tracked as collected
        appointmentDetails.previouslyCollected = appointmentDetails.previouslyCollected || [];
        
        if (appointmentDetails.service && !appointmentDetails.previouslyCollected.includes('service')) {
          appointmentDetails.previouslyCollected.push('service');
        }
        
        if (appointmentDetails.date && !appointmentDetails.previouslyCollected.includes('date')) {
          appointmentDetails.previouslyCollected.push('date');
        }
        
        if (appointmentDetails.time && !appointmentDetails.previouslyCollected.includes('time')) {
          appointmentDetails.previouslyCollected.push('time');
        }
        
        console.log('Enhanced details to ensure collection tracking:', appointmentDetails);
      }
    }
    
    // Validation with detailed error messages
    if (!businessId) {
      console.error('Missing businessId in request');
      return NextResponse.json({ error: 'Missing businessId in request' }, { status: 400 });
    }
    
    // Handle both message formats (array of messages or single message)
    let lastUserMessage: string;
    let formattedMessages: any[] = [];
    
    if (messages && Array.isArray(messages)) {
      // Format: { messages: [{role: 'user', content: '...'}, ...] }
      formattedMessages = messages;
      lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop()?.content as string;
    } else if (message) {
      // Format: { message: '...' }
      formattedMessages = [{ role: 'user', content: message }];
      lastUserMessage = message;
    } else {
      console.error('No valid message or messages found in request');
      return NextResponse.json({ error: 'No valid message or messages found' }, { status: 400 });
    }
    
    if (!lastUserMessage) {
      console.error('No user message content found');
      return NextResponse.json({ error: 'No user message content found' }, { status: 400 });
    }
    
    // Log the validated data
    console.log('Validated request data:', {
      businessId,
      lastUserMessage: lastUserMessage.substring(0, 50) + (lastUserMessage.length > 50 ? '...' : ''),
      messagesCount: formattedMessages.length,
      hasChatRoomId: !!chatRoomId
    });

    // Get business name and basic profile from database
    let business;
    try {
      business = await getBusinessBasicInfo(businessId);
      console.log(`Retrieved business info for ${businessId}`);
    } catch (error) {
      console.error(`Error fetching business info: ${error}`);
      // Continue with limited information
    }

    // Merge fetched business with provided businessDetails
    const mergedBusinessDetails = {
      ...(business || {}),
      ...(businessDetails || {})
    };

    // Extract business information for system message
    const businessDescription = mergedBusinessDetails?.description || 
                            mergedBusinessDetails?.business_description || 
                            '';

    // Format services information
    let businessServices = 'Not specified';
    if (mergedBusinessDetails?.services && Array.isArray(mergedBusinessDetails.services)) {
      businessServices = mergedBusinessDetails.services
        .map((s: any) => typeof s === 'string' ? s : (s?.name || s?.service || ''))
        .filter(Boolean)
        .join(', ');
    }

    // Format business hours
    let formattedHours = 'Not specified';
    if (mergedBusinessDetails?.hours) {
      try {
        const parsedHours = parseBusinessHours(mergedBusinessDetails.hours);
        if (typeof parsedHours === 'string') {
          formattedHours = parsedHours;
        } else if (parsedHours) {
          // If it's an object, convert it to a formatted string
          formattedHours = Object.entries(parsedHours)
            .map(([day, hours]) => {
              if (typeof hours === 'object' && hours.open && hours.close) {
                return `${day}: ${hours.open} - ${hours.close}`;
              }
              return `${day}: Closed`;
            })
            .join('\n');
        }
      } catch (e) {
        console.error('Error parsing business hours:', e);
      }
    }

    // Other business information
    const businessPolicies = mergedBusinessDetails?.policies || 
                             mergedBusinessDetails?.business_policies || 
                             '';
                            
    const businessPromotions = mergedBusinessDetails?.promotions || 
                               mergedBusinessDetails?.special_promotions || 
                               '';
                              
    const businessUniqueFeatures = mergedBusinessDetails?.features || 
                                  mergedBusinessDetails?.unique_features || 
                                  '';

    // Get business name from any available source
    const businessName = mergedBusinessDetails?.business_name || 
                         mergedBusinessDetails?.businessName || 
                         business?.business_name || 
                         'this business';

    // Prepare OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Prepare system message with business profile information
    const systemMessage = `You are an AI assistant for ${businessName}, providing friendly and helpful customer service. Your role is to assist customers with information and scheduling appointments.

CORE WORKFLOW FOR APPOINTMENTS:
1. SERVICE CONFIRMATION:
   - ALWAYS ask "What service would you like to schedule?" if not explicitly stated
   - NEVER assume or reference a service that hasn't been explicitly confirmed
   - If customer mentions a service, confirm it before proceeding
   - If customer changes the service during conversation, update and reconfirm

2. APPOINTMENT FLOW:
   Step 1: Get and confirm service
   Step 2: Ask for preferred day
   Step 3: Verify business hours for that day
   Step 4: Ask for preferred time
   Step 5: Collect customer details
   Step 6: Ask for any special notes or requirements
          "Would you like to add any notes or specific requirements for your appointment?"

3. CONVERSATION TRACKING:
   - Track what information has been confirmed
   - Don't reference unconfirmed details
   - If unsure about a detail, ask for clarification
   - Reset service selection if customer changes their mind
   - Store any special notes provided by the customer

4. COMMUNICATION GUIDELINES:
   - Use only confirmed information in responses
   - Ask one question at a time
   - Be concise and clear
   - Format times consistently (e.g., "2:30 PM")
   - When confirming appointments, include any notes provided

5. NOTES HANDLING:
   - Ask for notes after collecting basic appointment details
   - Accept any specific requirements or preferences
   - Common notes to ask about:
     * Specific areas or issues to focus on
     * Access instructions or parking information
     * Special equipment or materials needed
     * Any other relevant details for the service

CRITICAL RULES:
1. NEVER assume or mention a service that hasn't been explicitly confirmed
2. ALWAYS verify each piece of information before using it in responses
3. If a detail is unclear or unconfirmed, ask about it specifically
4. Keep responses focused on the current step in the booking process
5. Don't combine multiple questions in one response
6. When in doubt, ask for clarification
7. Always include confirmed notes in the final appointment summary

EXAMPLE RESPONSES:
- Initial inquiry: "I'd be happy to help you schedule an appointment! What service would you like to schedule?"
- After day is chosen (without confirmed service): "What service would you like to schedule for [day]?"
- Asking for day (with confirmed service): "What day would you like to schedule your [confirmed_service] appointment?"
- If closed on requested day: "I apologize, but we're closed on [day]. What other day would work better for you?"
- Asking for time: "What time would you prefer? We're open [hours for that day]."
- Asking for notes: "Would you like to add any notes or specific requirements for your appointment?"
- Final confirmation with notes: "Great! I've scheduled your [service] appointment for [day] at [time]. Notes: [customer_notes]. Is there anything else you need?"

RESPONSE TEMPLATES:
- Without confirmed service: "What service would you like to schedule?"
- Day inquiry: "What day would you like to schedule your appointment?"
- Time inquiry: "What time would you prefer? We're open [hours for that day]."
- Notes inquiry: "Would you like to add any notes or specific requirements for your appointment?"
- Confirmation: Include all confirmed details and any provided notes`;

    // Use environment variable to control which RAG implementation to use
    const usePinecone = process.env.USE_PINECONE_RAG === 'true';
    
    // Check if context was provided in the request
    let usingProvidedContext = false;
    let relevantChunks: RagDocument[] = [];
    let relevantContext = '';

    if (context && typeof context === 'string' && context.trim()) {
      // Use the provided context
      console.log('Using provided context from request');
      usingProvidedContext = true;
      relevantContext = context;
    } else {
      // Use RAG to retrieve relevant business information based on the user's query
      console.log('Retrieving relevant context for query using LocalVectorStore RAG');
      
      try {
        // Use LocalVectorStore for RAG
        console.log('Retrieving chunks from LocalVectorStore...');
        relevantChunks = await retrieveRelevantChunks(businessId, lastUserMessage, 8);
        console.log(`Retrieved ${relevantChunks?.length || 0} chunks from LocalVectorStore`);
        relevantContext = formatChunksForContext(relevantChunks);
      } catch (error) {
        console.error('Error retrieving from LocalVectorStore:', error);
        relevantChunks = [];
        relevantContext = '';
      }
    }
    
    // Prepare enhanced system message with business profile data
    const enhancedSystemMessage = `${systemMessage}

===== BUSINESS INFORMATION =====

Business Name: ${businessName}
Full Address: ${mergedBusinessDetails.address || 'George Brown Street, Billerica, MA'}
Phone: ${mergedBusinessDetails.phone || '916-598-0203'}
Email: ${mergedBusinessDetails.email || 'proplusbillerica@gmail.com'}

Business Hours:
${formattedHours}

Description:
${businessDescription}

Services Offered:
${businessServices}

${businessPolicies}

${businessPromotions}

${businessUniqueFeatures}

When responding to location queries:
1. Always start with "We're located at [full address]"
2. Format phone number as XXX-XXX-XXXX
3. Include email address when providing contact details
4. Mention business hours if the customer might visit
5. Be friendly and offer to provide additional directions if needed
6. If asked about directions, mention nearby landmarks or cross-streets if available`;

    // Add the relevant context from either the provided context or RAG
    let finalSystemMessage;

    if (enhancedSystemMessage.length > 8000) {
      console.warn('System message is very long, may exceed token limits');
      // Extract the most relevant chunk content (truncate if too much content)
      let reducedContext = '';
      
      if (usingProvidedContext) {
        // If using provided context, limit it to a reasonable size
        reducedContext = relevantContext.substring(0, 4000) + 
                       (relevantContext.length > 4000 ? '\n...(truncated)' : '');
      } else {
        try {
          // Make sure relevantChunks is an array
          const chunksArray = Array.isArray(relevantChunks) ? relevantChunks : [];
          const reducedChunks = chunksArray.slice(0, 5);
          
          // Handle formatting based on the type of RAG system used
          reducedContext = formatChunksForContext(reducedChunks);
          
          console.log(`Reduced context to ${reducedChunks.length} chunks`);
        } catch (error) {
          console.error('Error processing reduced chunks:', error);
          reducedContext = '';
        }
      }
      
      finalSystemMessage = systemMessage + `\n\n===== RELEVANT BUSINESS INFORMATION =====\n\n${reducedContext}`;
    } else {
      finalSystemMessage = enhancedSystemMessage + `\n\n===== RELEVANT BUSINESS INFORMATION =====\n\n${relevantContext}`;
    }

    // Prepare conversation history
    const historyMessages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: finalSystemMessage
      }
    ];

    // Add conversation history (except system messages)
    historyMessages.push(
      ...formattedMessages.filter(msg => msg.role !== 'system')
    );

    // Add existing appointment context if provided
    if (appointmentDetails) {
      try {
        // Check if we have the minimum required fields to reference an appointment
        if (appointmentDetails.service && 
            (appointmentDetails.date || appointmentDetails.preferred_date) && 
            (appointmentDetails.time || appointmentDetails.preferred_time) &&
            appointmentDetails.status) {
          
          // Support both field naming conventions (appointment and lastAppointmentDetails)
          const appointmentService = appointmentDetails.service;
          const appointmentDate = appointmentDetails.date || appointmentDetails.preferred_date;
          const appointmentTime = appointmentDetails.time || appointmentDetails.preferred_time;
          const appointmentStatus = appointmentDetails.status.toLowerCase();
          
          // Add appointment status to conversation
          historyMessages.push({
            role: 'system',
            content: `The user's appointment for "${appointmentService}" on ${appointmentDate} at ${appointmentTime} has been ${appointmentStatus}.`
          });
          
          console.log(`Added existing appointment context: ${appointmentService} on ${appointmentDate} at ${appointmentTime} (${appointmentStatus})`);
        } else {
          console.log('Received appointment details but missing required fields:', appointmentDetails);
        }
      } catch (e) {
        console.error('Error processing appointment context:', e);
        // Continue without the appointment context
      }
    }

    // Process appointment request if present
    let appointmentData = null;
    try {
      console.log('Checking for appointment request in message...');
      
      // Convert context to array if it's a string to match the expected format
      const contextForAppointment = Array.isArray(relevantContext) 
        ? relevantContext 
        : (typeof relevantContext === 'string' ? [] : relevantContext);
      
      // Process the context to prioritize appointment details
      // Look through each message to find appointment details explicitly included
      let foundAppointmentDetails = null;
      if (Array.isArray(contextForAppointment)) {
        for (const msg of contextForAppointment) {
          if (msg.appointmentDetails && 
              (msg.appointmentDetails.service || 
               msg.appointmentDetails.date || 
               msg.appointmentDetails.time)) {
            console.log('Found appointment details in context message:', {
              service: msg.appointmentDetails.service,
              date: msg.appointmentDetails.date,
              previouslyCollected: msg.appointmentDetails.previouslyCollected 
            });
            foundAppointmentDetails = msg.appointmentDetails;
            break;
          }
          
          // Also check for APPOINTMENT TRACKING tag in system messages
          if (msg.role === 'system' && typeof msg.content === 'string' && 
              msg.content.includes('APPOINTMENT TRACKING')) {
            console.log('Found appointment tracking message in context');
            // Don't override foundAppointmentDetails if we already found it
            if (!foundAppointmentDetails && msg.appointmentDetails) {
              foundAppointmentDetails = msg.appointmentDetails;
            }
          }
        }
      }
      
      // If we found details in the context, use them instead of or merge with appointmentDetails
      if (foundAppointmentDetails) {
        if (!appointmentDetails) {
          appointmentDetails = foundAppointmentDetails;
          console.log('Using appointment details found in context messages');
        } else {
          // Merge the details, preferring the most comprehensive information
          appointmentDetails = {
            ...appointmentDetails,
            ...foundAppointmentDetails,
            // But preserve these fields from existing details if they exist
            service: appointmentDetails.service || foundAppointmentDetails.service,
            date: appointmentDetails.date || foundAppointmentDetails.date,
            time: appointmentDetails.time || foundAppointmentDetails.time,
            // Combine the previously collected arrays
            previouslyCollected: [
              ...(appointmentDetails.previouslyCollected || []),
              ...(foundAppointmentDetails.previouslyCollected || [])
            ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
          };
          console.log('Merged appointment details from context and appointmentDetails');
        }
      }
        
      // Add lastUserMessage to context for better processing
      let enhancedContext: any[] = [];
      
      if (Array.isArray(contextForAppointment)) {
        enhancedContext = [...contextForAppointment];
        
        // Add the current message to the context for better processing
        if (lastUserMessage) {
          enhancedContext.push({
            role: 'user',
            content: lastUserMessage
          });
        }
      }
      
      const extractedDetails = await extractAppointmentDetails(
        lastUserMessage,
        enhancedContext,
        businessId,
        mergedBusinessDetails,
        requestData.feedData,
        requestData.userProfile ? { // Pass user context if available
          customerName: requestData.userProfile.name || '',
          customerPhone: requestData.userProfile.phoneNumber || '',
          customerEmail: requestData.userProfile.email || ''
        } : undefined,
        appointmentDetails, // Use our enhanced appointment details
        chatRoomId
      );
      
      if (extractedDetails.isAppointmentRequest) {
        console.log('Detected appointment request:', {
          service: extractedDetails.service,
          date: extractedDetails.date,
          time: extractedDetails.time,
          nextStep: extractedDetails.nextStep,
          previouslyCollected: extractedDetails.previouslyCollected
        });
        
        appointmentData = extractedDetails;
        
        // CRITICAL FIX: Ensure we don't lose previous appointment details when user mentions only one piece of information
        // This ensures information provided in previous messages isn't lost in the current context
        if (initialAppointmentDetails) {
          // Preserve service information
          if (initialAppointmentDetails.service && !appointmentData.service) {
            console.log('Restoring service from previous appointment context:', initialAppointmentDetails.service);
            appointmentData.service = initialAppointmentDetails.service;
            if (!appointmentData.previouslyCollected.includes('service')) {
              appointmentData.previouslyCollected.push('service');
            }
          }
          
          // Preserve date information - normalize to current year
          if (initialAppointmentDetails.date && !appointmentData.date) {
            const normalizedDate = normalizeDate(initialAppointmentDetails.date);
            console.log('Restoring date from previous appointment context:', initialAppointmentDetails.date, 'normalized to:', normalizedDate);
            appointmentData.date = normalizedDate || initialAppointmentDetails.date;
            if (!appointmentData.previouslyCollected.includes('date')) {
              appointmentData.previouslyCollected.push('date');
            }
          } else if (appointmentData.date) {
            // Normalize current date if present
            const originalDate = appointmentData.date;
            appointmentData.date = normalizeDate(appointmentData.date) || appointmentData.date;
            
            if (originalDate !== appointmentData.date) {
              console.log(`Date normalized from "${originalDate}" to "${appointmentData.date}"`);
            }
          }
          
          // Preserve time information
          if (initialAppointmentDetails.time && !appointmentData.time) {
            console.log('Restoring time from previous appointment context:', initialAppointmentDetails.time);
            appointmentData.time = initialAppointmentDetails.time;
            if (!appointmentData.previouslyCollected.includes('time')) {
              appointmentData.previouslyCollected.push('time');
            }
          }
          
          // Preserve customer information
          if (initialAppointmentDetails.customerName && !appointmentData.customerName) {
            console.log('Restoring customer name from previous context:', initialAppointmentDetails.customerName);
            appointmentData.customerName = initialAppointmentDetails.customerName;
            if (!appointmentData.previouslyCollected.includes('name')) {
              appointmentData.previouslyCollected.push('name');
            }
          }
          
          if (initialAppointmentDetails.customerPhone && !appointmentData.customerPhone) {
            console.log('Restoring customer phone from previous context:', initialAppointmentDetails.customerPhone);
            appointmentData.customerPhone = initialAppointmentDetails.customerPhone;
            if (!appointmentData.previouslyCollected.includes('phone')) {
              appointmentData.previouslyCollected.push('phone');
            }
          }
        }
        
        // Re-determine the next step based on our enhanced appointment data
        appointmentData.nextStep = determineNextStep(appointmentData);
        
        // Add specific appointment context to the conversation
        const detailsText = [
          appointmentData.service && `service: ${appointmentData.service}`,
          appointmentData.date && `date: ${appointmentData.date}`,
          appointmentData.time && `time: ${appointmentData.time}`,
          appointmentData.customerName && `name: ${appointmentData.customerName}`,
          appointmentData.customerPhone && `phone: ${appointmentData.customerPhone}`
        ].filter(Boolean).join(', ');
        
        // Create explicit step-by-step context with additional hints
        const serviceStatus = appointmentData.previouslyCollected.includes('service') ? 'ALREADY COLLECTED' : 'NEEDS COLLECTION';
        const dateStatus = appointmentData.previouslyCollected.includes('date') ? 'ALREADY COLLECTED' : 'NEEDS COLLECTION';
        
        historyMessages.push({
          role: 'system',
          content: `The user is booking an appointment. Collection progress: step ${appointmentData.previouslyCollected.length}/5.
Previously collected fields: ${appointmentData.previouslyCollected.join(', ') || 'none'}.
Current details: ${detailsText || 'none collected yet'}.
Next step to collect: ${appointmentData.nextStep}.
${appointmentData.validationErrors.length > 0 ? `Validation errors: ${appointmentData.validationErrors.join(', ')}` : ''}

IMPORTANT INSTRUCTIONS:
1. DO NOT ask for information that has already been collected.
2. Focus ONLY on collecting the next step (${appointmentData.nextStep}).
3. REMEMBER all previously provided information even if it was provided in past messages.
4. MAINTAIN CONTEXT throughout the conversation.
5. Always acknowledge previously collected information before asking for new information.
6. Be precise and focused in your questions - don't ask open-ended questions for appointment details.
7. Service: "${appointmentData.service || 'not provided yet'}" - ${serviceStatus}
8. Date: "${appointmentData.date || 'not provided yet'}" - ${dateStatus}`
        });
        
        // If the appointment details are complete, include a stronger signal
        if (appointmentData.nextStep === 'complete' || appointmentData.nextStep === 'review') {
          historyMessages.push({
            role: 'system',
            content: `All appointment details have been successfully collected. Proceed to confirmation and submission. DO NOT ask for any additional information, special requests, specific details, or follow-up questions. The appointment is complete and just needs a simple confirmation message.`
          });
        }
      }
    } catch (error) {
      console.error('Error extracting appointment details:', error);
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: historyMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Include the appointment data in the response if available
    const responseObj: {
      response: string | null;
      appointment: AppointmentDetails | null;
      appointmentDetails: AppointmentDetails | null;
      isAppointmentRequest: boolean;
      context: any[];
      resetAppointmentContext?: boolean;
    } = {
      response: response.choices[0].message.content,
      appointment: appointmentData,
      appointmentDetails: appointmentData,
      isAppointmentRequest: !!appointmentData?.isAppointmentRequest,
      context: formattedMessages
    };

    // Log any errors detected in the appointment data
    if (appointmentData && appointmentData.validationErrors && appointmentData.validationErrors.length > 0) {
      console.log('Appointment validation errors:', appointmentData.validationErrors);
    }

    // STORE APPOINTMENT TO DATABASE WHEN COMPLETE
    // Check if this is a completed appointment that needs to be stored
    if (appointmentData && 
        appointmentData.isAppointmentRequest && 
        (appointmentData.nextStep === 'complete' || appointmentData.nextStep === 'review') &&
        appointmentData.service && 
        appointmentData.date && 
        appointmentData.time &&
        appointmentData.customerName &&
        appointmentData.customerPhone) {
      
      console.log('Appointment is complete, storing to database:', {
        service: appointmentData.service,
        date: appointmentData.date,
        time: appointmentData.time,
        customerName: appointmentData.customerName
      });
      
      try {
        // Get user ID from authorization token
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        const userId = token ? getUserFromToken(token) : null;
        
        if (userId && chatRoomId) {
          // Log the original date before any normalization
          console.log(`Original appointment date: "${appointmentData.date}"`);
          
          // Final date validation to ensure consistency
          let finalDate = normalizeDate(appointmentData.date);
          
          // Compare original and normalized date to detect unexpected changes
          if (finalDate !== appointmentData.date) {
            console.log(`⚠️ Date changed during normalization: "${appointmentData.date}" → "${finalDate}"`);
            
            // Extract date parts for validation
            const origParts = appointmentData.date.split('-');
            const finalParts = finalDate ? finalDate.split('-') : [];
            
            // If the day and month are different (not just year normalization)
            if (origParts.length === 3 && finalParts.length === 3) {
              if (origParts[1] !== finalParts[1] || origParts[2] !== finalParts[2]) {
                console.log(`⚠️ Day or month was changed! Original: ${origParts[1]}-${origParts[2]}, After: ${finalParts[1]}-${finalParts[2]}`);
                console.log(`🔄 Reverting to original date but keeping year normalization if needed`);
                
                // Keep original month and day but use normalized year if different
                const normalizedYear = finalParts[0];
                finalDate = `${normalizedYear}-${origParts[1]}-${origParts[2]}`;
              }
            }
          }
          
          console.log(`Final appointment date for database: "${finalDate || appointmentData.date}"`);
          
          // Store the appointment in the database
          const storedAppointment = await storeAppointmentRequest(
            chatRoomId,
            businessId,
            userId,
            {
              ...appointmentData,
              // Use finalDate if available, otherwise use original
              date: finalDate || appointmentData.date,
              status: 'requested', // Set the status to requested for new appointments
              notes: appointmentData.notes || '' // Ensure notes are explicitly passed
            }
          );
          
          console.log('Successfully stored appointment in database:', {
            id: storedAppointment._id,
            notes: storedAppointment.notes
          });
          
          // Update the response with the stored appointment ID
          responseObj.appointment = {
            ...appointmentData,
            _id: storedAppointment._id,
            status: 'requested',
            notes: storedAppointment.notes // Ensure notes are included in the response
          };
          responseObj.appointmentDetails = responseObj.appointment;
          
          // ADDED: New flag to signal the frontend to reset the appointment context
          responseObj.resetAppointmentContext = true;
          
          // ENHANCED: Explicitly modify the appointment data to indicate it should not be used in future messages
          // This ensures the next message will start fresh without appointment context
          appointmentData = {
            ...appointmentData,
            isAppointmentRequest: false,
            status: 'completed',
            nextStep: 'none',
            previouslyCollected: [],
            formMessage: 'Appointment request has been completed and submitted.'
          };
          
          // Add explicit system message to ensure the AI shows a success message
          historyMessages.push({
            role: 'system',
            content: `The appointment has been successfully submitted to the business. Respond with a CLEAR SUCCESS MESSAGE confirming the appointment details were received. Simply confirm receipt and DO NOT ask if they want to add any specific details or requests. Reference the appointment's service, date, and time in your confirmation message. The message should be concise and simply confirm that the appointment request has been sent. 
            
IMPORTANT: NEVER ask if the user has any "special requests" or "additional information" or "specific details" they would like to add. Never ask any follow-up questions. Just provide a simple confirmation message only.

IMPORTANT DATE FORMAT: When mentioning the date, ALWAYS use the CURRENT YEAR (${new Date().getFullYear()}) in your response. For example, if the date is "2023-04-09", you should refer to it as "April 9, ${new Date().getFullYear()}" in your message.

ADDITIONALLY: Be extremely precise about the date format. If the exact date is "2025-04-09", make absolutely sure you refer to it as "April 9, 2025" - DO NOT change the month from April to any other month. Be extremely careful to preserve the exact month and day that was specified in the appointment.

Example good response: "Your appointment request for [Service] on [EXACT Date with EXACT month and day] at [Time] has been successfully submitted. The business will receive your request and contact you to confirm your appointment."

Example bad response (DO NOT DO THIS): "Thank you for providing all the necessary information for your booking request. Before finalizing, would you like to add any specific details or requests regarding your appointment?" 

DO NOT ask for any additional information under any circumstances.

AFTER THIS MESSAGE: This appointment conversation is COMPLETE. After your confirmation message, the conversation should return to normal. Future messages from the user are NOT related to this appointment. Treat any future messages as completely new topics unrelated to the appointment that was just booked.`
          });
          
          // Add an explicit context reset message
          historyMessages.push({
            role: 'system',
            content: `CONTEXT RESET: The previous appointment conversation is now completely finished.

IMPORTANT INSTRUCTIONS FOR ALL FUTURE MESSAGES:
1. The appointment booking flow is now COMPLETE.
2. DO NOT reference any previous appointment details in your responses.
3. DO NOT ask about appointment details.
4. DO NOT ask if the user wants to modify their appointment.
5. DO NOT ask if the user has any special requests.
6. Treat any new message as a completely fresh conversation unrelated to appointments.
7. Only discuss appointments again if the user explicitly requests a new appointment.

This is a hard context boundary - previous appointment context should be completely disregarded.`
          });
          
          // Notify the business about the new appointment
          await notifyBusiness(businessId, storedAppointment, {
            name: appointmentData.customerName,
            phone: appointmentData.customerPhone
          });
        } else {
          console.error('Missing userId or chatRoomId for appointment storage:', { userId, chatRoomId });
        }
      } catch (error) {
        console.error('Error storing appointment:', error);
        // Continue with the response even if storage fails
      }
    }

    // Add a debug log to make sure all appointment information is being returned properly
    if (appointmentData) {
      console.log('Final appointment data in response:', {
        service: appointmentData.service,
        date: appointmentData.date,
        time: appointmentData.time,
        previouslyCollected: appointmentData.previouslyCollected,
        nextStep: appointmentData.nextStep,
        notes: appointmentData.notes ? (appointmentData.notes.length > 100 ? 
          appointmentData.notes.substring(0, 100) + '...' : appointmentData.notes) : '' 
      });
      
      // Additional date information for debugging
      if (responseObj.appointment && responseObj.appointment.date) {
        console.log(`📆 Final date in response object: "${responseObj.appointment.date}"`);
      }
    }

    // Use new socket for immediate delivery
    if (socketService) {
      await socketService.sendMessage({
        chatRoomId,
        content: response.choices[0].message.content,
        senderType: SenderType.BUSINESS,
        senderId: businessId,
        isAI: true
      });
    }

    // Save AI response to database (in addition to socket delivery)
    try {
      await connectMongo();
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) {
        return NextResponse.json({ error: 'Chat room not found', success: false }, { status: 404 });
      }

      // Create new message object
      const newMessage = {
        _id: new mongoose.Types.ObjectId(),
        content: response.choices[0].message.content,
        senderId: businessId,
        senderType: SenderType.BUSINESS,
        chatRoomId,
        read: false,
        isAI: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add message to chatroom
      chatRoom.messages.push(newMessage);
      
      // Mark all user messages as read since AI is responding to them
      chatRoom.messages = chatRoom.messages.map(msg => {
        if (msg.senderType === SenderType.USER && !msg.read) {
          msg.read = true;
        }
        return msg;
      });
      
      await chatRoom.save();
      console.log('AI response saved to database');
    } catch (dbError) {
      console.error('Error saving AI response to database:', dbError);
      // We continue even if DB save fails since the message was already sent via socket
    }

    return NextResponse.json(responseObj);
  } catch (error) {
    console.error('Error processing AI response:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 