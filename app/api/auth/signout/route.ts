import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withRateLimit } from '@/app/lib/rate-limit';

async function signoutHandler() {
  try {
    console.log('User signout API route called');
    
    // Clear the authentication cookie
    cookies().delete({
      name: 'authToken',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Signed out successfully'
    });
    
    // Also clear in response for redundancy (with all necessary parameters)
    response.cookies.delete({
      name: 'authToken',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Clear any other session-related cookies
    cookies().getAll().forEach(cookie => {
      if (cookie.name.includes('session') || cookie.name.includes('auth')) {
        cookies().delete({
          name: cookie.name,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        
        response.cookies.delete({
          name: cookie.name,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
    });
    
    console.log('Authentication cookies cleared');
    
    return response;
  } catch (error) {
    console.error('Error during user signout:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during sign out.' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to signout endpoint
export const POST = withRateLimit(signoutHandler, 'API'); 