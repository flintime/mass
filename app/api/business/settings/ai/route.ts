import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface IBusiness {
  _id: string;
  business_name: string;
  email: string;
  isAIEnabled?: boolean;
  [key: string]: any;
}

// Define Business model schema
const businessSchema = new mongoose.Schema({
  business_name: String,
  email: String,
  isAIEnabled: Boolean
}, { 
  strict: false,
  timestamps: true 
});

// Get the Business model
const Business = mongoose.models.Business || mongoose.model<IBusiness>('Business', businessSchema);

async function getBusinessFromToken(): Promise<string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('businessAuthToken')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token, JWT_SECRET) as { businessId: string };
    return decoded.businessId;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    console.log('Database connected for GET request');

    // Get the URL to extract query parameters
    const url = new URL(request.url);
    const businessIdParam = url.searchParams.get('businessId');
    
    // Try to get businessId from different sources
    let businessId = await getBusinessFromToken();
    
    // If no token found, use the businessId from URL parameter
    if (!businessId && businessIdParam) {
      console.log('No auth token found, using businessId from URL parameter:', businessIdParam);
      businessId = businessIdParam;
    }
    
    // Return error if no business ID was found from any source
    if (!businessId) {
      console.log('No business ID found from token or URL parameters');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get business by ID using direct MongoDB query
    const db = mongoose.connection.db;
    if (!db) {
      console.error('Database connection failed - db object is undefined');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const business = await db.collection('businesses').findOne(
      { _id: new mongoose.Types.ObjectId(businessId) }
    );

    if (!business) {
      console.log('Business not found for ID:', businessId);
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    console.log('Found business:', { 
      id: businessId, 
      isAIEnabled: business.isAIEnabled,
      allFields: Object.keys(business)
    });
    
    return NextResponse.json({ isAIEnabled: business.isAIEnabled ?? true });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    console.log('Database connected for PUT request');

    const businessId = await getBusinessFromToken();
    if (!businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { isAIEnabled } = body;

    console.log('Updating AI settings:', { businessId, isAIEnabled });

    if (typeof isAIEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const db = mongoose.connection.db;
    if (!db) {
      console.error('Database connection failed - db object is undefined');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const businessesCollection = db.collection('businesses');

    // First, remove the existing field
    console.log('Removing existing isAIEnabled field...');
    const unsetResult = await businessesCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(businessId) },
      { $unset: { isAIEnabled: "" } }
    );
    console.log('Unset result:', unsetResult);

    // Then, set the new value
    console.log('Setting new isAIEnabled value...');
    const setResult = await businessesCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(businessId) },
      { $set: { isAIEnabled } }
    );
    console.log('Set result:', setResult);

    // Fetch the updated document
    const updatedBusiness = await businessesCollection.findOne(
      { _id: new mongoose.Types.ObjectId(businessId) }
    );

    if (!updatedBusiness) {
      console.error('Business not found after update:', businessId);
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    console.log('Successfully updated business:', { 
      id: businessId, 
      isAIEnabled: updatedBusiness.isAIEnabled,
      allFields: Object.keys(updatedBusiness)
    });

    return NextResponse.json({ 
      success: true, 
      isAIEnabled: updatedBusiness.isAIEnabled 
    });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 