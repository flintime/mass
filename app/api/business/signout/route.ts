import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    console.log('Business signout API route called');
    
    // Clear all authentication cookies
    cookies().delete('businessAuthToken');
    cookies().delete('businessAuthTokenClient');
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Signed out successfully'
    });
    
    // Also clear in response for redundancy
    response.cookies.delete('businessAuthToken');
    response.cookies.delete('businessAuthTokenClient');
    
    console.log('All authentication cookies cleared');
    
    return response;
  } catch (error: any) {
    console.error('Error during business signout:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
} 