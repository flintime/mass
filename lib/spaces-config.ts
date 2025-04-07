import { S3Client } from '@aws-sdk/client-s3';

// Digital Ocean Spaces Configuration
const spacesEndpoint = process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com';
const spacesRegion = process.env.DO_SPACES_REGION || 'nyc3';
const spacesBucket = process.env.DO_SPACES_BUCKET || 'flintime';

// Create S3 client for Digital Ocean Spaces
const s3Client = new S3Client({
  endpoint: `https://${spacesEndpoint}`,
  region: spacesRegion,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
});

export { s3Client, spacesBucket }; 