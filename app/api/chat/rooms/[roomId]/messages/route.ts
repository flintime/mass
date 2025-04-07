import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { SenderType } from '@/app/models/chat.model';
import { ChatRoom } from '@/app/models/chat.model';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

// Define getUserFromToken locally since it's not exported from @/lib/auth
async function getUserFromToken(req?: Request): Promise<{ userId: string } | null> {
  try {
    // Get token from Authorization header
    const authHeader = req?.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return null;
    }

    // Verify the token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return { userId: decoded.userId };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function POST(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const chatRoom = await ChatRoom.findOne({
      _id: new ObjectId(params.roomId),
      userId: user.userId
    });

    if (!chatRoom) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      );
    }

    const message = {
      _id: new ObjectId(),
      content: content.trim(),
      senderId: user.userId,
      senderType: SenderType.USER,
      chatRoomId: params.roomId,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await ChatRoom.updateOne(
      { _id: new ObjectId(params.roomId) },
      {
        $push: { messages: message },
        $set: { lastActivity: new Date() }
      }
    );

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 