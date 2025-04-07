import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      return NextResponse.json({ hasReviewed: false });
    }

    // Verify the token and get user data
    const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!verifyResponse.ok) {
      return NextResponse.json({ hasReviewed: false });
    }

    const userData = await verifyResponse.json();

    // Check if user has already reviewed
    const response = await fetch(
      `${BACKEND_URL}/api/reviews/${params.businessId}/check`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      return NextResponse.json({ hasReviewed: false });
    }

    const data = await response.json();
    return NextResponse.json({ hasReviewed: data.hasReviewed });
  } catch (error) {
    console.error('Error checking review status:', error);
    return NextResponse.json({ hasReviewed: false });
  }
} 