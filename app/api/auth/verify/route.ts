import { NextResponse } from 'next/server';
import { verify as verifyJwt } from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { JWT_SECRET } from '@/lib/config';

export async function GET(request: Request) {
  try {
    console.log('Verifying authentication...');
    
    // Check for token in Authorization header
    const authHeader = request.headers.get('Authorization');
    let token: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Token found in Authorization header');
    }
    
    // If no token in header, check cookies
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('authToken='));
        if (authCookie) {
          token = authCookie.split('=')[1];
          console.log('Token found in cookies');
        }
      }
    }
    
    // If still no token, authentication fails
    if (!token) {
      console.log('No authentication token found');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify the token
    try {
      const decoded = verifyJwt(token, JWT_SECRET) as { 
        userId?: string; 
        email?: string;
        type?: string;
        exp?: number;
      };
      
      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.log('Token expired');
        return NextResponse.json(
          { success: false, error: 'Token expired' },
          { status: 401 }
        );
      }
      
      // Ensure we have a user ID
      if (!decoded.userId) {
        console.log('Invalid token - no userId');
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
      
      // Verify the user exists in the database
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(decoded.userId) 
      });
      
      if (!user) {
        console.log('User not found in database');
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 401 }
        );
      }
      
      // Authentication successful
      console.log('Authentication successful for user:', decoded.userId);
      return NextResponse.json({
        success: true,
        user: {
          id: decoded.userId,
          email: decoded.email
        }
      });
      
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 