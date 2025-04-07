import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import sharp from 'sharp';

// Get Spaces credentials from environment variables
const spacesKey = process.env.DO_SPACES_KEY;
const spacesSecret = process.env.DO_SPACES_SECRET;
const spacesRegion = process.env.DO_SPACES_REGION || 'nyc3';
const spacesBucket = process.env.DO_SPACES_BUCKET;
const spacesEndpoint = process.env.DO_SPACES_ENDPOINT || `${spacesRegion}.digitaloceanspaces.com`;
const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT;

// Log environment variables (without sensitive values)
console.log('Environment check:', {
  hasSpacesKey: !!spacesKey,
  hasSpacesSecret: !!spacesSecret,
  spacesRegion,
  spacesBucket,
  spacesEndpoint,
  hasCdnEndpoint: !!cdnEndpoint,
  hasJwtSecret: !!process.env.JWT_SECRET
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Initialize S3 client for DigitalOcean Spaces
let s3Client: S3Client;
try {
  if (!spacesKey || !spacesSecret) {
    console.error('Missing DigitalOcean Spaces credentials');
    throw new Error('Spaces configuration incomplete');
  }

  if (!spacesBucket) {
    console.error('Missing Space bucket name');
    throw new Error('Spaces configuration incomplete');
  }

  console.log('Initializing Spaces client with endpoint:', `https://${spacesEndpoint}`);

  s3Client = new S3Client({
    endpoint: `https://${spacesEndpoint}`,
    region: spacesRegion,
    credentials: {
      accessKeyId: spacesKey,
      secretAccessKey: spacesSecret
    },
    forcePathStyle: false
  });
} catch (error) {
  console.error('Error initializing Spaces client:', error);
  throw error;
}

async function getUserFromToken(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    // Check both possible token names
    const token = cookieStore.get('businessAuthToken')?.value || cookieStore.get('authToken')?.value;

    if (!token) {
      console.log('No auth token found in cookies');
      return null;
    }

    const decoded = verify(token, JWT_SECRET) as { userId?: string; businessId?: string };
    console.log('Token decoded:', { hasUserId: !!decoded.userId, hasBusinessId: !!decoded.businessId });
    
    const id = decoded.userId || decoded.businessId;
    if (!id) {
      console.log('No user/business ID found in token:', decoded);
      return null;
    }

    return id;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

async function optimizeImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  try {
    let sharpInstance = sharp(buffer);

    // Resize if image is too large (max width 2000px)
    const metadata = await sharpInstance.metadata();
    if (metadata.width && metadata.width > 2000) {
      sharpInstance = sharpInstance.resize(2000, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Optimize based on image type
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return sharpInstance.jpeg({ quality: 80 }).toBuffer();
    } else if (mimeType === 'image/png') {
      return sharpInstance.png({ compressionLevel: 9 }).toBuffer();
    } else if (mimeType === 'image/webp') {
      return sharpInstance.webp({ quality: 80 }).toBuffer();
    }

    // Default fallback
    return buffer;
  } catch (error) {
    console.error('Image optimization error:', error);
    return buffer; // Return original buffer if optimization fails
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting image upload process...');

    // Verify authentication
    const userId = await getUserFromToken();
    if (!userId) {
      console.log('Authentication failed - no valid user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get and validate form data
    const formData = await request.formData();
    const file = formData.get('image');
    const type = formData.get('type');

    console.log('Received upload request:', {
      hasFile: !!file,
      fileType: file instanceof File ? file.type : 'not a file',
      fileSize: file instanceof File ? file.size : 0,
      type,
      userId
    });

    if (!file || !(file instanceof File)) {
      console.log('No valid file provided');
      return NextResponse.json({ error: 'No valid file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      console.log('File too large:', file.size);
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.type.split('/')[1];
    const fileName = `chat/${userId}/${uuidv4()}.${fileExtension}`;

    // Convert File to Buffer and optimize
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    
    console.log('Optimizing image...');
    const optimizedBuffer = await optimizeImage(originalBuffer, file.type);
    console.log('Image optimization complete:', {
      originalSize: originalBuffer.length,
      optimizedSize: optimizedBuffer.length,
      reduction: `${((originalBuffer.length - optimizedBuffer.length) / originalBuffer.length * 100).toFixed(1)}%`
    });

    // Upload to DigitalOcean Spaces
    const command = new PutObjectCommand({
      Bucket: spacesBucket,
      Key: fileName,
      Body: optimizedBuffer,
      ContentType: file.type,
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000' // Cache for 1 year
    });

    console.log('Sending file to DigitalOcean Spaces...');
    try {
      await s3Client.send(command);
    } catch (uploadError) {
      console.error('Specific upload error:', {
        error: uploadError,
        message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        name: uploadError instanceof Error ? uploadError.name : 'Unknown',
        stack: uploadError instanceof Error ? uploadError.stack : undefined
      });
      throw uploadError;
    }

    // Generate the URL using CDN if available
    const url = cdnEndpoint 
      ? `https://${cdnEndpoint}/${fileName}`
      : `https://${spacesBucket}.${spacesEndpoint}/${fileName}`;
    
    console.log('File uploaded successfully:', { url });

    return NextResponse.json({ 
      url,
      type: file.type,
      size: optimizedBuffer.length
    });
  } catch (error) {
    console.error('Error in image upload:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // More detailed error response
    let statusCode = 500;
    let errorMessage = 'Failed to upload image';

    if (error instanceof Error) {
      // Handle specific DigitalOcean Spaces errors
      if (error.message.includes('NoSuchBucket')) {
        errorMessage = 'Storage configuration error - bucket not found';
      } else if (error.message.includes('InvalidAccessKeyId')) {
        errorMessage = 'Storage configuration error - invalid access key';
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        errorMessage = 'Storage configuration error - invalid secret key';
      } else if (error.message.includes('credentials')) {
        errorMessage = 'Storage configuration error - invalid credentials';
      } else if (error.message.includes('Unauthorized')) {
        statusCode = 401;
        errorMessage = 'Authentication failed';
      }
      
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        statusCode,
        errorMessage
      });
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 