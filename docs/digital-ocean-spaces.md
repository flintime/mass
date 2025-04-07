# Digital Ocean Spaces Integration for Review Images

This document outlines how review images are stored and managed using Digital Ocean Spaces in the Flintime application.

## Overview

Instead of storing images locally on the server, we use Digital Ocean Spaces (an S3-compatible object storage service) to store review images. This provides several benefits:

- Scalable storage that can handle large numbers of images
- CDN capabilities for faster image loading
- Reduced load on the application server
- Better reliability and availability

## Configuration

The Digital Ocean Spaces integration is configured using environment variables:

```
SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
SPACES_KEY=your_spaces_key
SPACES_SECRET=your_spaces_secret
SPACES_BUCKET=flintime
SPACES_REGION=nyc3
```

These values should be set in the `.env` file.

## Implementation Details

### 1. Spaces Utility Module

The `lib/spaces.ts` file contains utility functions for interacting with Digital Ocean Spaces:

- `uploadToSpaces`: Uploads a file to Spaces and returns the public URL
- `deleteFromSpaces`: Deletes a file from Spaces
- `getPresignedUploadUrl`: Generates a pre-signed URL for direct uploads

### 2. Review Form Component

The `app/components/reviews/ReviewForm.tsx` component allows users to:

- Upload up to 3 images per review
- Preview images before submission
- Remove images if needed
- View existing review images

### 3. API Routes

The API routes in `app/api/reviews/[businessId]/route.ts` handle:

- Processing image uploads from the form
- Uploading images to Digital Ocean Spaces
- Storing image URLs in the review data

### 4. Backend Model

The backend model in `backend/src/models/review.model.ts` includes an `images` field to store the URLs of uploaded images.

### 5. Image Display

Review images are displayed in:

- The review section of the service details page
- The user's own review when viewing or editing it

A modal component (`app/components/reviews/ImageModal.tsx`) is used to display full-size images when clicked.

## Usage Flow

1. User selects images when writing a review
2. Images are sent to the API route as part of a FormData object
3. The API route uploads each image to Digital Ocean Spaces
4. The Spaces URLs are stored in the review data
5. When displaying reviews, the images are fetched from Spaces URLs

## Security Considerations

- Images are stored with public read access to allow easy display
- Unique filenames are generated using UUID to prevent collisions
- The upload credentials are kept secure on the server side 