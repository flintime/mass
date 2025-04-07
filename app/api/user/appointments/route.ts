import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { ChatRoom } from '@/models/chat';

// Get user ID from JWT token in Authorization header
function getUserFromToken(token: string): string | null {
  try {
    // For simplicity, just extract user ID from token
    // In a real app, you'd verify the token properly
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

// Interface for appointment data structure
interface AppointmentData {
  _id: string;
  service: string;
  preferred_date: string;
  preferred_time: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  businessInfo: {
    id: string;
    name: string;
    uniqueId: string;
    phone: string;
    address: string;
    city: string;
    state: string;
  } | null;
  chatRoomId: string;
  suggestedTime?: {
    date: string;
    time: string;
    suggestedAt: string;
  };
}

// GET handler for fetching user appointments
export async function GET(req: NextRequest) {
  console.log('Fetching appointments for user');
  
  try {
    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = getUserFromToken(token);
    
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    console.log(`Fetching appointments for user: ${userId}`);
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Find all chat rooms for this user directly from MongoDB collection
    const chatRooms = await db.collection('chatrooms').find({ 
      userId: new ObjectId(userId) 
    }).toArray();
    
    console.log(`Found ${chatRooms.length} chat rooms for user ${userId}`);
    
    // Extract all appointments from the chat rooms
    const appointments: AppointmentData[] = [];
    
    for (const room of chatRooms) {
      const roomId = room._id.toString();
      // Check if businessId is a string (unique_id) or ObjectId
      let businessId: string | null = null;
      if (room.businessId) {
        if (typeof room.businessId === 'string') {
          businessId = room.businessId;
        } else {
          businessId = room.businessId.toString();
        }
      }
      
      console.log(`Chat room ${roomId}: ${room.appointments?.length || 0} appointments`);
      
      // Skip if no appointments in this room
      if (!room.appointments || !Array.isArray(room.appointments) || room.appointments.length === 0) {
        continue;
      }
      
      // Get business info directly from MongoDB
      let businessInfo = null;
      if (businessId) {
        try {
          // Try finding by _id first (if it's an ObjectId)
          let business = null;
          if (ObjectId.isValid(businessId)) {
            business = await db.collection('businesses').findOne({ 
              _id: new ObjectId(businessId) 
            });
          }
          
          // If not found by _id, try finding by unique_id
          if (!business) {
            business = await db.collection('businesses').findOne({ 
              unique_id: businessId 
            });
          }
          
          if (business) {
            businessInfo = {
              id: business._id.toString(),
              name: business.business_name || '',
              uniqueId: business.unique_id || '',
              phone: business.phone || '',
              address: business.address || '',
              city: business.city || '',
              state: business.state || ''
            };
          }
        } catch (error) {
          console.error(`Error fetching business ${businessId}:`, error);
        }
      }
      
      // Process each appointment in this room
      for (const appt of room.appointments) {
        if (!appt) continue;
        
        try {
          // Log the suggestedTime field if it exists
          if (appt.status === 'reschedule_requested') {
            console.log(`Appointment ${appt._id?.toString()} has status '${appt.status}'`);
            console.log(`SuggestedTime details:`, JSON.stringify(appt.suggestedTime || 'undefined'));
          }
          
          appointments.push({
            _id: appt._id?.toString() || new ObjectId().toString(),
            service: appt.service || '',
            preferred_date: appt.preferred_date || '',
            preferred_time: appt.preferred_time || '',
            customerName: appt.customerName || '',
            customerPhone: appt.customerPhone || '',
            notes: appt.notes || '',
            status: appt.status || 'requested',
            createdAt: appt.createdAt || new Date().toISOString(),
            updatedAt: appt.updatedAt || new Date().toISOString(),
            businessInfo: businessInfo,
            chatRoomId: roomId,
            suggestedTime: appt.suggestedTime || undefined
          });
        } catch (error) {
          console.error('Error processing appointment:', error);
        }
      }
    }
    
    // Sort appointments by date (newest first)
    appointments.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    
    console.log(`Returning ${appointments.length} appointments for user ${userId}`);
    return NextResponse.json(appointments);
    
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
} 