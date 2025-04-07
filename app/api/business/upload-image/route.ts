import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { IBusiness, Business } from '@/models/Business';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { validateToken } from '@/lib/csrf';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Initialize S3 client for Digital Ocean Spaces
const s3Client = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  region: process.env.DO_SPACES_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || ''
  }
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface DecodedToken {
  businessId: string;
  [key: string]: any;
}

interface IImage {
  access: string;
  path: string;
  name: string;
  type: string;
  size: number;
  mime: string;
  meta: {
    width: number;
    height: number;
  };
  url: string;
}

async function verifyToken(token: string): Promise<DecodedToken> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) reject(err);
      resolve(decoded as DecodedToken);
    });
  });
}

async function validateImage(file: File) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`File type must be one of: ${ALLOWED_FILE_TYPES.join(', ')}`);
  }

  return true;
}

async function uploadToSpaces(file: File, businessId: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create a unique filename
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop();
  const filename = `business-${businessId}/${timestamp}-${uniqueId}.${extension}`;

  // Upload to Digital Ocean Spaces
  const command = new PutObjectCommand({
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: filename,
    Body: buffer,
    ACL: 'public-read',
    ContentType: file.type
  });

  await s3Client.send(command);

  // Return the public URL
  const imageUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${filename}`;

  return imageUrl;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const headersList = headers();
    const token = headersList.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token is required' },
        { status: 401 }
      );
    }

    // 2. CSRF Validation
    const csrfToken = headersList.get('x-csrf-token');
    if (!csrfToken) {
      return NextResponse.json(
        { error: 'Your session appears to be invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Get cookies from the request and validate CSRF token
    const cookieHeader = headersList.get('cookie');
    if (!validateToken(csrfToken, cookieHeader || '')) {
      return NextResponse.json(
        { error: 'Your session has expired or is invalid. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // 3. Token Verification
    let decoded: DecodedToken;
    try {
      decoded = await verifyToken(token);
      if (!decoded.businessId) {
        throw new Error('Invalid token payload');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // 4. Get and validate file
    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // 5. Validate image
    try {
      await validateImage(file);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid image' },
        { status: 400 }
      );
    }

    // 6. Upload to Digital Ocean Spaces
    const imageUrl = await uploadToSpaces(file, decoded.businessId);

    // 7. Update business profile with new image URL
    await mongoose.connect(process.env.MONGODB_URI as string);
    const business = await Business.findById(decoded.businessId);
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Create the image object
    const imageData: IImage = {
      access: 'public',
      path: imageUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      mime: file.type,
      meta: {
        width: 0, // These would need to be determined from the actual image
        height: 0
      },
      url: imageUrl
    };

    // Add the new image to the existing images array
    if (!business.images) {
      business.images = [imageData];
    } else {
      business.images.push(imageData);
    }
    
    await business.save();

    return NextResponse.json({
      success: true,
      url: imageUrl
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
} 