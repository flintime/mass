import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

// GET handler for debugging chat rooms
export async function GET(req: NextRequest) {
  console.log('Debug API: Examining chat rooms and appointments');
  
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
    
    console.log(`Debug API: Examining chat rooms for user: ${userId}`);
    
    // Connect to database directly
    const { db } = await connectToDatabase();
    
    // Find all chat rooms for this user directly from MongoDB collection
    const chatRooms = await db.collection('chatrooms').find({ 
      userId: new ObjectId(userId) 
    }).toArray();
    
    console.log(`Debug API: Found ${chatRooms.length} chat rooms`);
    
    // Prepare debug information
    const debugInfo = {
      userId,
      chatRoomsCount: chatRooms.length,
      chatRooms: chatRooms.map(room => {
        // Extract basic room info
        const roomInfo = {
          id: (room._id as any).toString(),
          businessId: room.businessId ? (room.businessId as any).toString() : null,
          messagesCount: Array.isArray(room.messages) ? room.messages.length : 0,
          appointmentsCount: Array.isArray(room.appointments) ? room.appointments.length : 0,
          appointmentsSample: null as any,
          appointmentFieldNames: [] as string[]
        };
        
        // Get a sample appointment if available
        if (Array.isArray(room.appointments) && room.appointments.length > 0) {
          const sampleAppointment = room.appointments[0];
          roomInfo.appointmentsSample = sampleAppointment;
          
          // Extract field names from the appointment
          if (sampleAppointment) {
            roomInfo.appointmentFieldNames = Object.keys(sampleAppointment);
          }
        }
        
        return roomInfo;
      }),
      // Direct access to raw collections for deeper analysis
      rawAccess: null as any
    };
    
    // Try to provide some raw collection access for diagnostics
    try {
      // Get a sample of the direct database collections
      if (db) {
        const businessSample = await db.collection('businesses').findOne({});
        const chatRoomSample = await db.collection('chatrooms').findOne({});
        
        debugInfo.rawAccess = {
          businessCollectionSample: businessSample ? {
            id: businessSample._id.toString(),
            name: businessSample.business_name,
            fieldNames: Object.keys(businessSample)
          } : null,
          chatRoomCollectionSample: chatRoomSample ? {
            id: chatRoomSample._id.toString(),
            fieldNames: Object.keys(chatRoomSample)
          } : null
        };
      } else {
        console.log('Debug API: Direct DB access not available');
      }
    } catch (error) {
      console.error('Debug API: Error accessing raw collections:', error);
    }
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Debug API: Error examining chat rooms:', error);
    return NextResponse.json(
      { error: 'Failed to examine chat rooms', details: (error as Error).message },
      { status: 500 }
    );
  }
} 