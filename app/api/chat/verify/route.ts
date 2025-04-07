import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('Starting token verification...');
    // Extract token from request
    const authHeader = request.headers.get('authorization');
    let token = '';

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Found token in Authorization header:', token.substring(0, 20) + '...');
    } else {
      // Try to get token from cookies
      const cookies = request.headers.get('cookie')?.split(';') || [];
      const authCookie = cookies.find(c => c.trim().startsWith('authToken='));
      if (authCookie) {
        token = authCookie.split('=')[1];
        console.log('Found token in cookies:', token.substring(0, 20) + '...');
      }
    }

    if (!token) {
      console.log('No token found in headers or cookies');
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      );
    }

    // Forward the token to the backend for verification
    console.log('Forwarding token to backend for verification...');
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`;
    console.log('Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Backend response status:', response.status);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to verify token' }));
      console.error('Token verification failed:', error);
      return NextResponse.json(error, { status: response.status });
    }

    const userData = await response.json();
    console.log('User data received:', { userId: userData.id, email: userData.email });
    
    return NextResponse.json({
      success: true,
      userId: userData.id,
      email: userData.email
    });
  } catch (error: any) {
    console.error('Token verification error:', error.message);
    return NextResponse.json(
      { error: `Token verification failed: ${error.message}` },
      { status: 500 }
    );
  }
} 