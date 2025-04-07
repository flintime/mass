import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { uploadToSpaces } from '@/lib/spaces';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';

// Ensure BACKEND_URL is always defined
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Helper function to look up business by unique_id and get ObjectId
const getBusinessObjectId = async (idOrUniqueId: string) => {
  console.log(`Looking up business with ID or unique_id: ${idOrUniqueId}`);
  
  // If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(idOrUniqueId)) {
    console.log(`ID ${idOrUniqueId} is a valid ObjectId, using directly`);
    return idOrUniqueId;
  }
  
  // Try to find the business by unique_id
  try {
    await dbConnect();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    const db = mongoose.connection.db;
    const business = await db.collection('businesses').findOne({ unique_id: idOrUniqueId });
    
    if (!business) {
      console.log(`No business found with unique_id: ${idOrUniqueId}`);
      throw new Error('Business not found');
    }
    
    console.log(`Found business with unique_id: ${idOrUniqueId}, ObjectId: ${business._id}`);
    return business._id.toString();
  } catch (error) {
    console.error(`Error looking up business by unique_id: ${idOrUniqueId}`, error);
    throw new Error('Failed to find business');
  }
};

export async function GET(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    if (!BACKEND_URL) {
      throw new Error('Backend URL is not configured');
    }
    
    // Convert unique_id to ObjectId if needed
    let businessObjectId;
    try {
      businessObjectId = await getBusinessObjectId(params.businessId);
    } catch (error) {
      console.error(`Error getting business ObjectId: ${error}`);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const apiUrl = `${BACKEND_URL}/api/reviews/${businessObjectId}`;
    console.log('Fetching reviews from:', apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error('Error response from backend:', data);
      throw new Error(data.error || 'Failed to fetch reviews');
    }

    // Return the data in the expected format for the frontend
    return NextResponse.json({
      reviews: data.reviews || [],
      averageRating: data.averageRating || 0,
      totalReviews: data.totalReviews || 0,
      averageServiceQuality: data.averageServiceQuality || 0,
      averageValueForMoney: data.averageValueForMoney || 0
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { 
        reviews: [],
        averageRating: 0,
        totalReviews: 0,
        averageServiceQuality: 0,
        averageValueForMoney: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews' 
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  let response;
  try {
    if (!BACKEND_URL) {
      throw new Error('Backend URL is not configured');
    }

    // Get the token from cookies
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const token = cookieStore.get('authToken')?.value;
    
    console.log('Debug - All cookies:', allCookies.map(c => ({ name: c.name })));
    console.log('Debug - Auth token from cookie:', token ? 'Found' : 'Not found');
    
    // Check if businessAuthToken exists but authToken doesn't
    const hasBusinessToken = !!cookieStore.get('businessAuthToken')?.value;
    if (hasBusinessToken && !token) {
      console.log('Debug - Business token found but user token missing. User may be logged in as business only.');
    }

    if (!token) {
      console.log('No auth token found in cookies');
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to submit a review.' },
        { status: 401 }
      );
    }

    // Convert unique_id to ObjectId if needed
    let businessObjectId;
    try {
      businessObjectId = await getBusinessObjectId(params.businessId);
    } catch (error) {
      console.error(`Error getting business ObjectId: ${error}`);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // First verify the token with the auth endpoint
    const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!verifyResponse.ok) {
      console.error('Token verification failed:', await verifyResponse.json());
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userData = await verifyResponse.json();
    console.log('Verified user data:', userData);

    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    let reviewData: any = {};
    let imageUrls: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with images
      const formData = await request.formData();
      
      // Extract text fields
      reviewData = {
        rating: Number(formData.get('rating')),
        comment: formData.get('comment') || '',
        customerName: formData.get('customerName'),
        customerEmail: formData.get('customerEmail'),
        userId: userData.id
      };
      
      // Process images if any
      const images = formData.getAll('reviewImages');
      
      if (images && images.length > 0) {
        // Create array to store image URLs
        const uploadedImageUrls = [];
        
        // Limit to 10 images
        const imagesToProcess = images.slice(0, 10);
        
        // Process each image
        for (const image of imagesToProcess) {
          if (image instanceof File) {
            try {
              // Generate a unique filename
              const fileName = `${uuidv4()}-${image.name.replace(/\s+/g, '-')}`;
              
              // Convert file to ArrayBuffer and then to Buffer
              const arrayBuffer = await image.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              // Upload to Digital Ocean Spaces
              const imageUrl = await uploadToSpaces(
                buffer,
                fileName,
                image.type
              );
              
              // Add the URL to the array
              uploadedImageUrls.push(imageUrl);
            } catch (error) {
              console.error('Error processing image:', error);
            }
          }
        }
        
        // Add image URLs to the review data
        imageUrls = uploadedImageUrls;
      }
    } else {
      // Handle regular JSON request
      const body = await request.json();
      reviewData = {
        ...body,
        userId: userData.id
      };
    }

    const apiUrl = `${BACKEND_URL}/api/reviews/${businessObjectId}`;
    console.log('Submitting review to:', apiUrl);
    console.log('Review data:', reviewData);
    console.log('Image URLs:', imageUrls);

    // Forward the request to the backend with the token
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...reviewData,
        images: imageUrls
      }),
    });

    const data = await response.json();
    console.log('Backend response:', { status: response.status, data });

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit review');
    }

    return NextResponse.json({
      ...data,
      images: imageUrls
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit review' },
      { status: response?.status || 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Convert unique_id to ObjectId if needed
    let businessObjectId;
    try {
      businessObjectId = await getBusinessObjectId(params.businessId);
    } catch (error) {
      console.error(`Error getting business ObjectId: ${error}`);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // First verify the token with the auth endpoint
    const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!verifyResponse.ok) {
      console.error('Token verification failed:', await verifyResponse.json());
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userData = await verifyResponse.json();
    console.log('Verified user data for update:', userData);

    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    let reviewData: any = {};
    let imageUrls: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with images
      const formData = await request.formData();
      
      // Extract text fields
      reviewData = {
        rating: Number(formData.get('rating')),
        comment: formData.get('comment') || '',
        customerName: formData.get('customerName'),
        customerEmail: formData.get('customerEmail'),
        userId: userData.id,
        serviceQualityRating: Number(formData.get('serviceQualityRating')),
        valueForMoneyRating: Number(formData.get('valueForMoneyRating'))
      };
      
      // Log the extracted rating values
      console.log('Extracted rating values from form data:', {
        rating: reviewData.rating,
        serviceQualityRating: reviewData.serviceQualityRating,
        valueForMoneyRating: reviewData.valueForMoneyRating
      });
      
      // Process images if any
      const images = formData.getAll('reviewImages');
      console.log('Processing images:', images.length, 'items');

      if (images && images.length > 0) {
        // Create array to store image URLs
        const uploadedImageUrls = [];
        
        // Limit to 10 images
        const imagesToProcess = images.slice(0, 10);
        
        // Process each image
        for (const image of imagesToProcess) {
          console.log('Processing image type:', typeof image, image instanceof File);
          
          if (image instanceof File) {
            try {
              // Generate a unique filename
              const fileName = `${uuidv4()}-${image.name.replace(/\s+/g, '-')}`;
              
              // Convert file to ArrayBuffer and then to Buffer
              const arrayBuffer = await image.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              // Upload to Digital Ocean Spaces
              const imageUrl = await uploadToSpaces(
                buffer,
                fileName,
                image.type
              );
              
              // Add the URL to the array
              uploadedImageUrls.push(imageUrl);
            } catch (error) {
              console.error('Error processing image:', error);
            }
          } else if (typeof image === 'string') {
            // This is an existing image URL, keep it
            console.log('Keeping existing image URL:', image.substring(0, 50) + '...');
            uploadedImageUrls.push(image);
          }
        }
        
        // Add image URLs to the review data
        imageUrls = uploadedImageUrls;
        console.log('Final image URLs:', imageUrls.length);
      }
    } else {
      // Handle regular JSON request
      reviewData = await request.json();
      if (reviewData.images && Array.isArray(reviewData.images)) {
        imageUrls = reviewData.images;
      }
    }

    // Get existing review to preserve images if no new ones are uploaded
    if (imageUrls.length === 0) {
      try {
        const existingReviewResponse = await fetch(
          `${BACKEND_URL}/api/reviews/${businessObjectId}/user/${userData.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (existingReviewResponse.ok) {
          const existingReviewData = await existingReviewResponse.json();
          if (existingReviewData.images && existingReviewData.images.length > 0) {
            imageUrls = existingReviewData.images;
          }
        }
      } catch (error) {
        console.error('Error fetching existing review images:', error);
      }
    }

    console.log('Updating review with data:', { 
      ...reviewData, 
      images: imageUrls,
      userId: reviewData.userId // Log the userId to verify it's being sent correctly
    });

    const response = await fetch(`${BACKEND_URL}/api/reviews/${businessObjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...reviewData,
        images: imageUrls
      })
    });

    const data = await response.json();
    console.log('Backend response:', { status: response.status, data });

    if (!response.ok) {
      console.error('Error updating review:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({
      ...data,
      images: imageUrls
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
} 