import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { ChatRoom } from '@/models/chat';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('No authorization token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = getBusinessFromToken(token);
    if (!businessId) {
      console.error('Invalid or expired token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();

    console.log('Fetching chat rooms for business:', businessId);

    // Find all chat rooms for this business
    const chatRooms = await ChatRoom.find({
      businessId: new mongoose.Types.ObjectId(businessId)
    }).select('appointments messages'); // Select both appointments and messages fields

    console.log('Found chat rooms:', chatRooms.length);

    // Transform the data to ensure all IDs are strings
    const transformedRooms = chatRooms.map(room => {
      try {
        // Use lean() to get a plain JavaScript object and handle the transform manually
        const roomObj = room.toObject();
        
        // Safely transform main document IDs
        return {
          _id: roomObj._id?.toString() || null,
          userId: roomObj.userId?.toString() || null,
          businessId: roomObj.businessId?.toString() || null,
          status: roomObj.status || null,
          messages: Array.isArray(roomObj.messages) ? roomObj.messages.map((msg: {
            _id?: any;
            senderId?: any;
            chatRoomId?: any;
            image?: {
              url?: string;
              type?: string;
              size?: number;
            };
            createdAt?: Date;
            updatedAt?: Date;
            [key: string]: any;
          }) => ({
            ...msg,
            _id: msg._id?.toString() || null,
            senderId: msg.senderId?.toString() || null,
            chatRoomId: msg.chatRoomId?.toString() || null,
            image: msg.image ? {
              url: msg.image.url || '',
              type: msg.image.type || '',
              size: msg.image.size || 0
            } : null,
            createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : null,
            updatedAt: msg.updatedAt ? new Date(msg.updatedAt).toISOString() : null
          })) : [],
          appointments: Array.isArray(roomObj.appointments) ? roomObj.appointments.map((apt: {
            _id?: any;
            appointment_id?: any;
            user_id?: any;
            business_id?: any;
            date?: Date;
            createdAt?: Date;
            updatedAt?: Date;
            [key: string]: any;
          }) => ({
            ...apt,
            _id: apt._id?.toString() || null,
            appointment_id: apt.appointment_id?.toString() || null,
            user_id: apt.user_id?.toString() || null,
            business_id: apt.business_id?.toString() || null,
            date: apt.date ? new Date(apt.date).toISOString() : null,
            createdAt: apt.createdAt ? new Date(apt.createdAt).toISOString() : null,
            updatedAt: apt.updatedAt ? new Date(apt.updatedAt).toISOString() : null
          })) : [],
          createdAt: roomObj.createdAt ? new Date(roomObj.createdAt).toISOString() : null,
          updatedAt: roomObj.updatedAt ? new Date(roomObj.updatedAt).toISOString() : null
        };
      } catch (transformError) {
        console.error('Error transforming chat room:', transformError);
        // Return a safe default object if transform fails
        return {
          _id: null,
          userId: null,
          businessId: null,
          status: null,
          messages: [],
          appointments: [],
          createdAt: null,
          updatedAt: null
        };
      }
    });

    return NextResponse.json(transformedRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 