import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Business from '@/app/models/business.model';
import type { IBusiness } from '@/app/models/business.model';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    let business;
    const { id } = params;

    // Check if the ID is a valid MongoDB ObjectId first
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    if (isValidObjectId) {
      // If it looks like an ObjectId, try finding by _id first
      business = await Business.findById(id)
        .select('-__v')
        .lean();
      
      if (business) {
        console.log(`Business found by ObjectId: ${id}`);
        return NextResponse.json({
          business,
          metadata: { cached: false }
        });
      }
    }

    // If not found or not a valid ObjectId, try unique_id lookup
    console.log(`Trying to find business by unique_id: ${id}`);
    business = await Business.findOne({ unique_id: id })
      .select('-__v')
      .lean();

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      business,
      metadata: { cached: false }
    });
  } catch (error) {
    console.error('Error fetching business details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const body = await request.json();
    
    // Validate services if provided
    if (body.services && !Array.isArray(body.services)) {
      return NextResponse.json(
        { error: 'Services must be an array of strings' },
        { status: 400 }
      );
    }

    // Update business with all provided fields
    const updatedBusiness = await Business.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true }
    ).select('-__v').lean();

    if (!updatedBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      business: updatedBusiness,
      metadata: { updated: true }
    });
  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    );
  }
} 