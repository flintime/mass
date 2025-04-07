import { NextResponse } from 'next/server';
import { Business } from '@/app/types/business';
import dbConnect from '@/lib/db';
import BusinessModel from '@/models/business.model';
import OpenAI from 'openai';
import { createEmbedding } from '../../../lib/embeddings';
import { getCachedVectorEmbedding, cacheVectorEmbedding } from '../../../lib/redis';
import { findClosestOfflinePattern, trackSearchPattern } from '../../../lib/offline-embeddings';
import { vectorStore } from '../../../lib/vector-store';

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not configured in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface StrictSearchResponse {
  businesses: {
    name: string;
    description: string;
    category: string;
    location: string;
    contact: string;
  }[];
}

interface ServiceValidation {
  isValid: boolean;
  confidence: number;
  matchedServices: string[];
}

async function validateBusinessServices(
  business: any, 
  requiredServices: string[]
): Promise<ServiceValidation> {
  // Use GPT-3.5 to analyze if the business actually offers the required services
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `Analyze if a business offers specific services based on its description and features.
Return a JSON object with format:
{
  "isValid": boolean,
  "confidence": number (0-1),
  "matchedServices": string[]
}`
      },
      {
        role: "user",
        content: `Business Information:
Name: ${business.business_name}
Category: ${business.Business_Category}
Description: ${business.description || 'N/A'}
Features: ${business.business_features?.join(', ') || 'N/A'}

Required Services: ${requiredServices.join(', ')}

Analyze if this business actually provides these services. Be strict in your validation.`
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { isValid: false, confidence: 0, matchedServices: [] };
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('Error parsing service validation:', error);
    return { isValid: false, confidence: 0, matchedServices: [] };
  }
}

async function extractSearchIntent(query: string) {
  // Use GPT-3.5 for initial query understanding (faster & cheaper)
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "Extract the core business search intent and required services. Return a JSON object with format: {\"intent\":\"core search intent\",\"services\":[\"required service 1\",\"required service 2\"],\"requirements\":[\"other requirement 1\",\"other requirement 2\"]}"
      },
      {
        role: "user",
        content: query
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { intent: query, services: [], requirements: [] };
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('Error parsing search intent:', error);
    return { intent: query, services: [], requirements: [] };
  }
}

async function getQueryEmbedding(query: string): Promise<number[]> {
  // First, try to find a matching offline pattern
  const matchingPattern = await findClosestOfflinePattern(query);
  if (matchingPattern) {
    console.log('Using offline embedding for similar pattern:', matchingPattern);
    // Track the actual query for future pattern generation
    await trackSearchPattern(query);
    return await getCachedVectorEmbedding(matchingPattern) as number[];
  }

  // If no offline match, try the regular cache
  const cachedEmbedding = await getCachedVectorEmbedding(query);
  if (cachedEmbedding) {
    console.log('Using cached embedding for query');
    return cachedEmbedding;
  }

  // Generate new embedding if not found in offline or cache
  console.log('Generating new embedding for query');
  const embedding = await createEmbedding(query);
  
  // Cache the embedding and track the pattern
  await Promise.all([
    cacheVectorEmbedding(query, embedding),
    trackSearchPattern(query)
  ]);
  
  return embedding;
}

async function performHybridSearch(query: string) {
  console.log('Starting hybrid search for query:', query);
  
  // Step 1: Extract search intent and required services using GPT-3.5 (fast & cheap)
  const { intent, services, requirements } = await extractSearchIntent(query);
  console.log('Extracted intent:', intent);
  console.log('Required services:', services);
  console.log('Other requirements:', requirements);
  
  // Step 2: Get query embedding using offline/cached embeddings
  const [intentEmbedding, queryEmbedding] = await Promise.all([
    getQueryEmbedding(intent),
    getQueryEmbedding(query)
  ]);
  
  // Step 3: Use vector search to find semantically similar businesses
  const allBusinessIds = new Set<string>();
  const intentResults = await vectorStore.retrieveRelevant('all', intent, 30);
  const queryResults = await vectorStore.retrieveRelevant('all', query, 20);
  
  // Combine results
  [...intentResults, ...queryResults].forEach(result => {
    if (result.businessId) {
      allBusinessIds.add(result.businessId);
    }
  });
  
  if (allBusinessIds.size === 0) {
    return [];
  }

  // Extract business IDs from vector search results
  const businessIds = Array.from(allBusinessIds);

  // Step 4: Fetch full business details and perform text search refinement
  const businesses = await BusinessModel.find({
    _id: { $in: businessIds },
    $text: { 
      $search: `${intent} ${requirements.join(' ')}`,
      $caseSensitive: false,
      $diacriticSensitive: false
    }
  })
  .select('_id business_name description Business_Category address city state zip_code phone email Website business_features')
  .limit(50);

  console.log(`Found ${businesses.length} results after text refinement`);

  // Step 5: Validate services for each business (in parallel)
  const validations = await Promise.all(
    businesses.map(business => validateBusinessServices(business, services))
  );

  // Filter out businesses that don't offer required services
  const validBusinesses = businesses.filter((_, index) => 
    validations[index].isValid && validations[index].confidence > 0.7
  );

  if (validBusinesses.length === 0) {
    return [];
  }

  // Step 6: Use GPT-3.5 for relevance scoring of valid businesses
  const initialScoring = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "Score each business's relevance to the search intent from 0-100. Return a JSON array of scores only."
      },
      {
        role: "user",
        content: `Search Intent: ${intent}
Required Services: ${services.join(', ')}
Other Requirements: ${requirements.join(', ')}

Businesses to Score:
${validBusinesses.map(b => `
Name: ${b.business_name}
Category: ${b.Business_Category}
Description: ${b.description || 'N/A'}
Features: ${b.business_features?.join(', ') || 'N/A'}
`).join('\n---\n')}`
      }
    ],
    response_format: { type: "json_object" }
  });

  const scores = JSON.parse(initialScoring.choices[0]?.message?.content || '{"scores":[]}').scores;

  // Combine vector similarity, service validation, and GPT-3.5 scores
  const combinedResults = validBusinesses.map((business, index) => {
    const businessId = business._id.toString();
    // Find result in vector search results
    const intentResult = intentResults.find(r => r.businessId === businessId);
    const queryResult = queryResults.find(r => r.businessId === businessId);
    
    // Calculate vector similarity score (average if found in both results)
    let vectorScore = 0;
    if (intentResult?.score !== undefined && queryResult?.score !== undefined) {
      vectorScore = (intentResult.score + queryResult.score) / 2;
    } else if (intentResult?.score !== undefined) {
      vectorScore = intentResult.score;
    } else if (queryResult?.score !== undefined) {
      vectorScore = queryResult.score;
    }
    
    const validation = validations[businesses.indexOf(business)];
    return {
      business,
      score: (
        vectorScore * 0.3 + // Vector similarity: 30%
        (scores[index] || 0) * 0.4 + // GPT relevance: 40%
        (validation.confidence * 0.3) // Service validation: 30%
      ),
      matchedServices: validation.matchedServices,
      matchesRequirements: requirements
    };
  });

  // Sort by combined score
  combinedResults.sort((a, b) => b.score - a.score);

  // Return top results
  return combinedResults.map(r => r.business);
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Perform hybrid search with precomputed embeddings
    const businesses = await performHybridSearch(query);

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ businesses: [] });
    }

    // Final relevance check with GPT-4 (most accurate but expensive)
    // Only use it for the final ranking of pre-filtered results
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are an AI-powered business search assistant for Flintime. Your task is to return only businesses that are DIRECTLY relevant to the user's query.

Rules:
1. Analyze the user's query and determine the exact service or solution they are looking for
2. Return ONLY businesses that explicitly match the request
3. DO NOT include businesses that are loosely related or offer tangentially connected services
4. If no business is truly relevant, return an empty array
5. Ensure results align exactly with the user's intent, avoiding generic or broad matches

Return response in this exact format:
{
  "businesses": [
    {
      "name": "Business Name",
      "description": "Short, relevant description of the service",
      "category": "Business Category",
      "location": "Business Location",
      "contact": "Business Contact Info"
    }
  ]
}`
        },
        {
          role: "user",
          content: `User Query: "${query}"

Available Businesses:
${businesses.map(b => `
Name: ${b.business_name}
Category: ${b.Business_Category}
Description: ${b.description || 'N/A'}
Address: ${b.address}, ${b.city}, ${b.state} ${b.zip_code}
Contact: Phone: ${b.phone || 'N/A'}, Email: ${b.email || 'N/A'}, Website: ${b.Website || 'N/A'}
`).join('\n---\n')}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const results = JSON.parse(content) as StrictSearchResponse;

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Strict AI search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform search' },
      { status: 500 }
    );
  }
} 