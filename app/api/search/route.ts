import { NextResponse } from 'next/server';
import { searchBusinesses, createEmbedding } from '@/app/lib/embeddings';
import { getCachedSearchResults, cacheSearchResults, trackPopularSearch } from '@/app/lib/redis';
import { vectorStore } from '@/app/lib/vector-store';

interface SearchMatch {
  id: string;
  score: number;
  metadata: {
    exact_services: string[];
    [key: string]: any;
  };
  exact_service_match?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  requires_verification?: boolean;
}

// Simple implementation of service query analysis
async function analyzeServiceQuery(query: string) {
  // This is a simple implementation to replace the OpenAI-based one
  return {
    exact_service_required: query,
    requires_clarification: false,
    clarification_needed_for: [],
    semantic_topics: [query],
    potential_services: [query]
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cachedResults = await getCachedSearchResults(query);
    if (cachedResults) {
      console.log('Serving cached results for query:', query);
      return NextResponse.json({
        results: cachedResults,
        metadata: {
          total: cachedResults.length,
          query,
          cached: true
        }
      });
    }

    // Track this search query
    await trackPopularSearch(query);

    // Perform search
    const results = await searchBusinesses(query);

    // Cache results
    await cacheSearchResults(query, results);

    return NextResponse.json({
      results,
      metadata: {
        total: results.length,
        query,
        cached: false
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { query, filters } = await req.json();
    
    // Get query analysis first
    const queryAnalysis = await analyzeServiceQuery(query);
    
    // If clarification is needed, return early
    if (queryAnalysis.requires_clarification) {
      return NextResponse.json({
        businesses: [],
        clarification_needed: true,
        clarification_question: queryAnalysis.clarification_needed_for.join(', ')
      });
    }

    // Construct the search query for vector search
    const searchEmbedding = await createEmbedding(queryAnalysis.exact_service_required);
    
    // Use the searchBusinesses function which now uses the vector store adapter
    const results = await searchBusinesses(queryAnalysis.exact_service_required);
    
    // Apply any additional filters from the request
    const filteredResults = results.filter(business => {
      // Apply location filter if present
      if (filters?.location && business.city && business.state) {
        const location = `${business.city}, ${business.state}`.toLowerCase();
        if (!location.includes(filters.location.toLowerCase())) {
          return false;
        }
      }
      
      // Apply other filters as needed
      return true;
    });
    
    return NextResponse.json({
      businesses: filteredResults.map(business => ({
        id: business._id,
        name: business.business_name,
        description: business.description,
        category: business.Business_Category,
        location: business.address ? 
          `${business.address}, ${business.city}, ${business.state} ${business.zip_code}` : 
          `${business.city}, ${business.state}`,
        contact: business.phone || business.email || business.Website || '',
        score: business.relevance_score || 0,
        explanation: business.ai_explanation || '',
        confidence: business.relevance_score > 0.7 ? 'HIGH' : business.relevance_score > 0.4 ? 'MEDIUM' : 'LOW'
      })),
      total: filteredResults.length
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
} 