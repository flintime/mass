import { NextRequest, NextResponse } from 'next/server';
import { ChatRoom } from '@/models/chat';
import { Booking } from '@/models/booking';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Define a local verifyToken function since it's not exported from @/lib/auth
async function verifyToken(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Authorization header missing or invalid' };
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; businessId?: string; type?: string };
    
    if (!decoded || !decoded.type) {
      return { success: false, error: 'Invalid token' };
    }

    return { 
      success: true, 
      type: decoded.type,
      userId: decoded.userId,
      businessId: decoded.businessId
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { success: false, error: 'Token verification failed' };
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { appointmentId, chatRoomId, status, message } = await req.json();

    if (!appointmentId || !chatRoomId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['confirmed', 'declined'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Verify business authentication
    const authResult = await verifyToken(req);
    if (!authResult.success || authResult.type !== 'business') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update appointment status in ChatRoom
    const chatRoom = await ChatRoom.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(chatRoomId),
        'appointments.appointment_id': new mongoose.Types.ObjectId(appointmentId),
        businessId: new mongoose.Types.ObjectId(authResult.businessId)
      },
      {
        $set: {
          'appointments.$.status': status,
          'appointments.$.updatedAt': new Date()
        },
        $push: {
          messages: {
            _id: new mongoose.Types.ObjectId(),
            content: message || `Appointment ${status}`,
            senderId: authResult.businessId,
            senderType: 'BUSINESS',
            chatRoomId: chatRoomId,
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!chatRoom) {
      return NextResponse.json(
        { error: 'Appointment not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update booking status
    await Booking.findOneAndUpdate(
      {
        businessId: authResult.businessId,
        'appointment_id': new mongoose.Types.ObjectId(appointmentId)
      },
      {
        $set: {
          status: status === 'declined' ? 'canceled' : status
        }
      }
    );

    // Send notification to user
    const notification = {
      type: 'appointment_update',
      userId: chatRoom.userId,
      appointmentId,
      status,
      message: message || `Appointment ${status}`
    };

    // Emit socket event
    if (global.io) {
      global.io.to(`user_${chatRoom.userId}`).emit('appointment_update', notification);
    }

    return NextResponse.json({
      success: true,
      message: `Appointment ${status}`,
      chatRoom
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment status' },
      { status: 500 }
    );
  }
} 