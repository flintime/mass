import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import Business from '@/app/models/business.model';
import connectToDatabase from '@/lib/db';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('businessAuthToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get business ID from token
    const response = await fetch(`${BACKEND_URL}/api/business/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to authenticate' },
        { status: 401 }
      );
    }

    const { business } = await response.json();
    const businessId = business._id;

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Process each file
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const filename = `${uuidv4()}-${file.name}`;
        const filepath = join(UPLOAD_DIR, filename);

        // Save file
        await writeFile(filepath, buffer);

        // Return the URL
        return {
          url: `/uploads/${filename}`
        };
      })
    );

    // Update business document with new images
    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      {
        $push: {
          images: {
            $each: uploadedImages
          }
        }
      },
      { new: true }
    );

    return NextResponse.json({
      images: uploadedImages,
      business: updatedBusiness
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('businessAuthToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Get business ID from token
    const response = await fetch(`${BACKEND_URL}/api/business/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to authenticate' },
        { status: 401 }
      );
    }

    const { business } = await response.json();
    const businessId = business._id;

    // Update business document to remove the image
    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      {
        $pull: {
          images: { url: imageUrl }
        }
      },
      { new: true }
    );

    return NextResponse.json({
      business: updatedBusiness
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
} 