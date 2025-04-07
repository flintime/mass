import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

// This function checks if a username (unique_id) is already taken in the businesses collection
export async function GET(request: Request) {
  try {
    // Get the unique_id from the URL params
    const url = new URL(request.url);
    const uniqueId = url.searchParams.get('uniqueId');
    
    if (!uniqueId) {
      console.warn('Missing unique ID parameter in request');
      return NextResponse.json(
        { error: 'Missing unique ID parameter' },
        { status: 400 }
      );
    }
    
    console.log('Checking username availability:', uniqueId);
    const normalizedUniqueId = uniqueId.toLowerCase().trim();

    // Connect to database using the shared connection
    await dbConnect();
    console.log('Connected to database for username check');
    
    // Use the mongoose connection directly
    const db = mongoose.connection.db;
    
    // List collections to debug
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Available collections:', collectionNames);
    
    if (!collectionNames.includes('businesses')) {
      console.error('Error: businesses collection not found in the database');
      return NextResponse.json(
        { 
          available: false,
          error: 'Database schema error: businesses collection not found',
          temporary: true
        },
        { status: 200 }
      );
    }
    
    // Count total businesses for debugging
    const totalBusinesses = await db.collection('businesses').countDocuments();
    console.log(`Total businesses in collection: ${totalBusinesses}`);
    
    // If the database reports 0 businesses but we're in production,
    // something is wrong with the database connection
    if (totalBusinesses === 0 && process.env.NODE_ENV === 'production') {
      console.warn('Database reports 0 businesses in production environment - likely a connection issue');
      return NextResponse.json(
        { 
          available: false,
          error: 'Username validation service temporarily unavailable',
          temporary: true
        },
        { status: 200 }
      );
    }
    
    // Get sample businesses with unique_id for debugging
    const businessesWithUniqueId = await db.collection('businesses')
      .find({ unique_id: { $exists: true } })
      .limit(5)
      .project({ _id: 1, unique_id: 1, business_name: 1 })
      .toArray();
    
    console.log(`Found ${businessesWithUniqueId.length} sample businesses with unique_id field`);
    
    if (businessesWithUniqueId.length > 0) {
      console.log('Sample businesses with unique_id:');
      businessesWithUniqueId.forEach(business => {
        console.log(`- ${business.unique_id} (${business.business_name || 'No name'})`);
      });
    }
    
    // Perform the search using the same method that works in other API endpoints
    const businessCollection = db.collection('businesses');
    console.log(`Searching for business with unique_id: "${normalizedUniqueId}"`);
    
    // Try direct match first
    const exactMatch = await businessCollection.findOne(
      { unique_id: normalizedUniqueId }, 
      { projection: { _id: 1, unique_id: 1, business_name: 1 } }
    );
    
    // If no exact match, try case-insensitive match
    let matchingBusiness = exactMatch;
    if (!exactMatch) {
      console.log('No exact match found, trying case-insensitive search...');
      const regexMatch = await businessCollection.findOne(
        { unique_id: { $regex: new RegExp(`^${normalizedUniqueId}$`, 'i') } },
        { projection: { _id: 1, unique_id: 1, business_name: 1 } }
      );
      matchingBusiness = regexMatch;
    }
    
    // Find similar usernames
    const similarUsernames = await businessCollection.find(
      { unique_id: { $regex: new RegExp(normalizedUniqueId, 'i') } },
      { projection: { _id: 1, unique_id: 1 } }
    ).limit(5).toArray();
    
    if (similarUsernames.length > 0) {
      console.log('Similar usernames found:');
      similarUsernames.forEach(business => {
        console.log(`- ${business.unique_id}`);
      });
    }
    
    const isAvailable = !matchingBusiness;
    
    if (matchingBusiness) {
      console.log(`Username "${normalizedUniqueId}" is already taken by business:`, {
        id: matchingBusiness._id,
        unique_id: matchingBusiness.unique_id,
        name: matchingBusiness.business_name || 'No name'
      });
    } else {
      console.log(`Username "${normalizedUniqueId}" is available`);
    }
    
    return NextResponse.json({
      available: isAvailable,
      uniqueId: normalizedUniqueId,
      similarUsernames: isAvailable ? similarUsernames.map(b => b.unique_id) : []
    });
    
  } catch (error: any) {
    console.error('Error checking unique ID availability:', error.message, error.stack);
    
    // Return a consistent response on errors
    return NextResponse.json(
      { 
        available: false,
        error: 'Username validation service temporarily unavailable',
        temporary: true
      },
      { status: 200 }
    );
  }
} 