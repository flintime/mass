import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/models/review.model';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const reviews = await Review.find({ 
      businessId: params.id,
      status: 'approved'
    })
    .sort({ createdAt: -1 })
    .select('customerName rating comment createdAt');

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching business reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business reviews' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const body = await request.json();
    const { rating, comment, customerName, customerEmail } = body;

    // Validate required fields
    if (!rating || !comment || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new review
    const review = await Review.create({
      businessId: params.id,
      rating,
      comment,
      customerName,
      customerEmail,
      status: 'pending' // Reviews start as pending and need to be approved by the business
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
} 