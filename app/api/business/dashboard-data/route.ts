import { NextRequest, NextResponse } from 'next/server';
import { requireSubscription } from '@/lib/api-subscription';
import { validateToken } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    // Check for CSRF token on sensitive data endpoints
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      return NextResponse.json({ error: 'Your session appears to be invalid. Please refresh the page and try again.' }, { status: 403 });
    }

    // Get cookies from the request and convert to the right format
    const cookieHeader = request.headers.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      return NextResponse.json({ error: 'Your session has expired or is invalid. Please refresh the page and try again.' }, { status: 403 });
    }
    
    // Check for business authentication token
    const businessAuthToken = request.cookies.get('businessAuthToken');
    if (!businessAuthToken || !businessAuthToken.value) {
      return NextResponse.json({ error: 'You are not logged in. Please sign in to access this data.' }, { status: 401 });
    }
    
    // Normally we would decode the token and get the business ID
    // For simplicity in this example, we'll just check that a token exists
    const businessId = 'demo-business-id';
    
    // Check for active subscription (simplified)
    const subscriptionCheck = await requireSubscription(request, businessId);
    if (subscriptionCheck) return subscriptionCheck;
    
    // If we reach here, the business has an active subscription
    // Return dashboard data
    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          views: 2547,
          interactions: 432,
          conversions: 89,
          revenue: 6520
        },
        recentBookings: [
          {
            id: 'bk-123',
            customerName: 'John Smith',
            service: 'Haircut',
            date: new Date().toISOString(),
            status: 'confirmed'
          },
          {
            id: 'bk-124',
            customerName: 'Emma Johnson',
            service: 'Coloring',
            date: new Date(Date.now() + 86400000).toISOString(),
            status: 'pending'
          }
        ],
        notifications: [
          {
            id: 'not-1',
            type: 'booking',
            message: 'New booking request from Sarah Wilson',
            createdAt: new Date().toISOString()
          },
          {
            id: 'not-2',
            type: 'review',
            message: 'New 5-star review from Michael Brown',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 