import { NextResponse } from 'next/server';
import { generateToken, createCsrfCookie } from '@/lib/csrf';

/**
 * Generate a new CSRF token and set it in cookies
 */
export async function GET(request: Request) {
  try {
    // Generate a new CSRF token
    const { token, expires } = generateToken();
    
    // Create a response with the token
    const response = NextResponse.json({ csrfToken: token });
    
    // Set the CSRF cookie
    response.headers.set('Set-Cookie', createCsrfCookie(token, expires));
    
    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 });
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