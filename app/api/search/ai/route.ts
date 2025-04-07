import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Business from '@/models/business.model';
import { generateSearchQuery, enhanceSearchResults } from '../../../lib/openai';
import { searchBusinesses, VectorSearchResult } from '../../../lib/embeddings';
import type { PipelineStage } from 'mongoose';
import { Types } from 'mongoose';

interface SearchLocation {
  lat: number;
  lng: number;
}

interface SearchRequest {
  query: string;
  location?: SearchLocation;
}

interface BusinessResult {
  business_name: string;
  description: string;
  Business_Category: string;
  Business_Subcategories?: string[];
  business_features?: string[];
  rating?: number;
  distance?: number;
  images?: string[];
  location?: {
    type: string;
    coordinates: [number, number];
  };
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  Website?: string;
  ai_explanation?: string;
  searchScore?: number;
  relevance_score?: number;
  final_score?: string;
  unique_id: string;
  [key: string]: any;
}

export async function POST(request: Request) {
  console.log('🔍 Starting search request...');
  
  // Declare variables that we'll use throughout the function
  let body: SearchRequest | undefined;
  let useAIEnhancement = true;  // Default to true
  let enhancedQuery = '';
  let vectorResults: VectorSearchResult[] = [];

  try {
    // Validate request body
    try {
      body = await request.json();
      console.log('📝 Request body:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('❌ Invalid request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!body || !body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      console.error('❌ Invalid query:', body?.query);
      return NextResponse.json(
        { error: 'Search query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const { query, location } = body;
    enhancedQuery = query;  // Initialize with original query

    // Connect to database
    try {
      console.log('🔌 Connecting to database...');
      await connectToDatabase();
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    try {
      console.log('🤖 Attempting AI query enhancement...');
      enhancedQuery = await generateSearchQuery(query);
      console.log('✨ Enhanced query:', enhancedQuery);
    } catch (aiError: any) {
      console.error('⚠️ AI query enhancement failed:', aiError);
      useAIEnhancement = false;
      enhancedQuery = query;  // Fallback to original query
    }

    // First, get semantically relevant businesses using vector search
    try {
      console.log('🔍 Performing vector search...');
      vectorResults = await searchBusinesses(enhancedQuery, 50);
      console.log(`✅ Found ${vectorResults.length} matches from vector search`);
    } catch (vectorError: any) {
      console.error('❌ Vector search failed:', vectorError);
      throw new Error(`Vector search failed: ${vectorError.message}`);
    }

    // Get the IDs of matched businesses
    const matchedIds = vectorResults.map((result: VectorSearchResult) => new Types.ObjectId(result.id));
    console.log(`🏷️ Matched business IDs:`, matchedIds);

    let businesses: BusinessResult[] = [];

    if (location?.lat && location?.lng) {
      console.log('📍 Applying geospatial filtering...');
      try {
        // First verify that we have valid coordinates
        if (isNaN(location.lat) || isNaN(location.lng) || 
            Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180) {
          throw new Error('Invalid coordinates provided');
        }

        console.log('Coordinates:', { lat: location.lat, lng: location.lng });
        
        // Apply geospatial filtering to vector search results
        const geoNearPipeline: PipelineStage[] = [
          {
            $match: {
              _id: { $in: matchedIds }
            }
          },
          {
            $match: {
              location: { 
                $exists: true,
                $ne: null
              }
            }
          },
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [location.lng, location.lat]
              },
              distanceField: "distance",
              maxDistance: 50000, // 50km
              spherical: true,
              distanceMultiplier: 0.000621371 // Convert meters to miles
            }
          },
          {
            $project: {
              business_name: 1,
              description: 1,
              Business_Category: 1,
              Business_Subcategories: 1,
              business_features: 1,
              rating: 1,
              distance: 1,
              images: 1,
              location: 1,
              address: 1,
              city: 1,
              state: 1,
              zip_code: 1,
              phone: 1,
              email: 1,
              Website: 1,
              unique_id: 1
            }
          }
        ];

        console.log('🔍 Executing geospatial pipeline...');
        businesses = await Business.aggregate<BusinessResult>(geoNearPipeline);
        console.log(`✅ Found ${businesses.length} businesses after geospatial filtering`);
        
        if (businesses.length === 0) {
          // If no results with geospatial filtering, fall back to regular search
          console.log('⚠️ No results with geospatial filtering, falling back to regular search');
          businesses = await Business.find({ _id: { $in: matchedIds } })
            .select('-__v')
            .limit(20)
            .lean();
        }
      } catch (geoError: any) {
        console.error('❌ Geospatial query failed:', geoError);
        // Fall back to regular search on error
        console.log('⚠️ Falling back to regular search due to geospatial error');
        businesses = await Business.find({ _id: { $in: matchedIds } })
          .select('-__v')
          .limit(20)
          .lean();
      }
    } else {
      console.log('🔍 Fetching businesses without geospatial filtering...');
      businesses = await Business.find({ _id: { $in: matchedIds } })
        .select('-__v')
        .limit(20)
        .lean();
      console.log(`✅ Found ${businesses.length} businesses`);
    }

    if (!businesses.length) {
      console.log('ℹ️ No businesses found');
      return NextResponse.json({
        query: enhancedQuery,
        results: []
      });
    }

    // Create a map of vector search scores
    const vectorScores = new Map(
      vectorResults.map((result: VectorSearchResult) => [result.id, result.score])
    );

    let finalResults = businesses;

    if (useAIEnhancement) {
      try {
        console.log('🤖 Attempting AI result enhancement...');
        const enhancedResults = await enhanceSearchResults(query, businesses, location);
        console.log('✨ Results enhanced with AI');
        
        finalResults = enhancedResults.map(business => ({
          ...business,
          distance: business.distance ? parseFloat(business.distance.toFixed(1)) : undefined,
          final_score: (
            ((business.relevance_score || 0) * 0.7) +
            ((vectorScores.get(business._id?.toString() || '') || 0) * 0.3)
          ).toFixed(4)
        })).sort((a, b) => parseFloat(b.final_score || '0') - parseFloat(a.final_score || '0'));
      } catch (aiError: any) {
        console.error('⚠️ AI result enhancement failed:', aiError);
        finalResults = businesses.map(business => ({
          ...business,
          distance: business.distance ? parseFloat(business.distance.toFixed(1)) : undefined,
          final_score: (vectorScores.get(business._id?.toString() || '') || 0).toFixed(4)
        })).sort((a, b) => parseFloat(b.final_score || '0') - parseFloat(a.final_score || '0'));
      }
    } else {
      console.log('ℹ️ Using vector search scores only');
      finalResults = businesses.map(business => ({
        ...business,
        distance: business.distance ? parseFloat(business.distance.toFixed(1)) : undefined,
        final_score: (vectorScores.get(business._id?.toString() || '') || 0).toFixed(4)
      })).sort((a, b) => parseFloat(b.final_score || '0') - parseFloat(a.final_score || '0'));
    }

    console.log(`✅ Search completed. Returning ${finalResults.length} results`);
    return NextResponse.json({
      query: enhancedQuery,
      results: finalResults,
      ai_enhanced: useAIEnhancement
    });

  } catch (error) {
    // Log the error and any available context
    const errorContext = {
      query: body && 'query' in body ? body.query : undefined,
      location: body && 'location' in body ? body.location : undefined,
      useAIEnhancement,
      enhancedQuery,
      vectorResultsCount: vectorResults.length
    };

    console.error('❌ Search error:', error);
    console.error('Search context:', errorContext);

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: error.cause
      });
    }

    return NextResponse.json(
      { 
        error: 'Search failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        context: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          searchContext: errorContext
        }
      },
      { status: 500 }
    );
  }
} 