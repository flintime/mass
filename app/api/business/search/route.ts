import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/db';
import mongoose from 'mongoose';

/**
 * API endpoint to search for businesses by name or other criteria
 * GET /api/business/search?q=SkillPro+Billerica
 */
export async function GET(request: Request) {
  try {
    // Get the search query from the URL params
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('q');
    
    if (!searchQuery) {
      console.warn('Missing search query parameter in request');
      return NextResponse.json(
        { error: 'Missing search query parameter' },
        { status: 400 }
      );
    }
    
    console.log('Searching for businesses with query:', searchQuery);
    
    // Connect to database
    await dbConnect();
    console.log('Connected to database for business search');
    
    // Use the mongoose connection directly
    const db = mongoose.connection.db;
    
    // Check database connection
    if (!db) {
      console.error('Database connection failed for business search');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    // Create search terms from the query
    const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0);
    
    // Special case for "SkillPro Billerica"
    const isSkillProBillericaSearch = 
      searchQuery.toLowerCase().includes('skillpro') && 
      searchQuery.toLowerCase().includes('billerica');
    
    let searchResults;
    
    if (isSkillProBillericaSearch) {
      console.log('Detected SkillPro Billerica special case search');
      
      // Try multiple search patterns for this specific case
      searchResults = await db.collection('businesses').find({
        $or: [
          { business_name: { $regex: 'SkillPro.*Billerica', $options: 'i' } },
          { business_name: { $regex: 'Skill.*Pro.*Billerica', $options: 'i' } },
          { business_name: { $regex: 'Billerica.*SkillPro', $options: 'i' } },
          { business_name: { $regex: 'Billerica.*Skill.*Pro', $options: 'i' } },
          { unique_id: 'skillprobillerica' },
          { unique_id: { $regex: 'skillpro.*billerica', $options: 'i' } }
        ]
      }).limit(10).toArray();
    } else {
      // Regular search using the search terms
      const searchConditions = searchTerms.map(term => ({
        $or: [
          { business_name: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
          { unique_id: { $regex: term, $options: 'i' } }
        ]
      }));
      
      searchResults = await db.collection('businesses').find({
        $and: searchConditions
      }).limit(20).toArray();
    }
    
    console.log(`Found ${searchResults.length} businesses matching query: ${searchQuery}`);
    
    // Map the results to a simpler format
    const businesses = searchResults.map(business => ({
      _id: business._id.toString(),
      business_name: business.business_name || 'Unnamed Business',
      unique_id: business.unique_id || null,
      description: business.description || null,
      address: business.address || null,
      phone: business.phone || null,
      email: business.email || null,
      website: business.website || null,
      logo: business.logo || null
    }));
    
    return NextResponse.json({
      businesses,
      query: searchQuery,
      count: businesses.length
    });
    
  } catch (error: any) {
    console.error('Error searching for businesses:', error.message, error.stack);
    
    return NextResponse.json(
      { error: 'Failed to search for businesses', details: error.message },
      { status: 500 }
    );
  }
} 