import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Initialize S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  region: process.env.DO_SPACES_REGION || 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || ''
  },
  forcePathStyle: false // Required for DigitalOcean Spaces
});

async function verifyAuth(req: NextRequest): Promise<{ id: string; type: string } | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verify(token, JWT_SECRET) as { userId?: string; businessId?: string; type?: string };

    // Handle both user and business tokens
    if (decoded.userId) {
      console.log('Verified user token:', { userId: decoded.userId });
      return { id: decoded.userId, type: 'user' };
    } else if (decoded.businessId) {
      console.log('Verified business token:', { businessId: decoded.businessId });
      return { id: decoded.businessId, type: 'business' };
    }

    console.log('Token missing required claims:', decoded);
    return null;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Upload request from:', {
      type: auth.type,
      id: auth.id
    });

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      console.log('No file provided in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('File too large:', file.size);
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    try {
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate a unique filename with auth type prefix and current timestamp
      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${auth.type}/${auth.id}/${timestamp}_${nanoid()}_${safeFileName}`;
      
      console.log('Generated filename:', filename);

      // Upload to DigitalOcean Spaces
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read', // Make the file publicly accessible
        CacheControl: 'public, max-age=31536000' // Cache for 1 year
      });

      console.log('Uploading with config:', {
        bucket: process.env.DO_SPACES_BUCKET,
        endpoint: process.env.DO_SPACES_ENDPOINT,
        region: process.env.DO_SPACES_REGION
      });

      await s3Client.send(uploadCommand);

      // Construct the CDN URL
      const cdnUrl = `https://${process.env.DO_SPACES_CDN_ENDPOINT}/${filename}`;
      console.log('Upload successful, CDN URL:', cdnUrl);

      return NextResponse.json({ url: cdnUrl });
    } catch (uploadError: any) {
      console.error('DigitalOcean Spaces upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload to storage: ${uploadError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Failed to upload file: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 