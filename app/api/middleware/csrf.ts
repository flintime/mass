import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateToken } from '@/lib/csrf';

/**
 * Middleware to protect routes against CSRF attacks
 * This should be called for any state-changing operations like POST, PUT, DELETE
 */
export async function csrfProtection(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Skip validation for safe methods (GET, HEAD, OPTIONS)
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (safeMethod) {
    return handler(request);
  }

  try {
    // Get the CSRF token from the request header
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      console.error('CSRF token missing in request');
      return NextResponse.json(
        { error: 'Your session appears to be invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Get the cookies from the request
    const cookies = request.cookies;
    
    // Convert RequestCookies to a format that validateToken can handle
    const cookiesObject: { [key: string]: string } = {};
    cookies.getAll().forEach(cookie => {
      cookiesObject[cookie.name] = cookie.value;
    });
    
    // Validate the token
    const isValid = validateToken(csrfToken, cookiesObject);
    if (!isValid) {
      console.error('Invalid CSRF token');
      return NextResponse.json(
        { error: 'Your session has expired or is invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Token is valid, proceed with the request
    return handler(request);
  } catch (error: any) {
    console.error('CSRF validation error:', error);
    return NextResponse.json(
      { error: 'CSRF validation failed' },
      { status: 500 }
    );
  }
} 