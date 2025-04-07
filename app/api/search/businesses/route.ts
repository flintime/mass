import { NextResponse } from 'next/server';
import { Business } from '@/app/types/business';
import dbConnect from '@/lib/db';
import BusinessModel from '@/models/business.model';
import type { PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { searchBusinesses } from '../../../lib/embeddings';
import { generateSearchQuery, enhanceSearchResults } from '../../../lib/openai';

// Update the API key constant
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

// Function to geocode an address
async function geocodeAddress(address: string, city: string, state: string, zip_code: string | number) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is not set');
    throw new Error('Google Maps API key is not configured');
  }

  const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  console.log('Geocoding address:', fullAddress);
  console.log('Using API key:', GOOGLE_MAPS_API_KEY.substring(0, 8) + '...');
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Geocoding response:', {
      status: data.status,
      results: data.results ? data.results.length : 0,
      location: data.results?.[0]?.geometry?.location,
      error_message: data.error_message
    });
    
    if (data.status === 'OK' && data.results && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { latitude: lat, longitude: lng };
    }
    
    if (data.status !== 'OK') {
      console.error('Geocoding error status:', data.status);
      console.error('Error message:', data.error_message);
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
    
    throw new Error('Could not geocode address: No results found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

// Function to migrate business locations
async function migrateBusinessLocations() {
  try {
    // Find businesses that either have no location field or have missing coordinates
    const businesses = await BusinessModel.find({
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { latitude: null },
        { longitude: null }
      ]
    });
    console.log(`Found ${businesses.length} businesses to update with coordinates`);

    for (const business of businesses) {
      try {
        console.log(`Processing business: ${business.business_name}`);
        
        // Skip if missing required address fields
        if (!business.address || !business.city || !business.state || !business.zip_code) {
          console.log(`Skipping business due to missing address fields:`, {
            name: business.business_name,
            address: business.address,
            city: business.city,
            state: business.state,
            zip_code: business.zip_code
          });
          continue;
        }

        // Geocode the address
        const { latitude, longitude } = await geocodeAddress(
          business.address,
          business.city,
          business.state,
          business.zip_code
        );

        console.log(`Got coordinates for ${business.business_name}:`, { latitude, longitude });

        // Update the business with location data
        business.latitude = latitude;
        business.longitude = longitude;
        business.location = {
          type: 'Point',
          coordinates: [longitude, latitude] // GeoJSON uses [longitude, latitude] order
        };

        await business.save();
        console.log(`Updated business: ${business.business_name}`);
      } catch (error) {
        console.error(`Error updating business ${business.business_name}:`, error);
        // Continue with next business even if one fails
        continue;
      }
    }

    console.log('Location migration completed');
  } catch (error) {
    console.error('Error migrating locations:', error);
  }
}

// Add this function at the top of the file
async function fixBusinessData(business: any) {
  let needsUpdate = false;

  // Fix ZIP code format
  if (typeof business.zip_code === 'number') {
    business.zip_code = String(business.zip_code).padStart(5, '0');
    needsUpdate = true;
  }

  // Add location field if missing
  if (business.latitude && business.longitude && !business.location) {
    business.location = {
      type: 'Point',
      coordinates: [business.longitude, business.latitude] // GeoJSON uses [longitude, latitude] order
    };
    needsUpdate = true;
  }

  if (needsUpdate) {
    await business.save();
    console.log(`Updated business: ${business.business_name}`);
  }
}

// Add this function to ensure businesses have both latitude/longitude fields
function ensureBusinessCoordinates(business: any) {
  // If business already has valid latitude and longitude, return as is
  if (typeof business.latitude === 'number' && 
      typeof business.longitude === 'number' &&
      !isNaN(business.latitude) &&
      !isNaN(business.longitude)) {
    return business;
  }
  
  // If business has GeoJSON location but missing lat/lng fields, extract them
  if (business.location?.coordinates?.length === 2) {
    const [longitude, latitude] = business.location.coordinates;
    
    console.log(`Fixing coordinates for business ${business.business_name || 'unknown'} (${business._id}):`);
    console.log(`  - Extracted from GeoJSON: [${longitude}, ${latitude}]`);
    
    // Add the explicit fields
    business.latitude = latitude;
    business.longitude = longitude;
  }
  
  return business;
}

interface VectorSearchResult {
  id: string;
  score: number;
  metadata: {
    name: string;
    category: string;
    description: string;
    subcategories: string[];
    features: string[];
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface SearchResult {
  _id: Types.ObjectId;
  business_name: string;
  Business_Category: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  Website?: string;
  business_features: string[];
  images: { url: string }[];
  distance: number;
}

export async function POST(request: Request) {
  console.log('Business search API called');
  
  try {
    await dbConnect();
    
    const body = await request.json();
    console.log('Received request body:', body);
    
    const { latitude, longitude, query, radius = 50 } = body;
    console.log('Search params:', { latitude, longitude, query, radius });

    if (!latitude || !longitude) {
      console.log('Missing required coordinates');
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.log('Invalid coordinate types:', { latitude, longitude });
      return NextResponse.json(
        { error: 'Invalid coordinates format' },
        { status: 400 }
      );
    }

    let businesses = [];

    if (query && query.trim()) {
      try {
        // Step 1: Enhance the search query using GPT
        console.log('Enhancing search query with AI...');
        const enhancedQuery = await generateSearchQuery(query);
        console.log('Enhanced query:', enhancedQuery);

        // Step 2: Perform vector search using embeddings
        console.log('Performing vector search...');
        const vectorResults = await searchBusinesses(enhancedQuery);
        console.log(`Found ${vectorResults.length} results from vector search`);

        // Get business IDs from vector search
        const businessIds = vectorResults.map(result => new Types.ObjectId(result.id));

        // Step 3: Get full business details with geospatial data
        const pipeline: PipelineStage[] = [
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [longitude, latitude]
              },
              distanceField: "distance",
              maxDistance: radius * 1609.34, // Convert miles to meters
              spherical: true,
              distanceMultiplier: 0.000621371 // Convert meters to miles
            }
          },
          {
            $lookup: {
              from: 'reviews',
              localField: '_id',
              foreignField: 'businessId',
              as: 'reviews'
            }
          },
          {
            $addFields: {
              rating: {
                $cond: {
                  if: { $gt: [{ $size: '$reviews' }, 0] },
                  then: { $avg: '$reviews.rating' },
                  else: null
                }
              },
              reviews_count: { $size: '$reviews' }
            }
          },
          {
            $match: {
              _id: { $in: businessIds }
            }
          }
        ];

        const searchResults = await BusinessModel.aggregate(pipeline);
        console.log(`Found ${searchResults.length} businesses with location data`);

        // Format results
        businesses = searchResults.map(business => {
          // Ensure coordinates are properly set
          business = ensureBusinessCoordinates(business);
          
          return {
            id: business._id.toString(),
            business_name: business.business_name,
            name: business.business_name,
            category: business.Business_Category,
            Business_Category: business.Business_Category,
            Business_Subcategories: business.Business_Subcategories || [],
            features: business.business_features || [],
            description: business.description,
            address: business.address,
            city: business.city,
            state: business.state,
            zip_code: business.zip_code,
            latitude: business.latitude,
            longitude: business.longitude,
            phone: business.phone,
            email: business.email,
            Website: business.Website,
            unique_id: business.unique_id,
            business_features: business.business_features || [],
            images: business.images || [],
            distance: business.distance,
            rating: business.rating,
            reviews_count: business.reviews_count
          };
        });

        // Step 4: Enhance results with AI explanations and scoring
        console.log('Enhancing results with AI...');
        businesses = await enhanceSearchResults(query, businesses, { lat: latitude, lng: longitude });
        console.log('Results enhanced with AI explanations and scoring');

        // Sort by relevance score and distance
        businesses.sort((a, b) => {
          const scoreA = a.relevance_score || 0;
          const scoreB = b.relevance_score || 0;
          if (Math.abs(scoreA - scoreB) > 0.1) {
            return scoreB - scoreA; // First sort by relevance
          }
          return (a.distance || 0) - (b.distance || 0); // Then by distance
        });
      } catch (error) {
        console.error('Error in AI search:', error);
        // Fallback to traditional search if AI search fails
        console.log('Falling back to traditional search...');
        businesses = await performTraditionalSearch(latitude, longitude, query, radius);
      }
    } else {
      // If no query, just get nearby businesses
      businesses = await performTraditionalSearch(latitude, longitude, query, radius);
    }

    console.log(`Returning ${businesses.length} businesses`);
    console.log('Returning businesses with unique_ids:', businesses.map(b => ({
      id: b.id,
      business_name: b.business_name,
      unique_id: b.unique_id || 'missing'
    })));
    
    return NextResponse.json(businesses);
  } catch (error) {
    console.error('Error in search/businesses API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

async function performTraditionalSearch(latitude: number, longitude: number, query?: string, radius: number = 50) {
  const pipeline: PipelineStage[] = [
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        distanceField: "distance",
        maxDistance: radius * 1609.34,
        spherical: true,
        distanceMultiplier: 0.000621371
      }
    },
    {
      $match: {
        is_active: true
      }
    },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'businessId',
        as: 'reviews'
      }
    },
    {
      $addFields: {
        rating: {
          $cond: {
            if: { $gt: [{ $size: '$reviews' }, 0] },
            then: { $avg: '$reviews.rating' },
            else: null
          }
        },
        reviews_count: { $size: '$reviews' }
      }
    }
  ];

  if (query && query.trim()) {
    const searchQuery = query.trim();
    pipeline.push({
      $match: {
        $and: [
          { is_active: true },
          { 
            $or: [
              { business_name: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } },
              { Business_Category: { $regex: searchQuery, $options: 'i' } },
              { Business_Subcategories: { $regex: searchQuery, $options: 'i' } },
              { business_features: { $regex: searchQuery, $options: 'i' } }
            ]
          }
        ]
      }
    });
  } else {
    pipeline.push({
      $match: {
        is_active: true
      }
    });
  }

  const searchResults = await BusinessModel.aggregate(pipeline);
  return searchResults.map(business => {
    // Ensure coordinates are properly set
    business = ensureBusinessCoordinates(business);
    
    return {
      id: business._id.toString(),
      business_name: business.business_name,
      name: business.business_name,
      category: business.Business_Category,
      Business_Category: business.Business_Category,
      Business_Subcategories: business.Business_Subcategories || [],
      features: business.business_features || [],
      description: business.description,
      address: business.address,
      city: business.city,
      state: business.state,
      zip_code: business.zip_code,
      latitude: business.latitude,
      longitude: business.longitude,
      phone: business.phone,
      email: business.email,
      Website: business.Website,
      unique_id: business.unique_id,
      business_features: business.business_features || [],
      images: business.images || [],
      distance: business.distance,
      rating: business.rating,
      reviews_count: business.reviews_count
    };
  });
} 