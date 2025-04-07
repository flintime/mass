import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Business from '@/models/business.model';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Connect to MongoDB database
    await dbConnect();

    // Check if the business with this email already exists using MongoDB
    const existingBusiness = await Business.findOne(
      { email }, 
      { _id: 1 }
    ).lean();

    return NextResponse.json({ 
      exists: !!existingBusiness,
      // Don't return any sensitive data, just whether it exists
    });
  } catch (error) {
    console.error('Error checking business email:', error);
    return NextResponse.json(
      { error: 'Failed to check email availability' },
      { status: 500 }
    );
  }
} 