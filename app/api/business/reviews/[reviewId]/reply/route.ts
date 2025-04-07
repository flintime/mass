import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(
  request: Request,
  { params }: { params: { reviewId: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('businessAuthToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reply } = body;

    if (!reply?.trim()) {
      return NextResponse.json(
        { error: 'Reply text is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/reviews/${params.reviewId}/reply`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error response:', errorData);
      try {
        const jsonError = JSON.parse(errorData);
        return NextResponse.json(jsonError, { status: response.status });
      } catch {
        return NextResponse.json(
          { error: 'Backend error: ' + errorData },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error replying to review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review reply' },
      { status: 500 }
    );
  }
}