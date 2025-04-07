import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    try {
      const decoded = verify(token, JWT_SECRET) as { email: string };

      // TODO: Add your database logic here to update user's password
      // This is a placeholder implementation
      console.log('Updating password for email:', decoded.email);

      return NextResponse.json({
        message: 'Password updated successfully'
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 