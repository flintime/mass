import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Digital Ocean Spaces configuration
const spacesEndpoint = process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com';
const spacesKey = process.env.DO_SPACES_KEY;
const spacesSecret = process.env.DO_SPACES_SECRET;
const spacesBucket = process.env.DO_SPACES_BUCKET || 'flintime';
const spacesRegion = process.env.DO_SPACES_REGION || 'nyc3';

// Create S3 client for Digital Ocean Spaces
const s3Client = new S3Client({
  endpoint: `https://${spacesEndpoint}`,
  region: spacesRegion,
  credentials: {
    accessKeyId: spacesKey || '',
    secretAccessKey: spacesSecret || '',
  },
});

/**
 * Upload a file to Digital Ocean Spaces
 * @param file - The file buffer to upload
 * @param fileName - The name to give the file in the space
 * @param contentType - The MIME type of the file
 * @returns The URL of the uploaded file
 */
export async function uploadToSpaces(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    // Define the path within the bucket - organizing by reviews folder
    const key = `reviews/${fileName}`;

    // Upload the file to Spaces
    const command = new PutObjectCommand({
      Bucket: spacesBucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read', // Make the file publicly accessible
    });

    await s3Client.send(command);

    // Return the public URL
    return `https://${spacesBucket}.${spacesEndpoint}/${key}`;
  } catch (error) {
    console.error('Error uploading to Spaces:', error);
    throw new Error('Failed to upload file to Digital Ocean Spaces');
  }
}

/**
 * Delete a file from Digital Ocean Spaces
 * @param fileUrl - The full URL of the file to delete
 */
export async function deleteFromSpaces(fileUrl: string): Promise<void> {
  try {
    // Extract the key from the URL
    const urlObj = new URL(fileUrl);
    const key = urlObj.pathname.substring(1); // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: spacesBucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from Spaces:', error);
    throw new Error('Failed to delete file from Digital Ocean Spaces');
  }
}

/**
 * Generate a pre-signed URL for uploading a file directly to Spaces
 * @param fileName - The name to give the file in the space
 * @param contentType - The MIME type of the file
 * @param expiresIn - How long the URL should be valid for (in seconds)
 * @returns A pre-signed URL for uploading
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  try {
    const key = `reviews/${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: spacesBucket,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw new Error('Failed to generate pre-signed URL');
  }
} 