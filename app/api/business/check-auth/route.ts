import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/config';

export async function GET(request: Request) {
  try {
    // Get the token from cookies
    const token = cookies().get('businessAuthToken')?.value;
    console.log('Check-auth API called, token present:', !!token);
    
    if (!token) {
      console.log('No token found in cookies');
      return NextResponse.json({ 
        authenticated: false,
        message: 'No authentication token found'
      });
    }
    
    // Try to verify the token
    try {
      const decoded = verify(token, JWT_SECRET);
      
      // Token is valid
      console.log('Token is valid:', decoded);
      return NextResponse.json({ 
        authenticated: true,
        message: 'Token is valid',
        tokenData: {
          id: (decoded as any).id,
          exp: (decoded as any).exp
        }
      });
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return NextResponse.json({ 
        authenticated: false,
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    console.error('Error in check-auth API:', error);
    return NextResponse.json({ 
      authenticated: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
} 