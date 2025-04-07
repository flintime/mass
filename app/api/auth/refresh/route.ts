import { NextResponse } from 'next/server';
import { verify, sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the existing token
      const decoded = verify(token, JWT_SECRET) as { 
        userId?: string; 
        businessId?: string; 
        email?: string; 
        type?: string 
      };
      
      // Determine if this is a user or business token
      const payload = {
        ...(decoded.userId && { userId: decoded.userId }),
        ...(decoded.businessId && { businessId: decoded.businessId }),
        email: decoded.email,
        type: decoded.type || (decoded.userId ? 'user' : 'business')
      };

      console.log('Refreshing token for:', {
        type: payload.type,
        id: payload.userId || payload.businessId
      });

      // Generate a new token with a fresh expiration
      const newToken = sign(
        payload,
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return NextResponse.json({ token: newToken });
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
} 