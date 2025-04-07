import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Add routes that require authentication
const protectedRoutes = ['/dashboard']
const businessProtectedRoutes = [
  '/business/dashboard',
  '/business/services',
  '/business/profile',
  '/business/settings'
]

// Add routes that are only accessible to non-authenticated users
const authRoutes = ['/signin', '/signup']
const businessAuthRoutes = ['/business/signin', '/business/signup']

// Add this function to handle ObjectId to unique_id redirects
async function handleObjectIdRedirects(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;
  
  // Skip API routes
  if (path.startsWith('/api/')) {
    return null;
  }
  
  // Check if this is a service page with an ObjectId
  // Support both /services/ID and direct /ID paths
  const isServicePath = path.startsWith('/services/');
  const isDirectPath = !isServicePath && !path.includes('/') && /^[0-9a-fA-F]{24}$/.test(path);
  
  if (isServicePath && /^\/services\/[0-9a-fA-F]{24}$/.test(path)) {
    try {
      // Extract the ObjectId from the URL
      const objectId = path.split('/').pop();
      
      console.log(`Middleware processing potential ObjectId from services path: ${objectId}`);
      
      // Try to fetch the business
      const apiUrl = `${url.origin}/api/business/${objectId}`;
      console.log(`Fetching business data from: ${apiUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`API returned error status: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      // If the business has a unique_id, redirect to it
      if (data.business && data.business.unique_id) {
        console.log(`Redirecting from ObjectId ${objectId} to unique_id ${data.business.unique_id}`);
        // Redirect to root-level unique_id
        const newUrl = url.origin + '/' + data.business.unique_id;
        return NextResponse.redirect(newUrl);
      } else {
        console.log(`Business found but no unique_id available for: ${objectId}`);
      }
    } catch (error) {
      console.error('Error in ObjectId redirect middleware:', error);
    }
  } else if (isDirectPath) {
    // This is a direct ObjectId in the URL root
    const objectId = path.substring(1); // Remove leading slash
    
    try {
      console.log(`Middleware processing potential ObjectId from direct path: ${objectId}`);
      
      // Try to fetch the business
      const apiUrl = `${url.origin}/api/business/${objectId}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`API returned error status: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      // If the business has a unique_id, redirect to it
      if (data.business && data.business.unique_id) {
        console.log(`Redirecting from direct ObjectId ${objectId} to unique_id ${data.business.unique_id}`);
        const newUrl = url.origin + '/' + data.business.unique_id;
        return NextResponse.redirect(newUrl);
      }
    } catch (error) {
      console.error('Error in direct ObjectId redirect middleware:', error);
    }
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const currentUser = request.cookies.get('authToken')
  const currentBusiness = request.cookies.get('businessAuthToken')
  const { pathname } = request.nextUrl

  // Check if user is trying to access auth pages while logged in
  if (currentUser && authRoutes.some(route => pathname.startsWith(route))) {
    const searchParams = new URL(request.url).searchParams;
    const returnUrl = searchParams.get('returnUrl') || '/';
    return NextResponse.redirect(new URL(returnUrl, request.url))
  }

  // Check if business is trying to access auth pages while logged in
  if (currentBusiness && businessAuthRoutes.some(route => pathname.startsWith(route))) {
    const searchParams = new URL(request.url).searchParams;
    const returnUrl = searchParams.get('returnUrl') || '/business/dashboard/chat';
    return NextResponse.redirect(new URL(returnUrl, request.url))
  }

  // Redirect non-authenticated users to signin page
  if (!currentUser && protectedRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.redirect(new URL('/signin', request.url))
    response.cookies.delete('authToken')
    return response
  }

  // Redirect non-authenticated businesses to business signin page
  if (!currentBusiness && businessProtectedRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.redirect(new URL('/business/signin', request.url))
    response.cookies.delete('businessAuthToken')
    return response
  }

  // Try to handle ObjectId to unique_id redirects
  const redirectResponse = await handleObjectIdRedirects(request);
  if (redirectResponse) {
    return redirectResponse;
  }

  // Get the response
  const response = NextResponse.next();

  // Add security headers
  const headers = response.headers;

  // Content Security Policy - Helps prevent XSS attacks
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; connect-src 'self' https://api.stripe.com https://maps.googleapis.com http://localhost:5000 https://localhost:5000 ws://localhost:5000 wss://localhost:5000 ws://localhost:* wss://localhost:* ws://127.0.0.1:* wss://127.0.0.1:*; img-src 'self' data: https://*.vercel-storage.com https://*.googleusercontent.com https://*.digitaloceanspaces.com https://*.cdn.digitaloceanspaces.com https://*.gstatic.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://js.stripe.com;"
  );

  // X-XSS-Protection - Additional XSS protection for older browsers
  headers.set('X-XSS-Protection', '1; mode=block');

  // X-Frame-Options - Protects against clickjacking attacks
  headers.set('X-Frame-Options', 'SAMEORIGIN');

  // X-Content-Type-Options - Prevents MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy - Controls how much referrer information is included
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy - Controls which features and APIs can be used
  headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );

  // Strict-Transport-Security - Enforces HTTPS
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return response;
}

// Configure the paths that middleware will run on
export const config = {
  matcher: [
    // Authentication routes
    '/dashboard/:path*',
    '/business/dashboard/:path*',
    '/business/services/:path*',
    '/business/profile/:path*',
    '/business/settings/:path*',
    '/signin',
    '/signup',
    '/business/signin',
    '/business/signup',
    '/business/signup/complete',
    // Match both service paths and direct unique_id paths
    '/services/:id*',
    '/:id', // Match root-level IDs (for unique_ids)
    // Skip static files and API routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ]
}

