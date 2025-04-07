import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';

declare global {
  var io: SocketServer | undefined;
}

// Create Socket.IO server if it doesn't exist
let io: SocketServer;

if (!global.io) {
  const httpServer = createServer();
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST']
    }
  });
  global.io = io;
} else {
  io = global.io;
}

export async function POST(req: NextRequest) {
  try {
    const { type, businessId, appointment, customerDetails } = await req.json();

    if (type !== 'new_appointment') {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Emit socket event to business room
    io.to(`business_${businessId}`).emit('new_appointment', {
      appointment,
      customerDetails
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending socket notification:', error);
    return NextResponse.json(
      { error: 'Failed to send socket notification' },
      { status: 500 }
    );
  }
} 