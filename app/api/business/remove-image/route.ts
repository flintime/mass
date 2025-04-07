import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, spacesBucket } from '@/lib/spaces-config';
import { Business, IBusiness } from '@/models/Business';
import mongoose from 'mongoose';
import { validateToken } from '@/lib/csrf';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

function getKeyFromUrl(url: string): string | null {
  try {
    // Handle both CDN and regular Space URLs
    const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT || '';
    const regularEndpoint = `${spacesBucket}.${process.env.DO_SPACES_ENDPOINT}`;
    
    let key: string | null = null;
    
    if (url.includes(cdnEndpoint)) {
      key = url.split(cdnEndpoint + '/')[1];
    } else if (url.includes(regularEndpoint)) {
      key = url.split(regularEndpoint + '/')[1];
    }
    
    if (!key) {
      throw new Error('Invalid image URL format');
    }
    
    return key;
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
}

export async function DELETE(request: Request) {
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

    // 4. Get image URL from request body
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // 5. Extract the key from the URL
    const key = getKeyFromUrl(imageUrl);
    if (!key) {
      return NextResponse.json(
        { error: 'Invalid image URL format' },
        { status: 400 }
      );
    }

    // 6. Delete from Digital Ocean Spaces
    const deleteCommand = new DeleteObjectCommand({
      Bucket: spacesBucket,
      Key: key
    });

    await s3Client.send(deleteCommand);

    // 7. Update business profile
    await mongoose.connect(process.env.MONGODB_URI as string);
    const business = await Business.findById(decoded.businessId);
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Remove the image from the array if it matches the URL
    if (business.images) {
      business.images = business.images.filter(img => img.url !== imageUrl);
      await business.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Image removed successfully'
    });

  } catch (error) {
    console.error('Error removing image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove image' },
      { status: 500 }
    );
  }
} 